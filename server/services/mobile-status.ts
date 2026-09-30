import { sql } from "drizzle-orm";

interface McStatusResponse {
  online?: boolean;
  host?: string;
  port?: number;
  players?: { online?: number; max?: number };
  version?: { name_clean?: string; name?: string };
  motd?: { clean?: string };
}

export interface EditionServerStatus {
  online: boolean;
  reachable: boolean;
  players: number;
  maximumPlayers: number;
  version: string | null;
  motd: string | null;
}

async function statusFor(
  edition: "java" | "bedrock",
  address: string,
): Promise<EditionServerStatus> {
  try {
    const status = await $fetch<McStatusResponse>(
      `https://api.mcstatus.io/v2/status/${edition}/${address}`,
      { timeout: 3_000 },
    );
    return {
      online: Boolean(status.online),
      reachable: true,
      players: Math.max(0, Number(status.players?.online ?? 0)),
      maximumPlayers: Math.max(0, Number(status.players?.max ?? 0)),
      version: status.version?.name_clean ?? status.version?.name ?? null,
      motd: status.motd?.clean ?? null,
    };
  } catch {
    return {
      online: false,
      reachable: false,
      players: 0,
      maximumPlayers: 0,
      version: null,
      motd: null,
    };
  }
}

export interface ModePlayingCount {
  id: string;
  playing: number;
}

/** Snapshots older than this are ignored so stale counts are never shown as live. */
const MODE_SNAPSHOT_MAX_AGE_SECONDS = 90;

/**
 * Aggregates live players per mode from the game servers' runtime snapshots
 * (published every few seconds over the admin bridge). Mode IDs follow the
 * gameplay normalization: lowercase game name without punctuation.
 */
export function aggregateModeCounts(snapshots: ReadonlyArray<{ games: unknown }>): ModePlayingCount[] {
  const totals = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (!Array.isArray(snapshot.games)) continue;
    for (const game of snapshot.games) {
      if (!game || typeof game !== "object") continue;
      const { name, players } = game as { name?: unknown; players?: unknown };
      if (typeof name !== "string") continue;
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!/^[a-z0-9]{1,32}$/.test(id)) continue;
      const count = typeof players === "number" && Number.isFinite(players) ? Math.max(0, Math.floor(players)) : 0;
      totals.set(id, (totals.get(id) ?? 0) + count);
    }
  }
  return [...totals.entries()]
    .map(([id, playing]) => ({ id, playing }))
    .sort((a, b) => b.playing - a.playing || a.id.localeCompare(b.id));
}

/** Undefined when no fresh runtime snapshot exists (bridge disabled or server down). */
export async function liveModeCounts(): Promise<ModePlayingCount[] | undefined> {
  try {
    const { default: db } = await import("../../db/client");
    const rows = await db.execute<{ games: unknown }>(sql`
      SELECT payload -> 'games' AS games
        FROM admin_runtime_snapshots
       WHERE updated_at >= now() - make_interval(secs => ${MODE_SNAPSHOT_MAX_AGE_SECONDS})
    `);
    if (!rows.length) return undefined;
    return aggregateModeCounts([...rows]);
  } catch {
    return undefined;
  }
}

export async function fetchMobileServerStatus() {
  const [java, bedrock, modes] = await Promise.all([
    statusFor("java", "play.cookie-build.com"),
    statusFor("bedrock", "play.cookie-build.com:19132"),
    liveModeCounts(),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    online: java.online || bedrock.online,
    java,
    bedrock,
    ...(modes ? { modes } : {}),
  };
}
