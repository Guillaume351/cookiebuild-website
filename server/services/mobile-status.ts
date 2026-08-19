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

export async function fetchMobileServerStatus() {
  const [java, bedrock] = await Promise.all([
    statusFor("java", "play.cookie-build.com"),
    statusFor("bedrock", "play.cookie-build.com:19132"),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    online: java.online || bedrock.online,
    java,
    bedrock,
  };
}
