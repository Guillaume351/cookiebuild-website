import { sql } from "drizzle-orm";
import db from "../../db/client";

const RETENTION_LOCK_KEY = 2026071403;

/** Applies the published deletion schedule under a cross-replica advisory lock. */
export async function pruneExpiredMobileData() {
  return db.transaction(async (tx) => {
    const lock = await tx.execute<{ acquired: boolean }>(sql`
      SELECT pg_try_advisory_xact_lock(${RETENTION_LOCK_KEY}) AS acquired
    `);
    if (!lock[0]?.acquired) return false;

    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'expired', responded_at = now()
       WHERE status = 'pending' AND expires_at < now()
    `);
    await tx.execute(sql`
      DELETE FROM player_link_challenges
       WHERE created_at < now() - interval '7 days'
    `);
    await tx.execute(sql`
      DELETE FROM mobile_devices
       WHERE revoked_at < now() - interval '30 days'
    `);
    await tx.execute(sql`
      DELETE FROM mobile_player_links
       WHERE revoked_at < now() - interval '12 months'
    `);
    await tx.execute(sql`
      DELETE FROM player_friendships
       WHERE status = 'pending' AND created_at < now() - interval '30 days'
    `);
    await tx.execute(sql`
      DELETE FROM mobile_friend_online_alerts alert
       WHERE NOT EXISTS (
         SELECT 1 FROM player_friendships friendship
          WHERE friendship.status = 'accepted'
            AND friendship.player_low_id = least(alert.owner_player_id, alert.target_player_id)
            AND friendship.player_high_id = greatest(alert.owner_player_id, alert.target_player_id)
       )
    `);
    await tx.execute(sql`
      DELETE FROM player_party_invites
       WHERE status <> 'pending'
         AND coalesce(responded_at, expires_at) < now() - interval '90 days'
    `);
    await tx.execute(sql`
      DELETE FROM player_party_members
       WHERE left_at < now() - interval '90 days'
    `);
    await tx.execute(sql`
      DELETE FROM player_parties
       WHERE state = 'disbanded'
         AND disbanded_at < now() - interval '90 days'
    `);
    await tx.execute(sql`
      DELETE FROM player_reports
       WHERE created_at < now() - interval '24 months'
    `);
    await tx.execute(sql`
      DELETE FROM mobile_notification_outbox
       WHERE (
           status = 'delivered'
           OR (status = 'dead' AND kind <> 'firebase_auth_delete')
         )
         AND created_at < now() - interval '90 days'
    `);
    await tx.execute(sql`
      DELETE FROM mobile_users mobile_user
       WHERE mobile_user.deleted_at < now() - interval '30 days'
         AND NOT EXISTS (
           SELECT 1
             FROM mobile_notification_outbox deletion
            WHERE deletion.kind = 'firebase_auth_delete'
              AND deletion.status <> 'delivered'
              AND deletion.audience ->> 'firebaseUid' = mobile_user.firebase_uid
         )
    `);
    return true;
  });
}
