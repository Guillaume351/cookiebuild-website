import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import db from "../../db/client";
import {
  mobileDevices,
  mobileNotificationOutbox,
  mobileNotificationPreferences,
  mobileUsers,
} from "../../db/schema";
import { firebaseApp, firebaseAuth } from "../utils/mobile-auth";
import {
  classifyFcmError,
  isInQuietHours,
  parseNotificationAudience,
  parseNotificationPayload,
  PermanentOutboxError,
  preferenceKind,
  retryDelayMs,
  safeError,
  shouldDeadLetterOutbox,
  type NotificationAudience,
  type NotificationPreferenceKind,
} from "../utils/mobile-notification";
import { completeFirebaseIdentityDeletion } from "./mobile-account";

const FCM_BATCH_SIZE = 500;
const MAX_RECIPIENTS_PER_OUTBOX = 5_000;

export interface MobileNotificationWorkerConfig {
  batchSize: number;
  concurrency: number;
  maxAttempts: number;
  staleLockSeconds: number;
  sendTimeoutMs: number;
}

export interface ClaimedOutboxRow extends Record<string, unknown> {
  id: string;
  kind: string;
  audience: unknown;
  payload: unknown;
  attempts: number;
  lockToken: string;
  availableAt: Date;
  createdAt: Date;
}

interface Recipient {
  deviceId: string;
  fcmToken: string;
  timezone: string | null;
  timezoneOffsetMinutes: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  linkedPlayerOnline: boolean;
}

interface DeliveryResult {
  selected: number;
  eligible: number;
  sent: number;
  disabled: string[];
  retry: string[];
  suppressed: number;
  excludedOnline: number;
}

function log(level: "info" | "warn" | "error", event: string, details: Record<string, unknown> = {}) {
  console[level]("[mobile-outbox]", JSON.stringify({ event, ...details }));
}

function integerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function mobileNotificationWorkerConfig(): MobileNotificationWorkerConfig {
  const batchSize = integerEnv("MOBILE_NOTIFICATION_WORKER_BATCH_SIZE", 10, 1, 20);
  const concurrency = integerEnv("MOBILE_NOTIFICATION_WORKER_CONCURRENCY", 2, 1, 5);
  const sendTimeoutMs = integerEnv("MOBILE_NOTIFICATION_SEND_TIMEOUT_MS", 30_000, 5_000, 120_000);
  const minimumSafeStaleSeconds = Math.ceil(
    ((sendTimeoutMs * Math.ceil(batchSize / concurrency)) + 30_000) / 1_000,
  );
  return {
    batchSize,
    concurrency,
    maxAttempts: integerEnv("MOBILE_NOTIFICATION_MAX_ATTEMPTS", 6, 1, 12),
    staleLockSeconds: Math.max(
      minimumSafeStaleSeconds,
      integerEnv("MOBILE_NOTIFICATION_STALE_LOCK_SECONDS", 300, 60, 3_600),
    ),
    sendTimeoutMs,
  };
}

async function markExhausted(config: MobileNotificationWorkerConfig) {
  await db.execute(sql`
    UPDATE mobile_notification_outbox
       SET status = 'pending',
           available_at = now(),
           lock_token = NULL,
           locked_at = NULL
     WHERE kind = 'firebase_auth_delete'
       AND status = 'dead'
  `);
  await db.execute(sql`
    UPDATE mobile_notification_outbox
       SET status = 'dead',
           lock_token = NULL,
           locked_at = NULL,
           last_error = COALESCE(last_error, 'Maximum delivery attempts exhausted')
     WHERE attempts >= ${config.maxAttempts}
       AND kind <> 'firebase_auth_delete'
       AND (
         (status = 'pending' AND available_at <= now())
         OR
         (status = 'processing' AND locked_at < now() - make_interval(secs => ${config.staleLockSeconds}))
       )
  `);
}

