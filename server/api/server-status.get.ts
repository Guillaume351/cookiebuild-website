interface McStatusResponse {
  online?: boolean;
  players?: { online?: number };
}

export default defineCachedEventHandler(
  async () => {
    try {
      const status = await $fetch<McStatusResponse>(
        "https://api.mcstatus.io/v2/status/java/play.cookie-build.com",
        { timeout: 3_000 },
      );

      return {
        online: Boolean(status.online),
        players: Math.max(0, Number(status.players?.online ?? 0)),
      };
    } catch {
      return { online: false, players: 0 };
    }
  },
  { maxAge: 60, name: "cookie-build-server-status" },
);
