/** Keep rotations aligned with gameplay PeriodicObjectivePolicy. */
export type SkyblockObjectiveCadence = "daily" | "weekly";

const objectives = {
  daily: [
    { id: "daily_cobble", event: "collect", subject: "cobblestone", target: 64, rewardCoins: 75 },
    { id: "daily_harvest", event: "collect", subject: "wheat", target: 48, rewardCoins: 75 },
    { id: "daily_lumber", event: "collect", subject: "oak_log", target: 48, rewardCoins: 75 },
  ],
  weekly: [
    { id: "weekly_gatherer", event: "collect", subject: "any", target: 512, rewardCoins: 500 },
    { id: "weekly_worker", event: "collect_worker", subject: "any", target: 384, rewardCoins: 500 },
    { id: "weekly_merchant", event: "merchant_sale", subject: "any", target: 256, rewardCoins: 500 },
  ],
} as const;

export function skyblockPeriodicObjective(
  playerId: string,
  cadence: SkyblockObjectiveCadence,
  today: string,
) {
  const date = new Date(`${today}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== today) {
    throw new Error("Valid UTC objective date required");
  }
  if (cadence === "weekly") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  }
  // Java UUID.hashCode XORs its four signed 32-bit words. LocalDate.hashCode
  // combines the year, month and day. Math.imul preserves Java int overflow.
  const hex = playerId.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("Valid player UUID required");
  let uuidHash = 0;
  for (let offset = 0; offset < 32; offset += 8) {
    uuidHash ^= Number.parseInt(hex.slice(offset, offset + 8), 16);
  }
  const year = date.getUTCFullYear();
  const dateHash = (year & 0xfffff800) ^ ((year << 11) + ((date.getUTCMonth() + 1) << 6) + date.getUTCDate());
  const hash = (Math.imul(31, uuidHash) + dateHash) | 0;
  const choices = objectives[cadence];
  return {
    ...choices[((hash % choices.length) + choices.length) % choices.length]!,
    cadence,
    periodStart: date.toISOString().slice(0, 10),
  };
}