export async function claimMobileNotificationOutboxRows(config: MobileNotificationWorkerConfig) {
  await markExhausted(config);
  const rows = await db.execute<ClaimedOutboxRow>(sql`
    WITH candidates AS (
      SELECT id
        FROM mobile_notification_outbox
       WHERE (kind = 'firebase_auth_delete' OR attempts < ${config.maxAttempts})
         AND (
           (status = 'pending' AND available_at <= now())
           OR
           (status = 'processing' AND locked_at < now() - make_interval(secs => ${config.staleLockSeconds}))
         )
       ORDER BY available_at ASC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT ${config.batchSize}
    )
    UPDATE mobile_notification_outbox AS outbox
       SET status = 'processing',
           attempts = outbox.attempts + 1,
           locked_at = now(),
           lock_token = gen_random_uuid()
      FROM candidates
     WHERE outbox.id = candidates.id
    RETURNING outbox.id,
              outbox.kind,
              outbox.audience,
              outbox.payload,
              outbox.attempts,
              outbox.lock_token AS "lockToken",
              outbox.available_at AS "availableAt",
              outbox.created_at AS "createdAt"
  `);
  return [...rows];
}

async function heartbeatRows(rows: ClaimedOutboxRow[]) {
  await Promise.all(rows.map((row) => db
    .update(mobileNotificationOutbox)
    .set({ lockedAt: new Date() })
    .where(and(
      eq(mobileNotificationOutbox.id, row.id),
      eq(mobileNotificationOutbox.status, "processing"),
      eq(mobileNotificationOutbox.lockToken, row.lockToken),
    ))));
}

function preferenceCondition(kind: NotificationPreferenceKind) {
  switch (kind) {
    case "announcement": return sql`coalesce(${mobileNotificationPreferences.announcementsEnabled}, true)`;
    case "event": return sql`coalesce(${mobileNotificationPreferences.eventsEnabled}, true)`;
    case "server_status": return sql`coalesce(${mobileNotificationPreferences.serverStatusEnabled}, true)`;
    case "social": return sql`coalesce(${mobileNotificationPreferences.socialEnabled}, true)`;
    case "rally": return sql`coalesce(${mobileNotificationPreferences.rallyEnabled}, false)`;
    case "weekly_digest": return sql`coalesce(${mobileNotificationPreferences.weeklyDigestEnabled}, true)`;
    case "daily_reminder": return sql`coalesce(${mobileNotificationPreferences.dailyReminderEnabled}, false)`;
    case "weekly_reminder": return sql`coalesce(${mobileNotificationPreferences.weeklyReminderEnabled}, false)`;
    case "friend_online": return sql`coalesce(${mobileNotificationPreferences.friendOnlineEnabled}, false)`;
  }
}

