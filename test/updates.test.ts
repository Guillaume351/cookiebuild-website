import { describe, expect, it } from "vitest";
import {
  eventDate,
  eventDateTime,
  featuredEvent,
  isEventLive,
  updateTypeLabel,
  type NetworkEvent,
} from "../utils/updates";

function networkEvent(overrides: Partial<NetworkEvent> = {}): NetworkEvent {
  return {
    id: "event-1",
    slug: "community-night",
    title: "Community Night",
    description: "Play together.",
    gameType: "TurfWars",
    imageUrl: null,
    startsAt: "2026-08-01T18:30:00Z",
    endsAt: "2026-08-01T20:30:00Z",
    ...overrides,
  };
}

describe("public updates presentation", () => {
  it("gives each post type a clear public label", () => {
    expect(updateTypeLabel("news")).toBe("News");
    expect(updateTypeLabel("changelog")).toBe("Release note");
  });

  it("prioritizes a live event, then the nearest upcoming event", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const later = networkEvent({
      id: "later",
      startsAt: "2026-08-02T18:30:00Z",
      endsAt: "2026-08-02T20:30:00Z",
    });
    const sooner = networkEvent({ id: "sooner" });

    expect(featuredEvent([later, sooner], now)?.id).toBe("sooner");

    const live = networkEvent({
      id: "live",
      startsAt: "2026-07-16T11:00:00Z",
      endsAt: "2026-07-16T13:00:00Z",
    });
    expect(featuredEvent([sooner, live], now)?.id).toBe("live");
    expect(isEventLive(live, now)).toBe(true);
  });

  it("does not keep undated or stale sessions featured", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const stale = networkEvent({
      startsAt: "2026-07-16T08:00:00Z",
      endsAt: null,
    });
    const invalid = networkEvent({ startsAt: "invalid", endsAt: null });

    expect(isEventLive(stale, now)).toBe(false);
    expect(featuredEvent([stale, invalid], now)).toBeNull();
  });

  it("formats event timestamps in Cookie Build's advertised timezone", () => {
    expect(eventDate("2026-08-01T18:30:00Z", "en-GB")).toBe(
      "Saturday, 1 August 2026 at 20:30 CEST",
    );
    expect(eventDate("invalid")).toBe("Date to be announced");
    expect(eventDateTime("2026-08-01T18:30:00Z")).toBe("2026-08-01T18:30:00.000Z");
    expect(eventDateTime("invalid")).toBeUndefined();
  });
});
