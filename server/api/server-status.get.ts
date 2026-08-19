import { fetchMobileServerStatus } from "../services/mobile-status";

export default defineCachedEventHandler(
  async () => {
    const status = await fetchMobileServerStatus();
    return {
      ...status,
      // Java and Bedrock share one Minecraft network. Taking the highest
      // edition count avoids presenting the same connected player twice.
      players: Math.max(status.java.players, status.bedrock.players),
    };
  },
  { maxAge: 30, name: "cookie-build-server-status" },
);