async function recipientsFor(audience: NotificationAudience, preference: NotificationPreferenceKind) {
  const conditions = [
    eq(mobileDevices.notificationsAuthorized, true),
    isNull(mobileDevices.revokedAt),
    isNull(mobileUsers.deletedAt),
    preferenceCondition(preference),
  ];
  if (audience.firebaseUid) conditions.push(eq(mobileUsers.firebaseUid, audience.firebaseUid));
  if (audience.mobileUserIds) conditions.push(inArray(mobileUsers.id, audience.mobileUserIds));
  if (audience.deviceIds) conditions.push(inArray(mobileDevices.id, audience.deviceIds));

  const rows = await db
    .select({
      deviceId: mobileDevices.id,
      fcmToken: mobileDevices.fcmToken,
      timezone: sql<string | null>`coalesce(${mobileDevices.timezone}, ${mobileUsers.timezone})`,
      timezoneOffsetMinutes: mobileNotificationPreferences.timezoneOffsetMinutes,
      quietHoursStart: sql<string | null>`CASE WHEN ${mobileNotificationPreferences.quietHoursEnabled}
        THEN ${mobileNotificationPreferences.quietHoursStart} ELSE NULL END`,
      quietHoursEnd: sql<string | null>`CASE WHEN ${mobileNotificationPreferences.quietHoursEnabled}
        THEN ${mobileNotificationPreferences.quietHoursEnd} ELSE NULL END`,
      linkedPlayerOnline: sql<boolean>`EXISTS (
        SELECT 1
          FROM mobile_player_links linked_player
          JOIN player_sessions active_session
            ON active_session.player_id = linked_player.player_id
           AND active_session.end_time IS NULL
         WHERE linked_player.firebase_uid = ${mobileUsers.firebaseUid}
           AND linked_player.revoked_at IS NULL
      )`,
    })
    .from(mobileDevices)
    .innerJoin(mobileUsers, eq(mobileUsers.id, mobileDevices.mobileUserId))
    .leftJoin(
      mobileNotificationPreferences,
      eq(mobileNotificationPreferences.mobileUserId, mobileUsers.id),
    )
    .where(and(...conditions))
    .orderBy(asc(mobileDevices.id))
    .limit(MAX_RECIPIENTS_PER_OUTBOX + 1);

  if (rows.length > MAX_RECIPIENTS_PER_OUTBOX) {
    throw new PermanentOutboxError(
      `Audience exceeds ${MAX_RECIPIENTS_PER_OUTBOX} devices; enqueue segmented audiences`,
    );
  }
  return rows;
}

function timeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiration = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Firebase send timed out after ${timeoutMs}ms`);
      error.name = "FirebaseSendTimeout";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, expiration]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function multicastMessage(
  row: ClaimedOutboxRow,
  tokens: string[],
  payload: ReturnType<typeof parseNotificationPayload>,
): MulticastMessage {
  const urgent = payload.urgent && preferenceKind(row.kind) === "server_status";
  const rally = preferenceKind(row.kind) === "rally";
  const collapseId = rally && payload.data.gamemode
    ? `player-rally-${payload.data.gamemode}`
    : row.id;
  const data = {
    ...payload.data,
    outboxId: row.id,
    notificationKind: row.kind,
    ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
  };
  return {
    tokens,
    notification: {
      title: payload.title,
      ...(payload.body ? { body: payload.body } : {}),
      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    },
    data,
    android: {
      collapseKey: collapseId,
      priority: urgent || rally ? "high" : "normal",
      ...(rally ? { ttl: 5 * 60_000 } : {}),
      notification: {
        channelId: urgent
          ? "cookiebuild_status"
          : rally ? "cookiebuild_rallies" : "cookiebuild_updates",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
    },
    apns: {
      headers: {
        "apns-collapse-id": collapseId,
        "apns-priority": "10",
        ...(rally ? {
          "apns-expiration": String(Math.floor(Date.now() / 1_000) + (5 * 60)),
        } : {}),
      },
      payload: { aps: { sound: "default", ...(payload.imageUrl ? { mutableContent: true } : {}) } },
      ...(payload.imageUrl ? { fcmOptions: { imageUrl: payload.imageUrl } } : {}),
    },
  };
}

async function deliverNotification(
  row: ClaimedOutboxRow,
  config: MobileNotificationWorkerConfig,
): Promise<DeliveryResult> {
  const preference = preferenceKind(row.kind);
  if (!preference) throw new PermanentOutboxError(`Unsupported notification kind: ${row.kind}`);
  const audience = parseNotificationAudience(row.audience, row.kind, row.attempts > 1);
  const payload = parseNotificationPayload(row.payload, row.kind);
  const now = new Date();
  const selected = await recipientsFor(audience, preference);
  // A rally is intended to bring absent players back. Do not interrupt users
  // whose linked Minecraft account is already online, and never expose queue
  // activity through a notification they do not need.
  let excludedOnline = 0;
  const privacyEligible = selected.filter((recipient) => {
    const allowed = preference !== "rally" || !recipient.linkedPlayerOnline;
    if (!allowed) excludedOnline += 1;
    return allowed;
  });
  let suppressed = 0;
  const recipients = privacyEligible.filter((recipient) => {
    const allowed = !isInQuietHours(
      now,
      recipient.timezone,
      recipient.quietHoursStart,
      recipient.quietHoursEnd,
      recipient.timezoneOffsetMinutes,
    );
    if (!allowed) suppressed += 1;
    return allowed;
  });
  const disabled: string[] = [];
  const retry: string[] = [];
  let sent = 0;

  for (let offset = 0; offset < recipients.length; offset += FCM_BATCH_SIZE) {
    const batch = recipients.slice(offset, offset + FCM_BATCH_SIZE);
    try {
      const response = await timeout(
        getMessaging(firebaseApp()).sendEachForMulticast(
          multicastMessage(row, batch.map((recipient) => recipient.fcmToken), payload),
        ),
        config.sendTimeoutMs,
      );
      response.responses.forEach((item, index) => {
        const recipient = batch[index];
        if (!recipient) return;
        if (item.success) {
          sent += 1;
        } else if (classifyFcmError(item.error?.code) === "disable") {
          disabled.push(recipient.deviceId);
        } else {
          retry.push(recipient.deviceId);
        }
      });
    } catch (error) {
      retry.push(...batch.map((recipient) => recipient.deviceId));
      retry.push(...recipients.slice(offset + batch.length).map((recipient) => recipient.deviceId));
      const safe = safeError(error);
      log("warn", "firebase_send_failed", { outboxId: row.id, code: safe.code, message: safe.message });
      break;
    }
  }
  return {
    selected: selected.length,
    eligible: recipients.length,
    sent,
    disabled,
    retry: [...new Set(retry)],
    suppressed,
    excludedOnline,
  };
}

async function disableDevices(deviceIds: string[]) {
  if (deviceIds.length === 0) return;
  await db
    .update(mobileDevices)
    .set({ notificationsAuthorized: false, revokedAt: new Date() })
    .where(inArray(mobileDevices.id, deviceIds));
}

async function markDelivered(row: ClaimedOutboxRow, clearAudience = false) {
  const updated = await db
    .update(mobileNotificationOutbox)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      lockedAt: null,
      lockToken: null,
      lastError: null,
      ...(clearAudience ? { audience: {} } : {}),
    })
    .where(and(
      eq(mobileNotificationOutbox.id, row.id),
      eq(mobileNotificationOutbox.status, "processing"),
      eq(mobileNotificationOutbox.lockToken, row.lockToken),
    ))
    .returning({ id: mobileNotificationOutbox.id });
  return updated.length === 1;
}

async function markDead(row: ClaimedOutboxRow, reason: string) {
  await db
    .update(mobileNotificationOutbox)
    .set({ status: "dead", lockedAt: null, lockToken: null, lastError: reason.slice(0, 1_000) })
    .where(and(
      eq(mobileNotificationOutbox.id, row.id),
      eq(mobileNotificationOutbox.status, "processing"),
      eq(mobileNotificationOutbox.lockToken, row.lockToken),
    ));
  log("error", "dead", { outboxId: row.id, kind: row.kind, attempts: row.attempts, reason });
}

async function markForRetry(row: ClaimedOutboxRow, reason: string, deviceIds?: string[]) {
  const availableAt = new Date(Date.now() + retryDelayMs(row.attempts));
  await db
    .update(mobileNotificationOutbox)
    .set({
      status: "pending",
      availableAt,
      lockedAt: null,
      lockToken: null,
      lastError: reason.slice(0, 1_000),
      ...(deviceIds?.length ? { audience: { deviceIds } } : {}),
    })
    .where(and(
      eq(mobileNotificationOutbox.id, row.id),
      eq(mobileNotificationOutbox.status, "processing"),
      eq(mobileNotificationOutbox.lockToken, row.lockToken),
    ));
  log("warn", "retry_scheduled", {
    outboxId: row.id,
    kind: row.kind,
    attempts: row.attempts,
    retryDevices: deviceIds?.length,
    availableAt: availableAt.toISOString(),
    reason,
  });
}

export async function deliverFirebaseAuthDeletion(
  row: ClaimedOutboxRow,
  deleteUser: (firebaseUid: string) => Promise<void> = (firebaseUid) => (
    firebaseAuth().deleteUser(firebaseUid)
  ),
) {
  const audience = typeof row.audience === "object" && row.audience !== null
    ? row.audience as Record<string, unknown>
    : {};
  const uid = audience.firebaseUid;
  if (typeof uid !== "string" || !uid || uid.length > 128) {
    throw new PermanentOutboxError("firebase_auth_delete audience.firebaseUid is invalid");
  }
  try {
    await deleteUser(uid);
  } catch (error) {
    const code = safeError(error).code;
    if (code !== "auth/user-not-found") throw error;
  }

  await completeFirebaseIdentityDeletion(row.id, uid);
}

async function processRow(row: ClaimedOutboxRow, config: MobileNotificationWorkerConfig) {
  try {
    if (row.kind === "firebase_auth_delete") {
      await deliverFirebaseAuthDeletion(row);
      log("info", "delivered", { outboxId: row.id, kind: row.kind, attempts: row.attempts });
      return;
    }
    const result = await deliverNotification(row, config);
    await disableDevices(result.disabled);
    if (result.retry.length > 0) {
      if (shouldDeadLetterOutbox(row.kind, row.attempts, config.maxAttempts, false)) {
        await markDead(row, `Firebase delivery failed for ${result.retry.length} device(s)`);
      } else {
        await markForRetry(
          row,
          `Firebase delivery failed for ${result.retry.length} device(s)`,
          result.retry,
        );
      }
      return;
    }
    const owned = await markDelivered(row);
    if (owned) {
      log("info", "delivered", {
        outboxId: row.id,
        kind: row.kind,
        attempts: row.attempts,
        selected: result.selected,
        eligible: result.eligible,
        sent: result.sent,
        disabled: result.disabled.length,
        suppressed: result.suppressed,
        excludedOnline: result.excludedOnline,
        queueLatencyMs: Math.max(0, Date.now() - new Date(row.createdAt).getTime()),
        readyLatencyMs: Math.max(0, Date.now() - new Date(row.availableAt).getTime()),
      });
    }
  } catch (error) {
    const safe = safeError(error);
    const reason = safe.code ? `${safe.code}: ${safe.message}` : safe.message;
    const permanent = error instanceof PermanentOutboxError;
    if (shouldDeadLetterOutbox(row.kind, row.attempts, config.maxAttempts, permanent)) {
      await markDead(row, reason);
    } else {
      await markForRetry(row, reason);
      if (row.kind === "firebase_auth_delete") {
        log("error", "firebase_auth_delete_retry", {
          outboxId: row.id,
          attempts: row.attempts,
          reason,
        });
      }
    }
  }
}

async function parallelLimit<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      if (item) await task(item);
    }
  }));
}

export async function processMobileNotificationOutbox(
  config = mobileNotificationWorkerConfig(),
) {
  const rows = await claimMobileNotificationOutboxRows(config);
  if (rows.length === 0) return 0;
  log("info", "claimed", { count: rows.length });
  const heartbeat = setInterval(() => {
    void heartbeatRows(rows).catch((error) => {
      const safe = safeError(error);
      log("warn", "heartbeat_failed", { code: safe.code, message: safe.message });
    });
  }, Math.max(5_000, Math.floor((config.staleLockSeconds * 1_000) / 3)));
  heartbeat.unref();
  try {
    await parallelLimit(rows, config.concurrency, (row) => processRow(row, config));
  } finally {
    clearInterval(heartbeat);
  }
  return rows.length;
}
