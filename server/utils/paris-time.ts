/**
 * Europe/Paris calendar helpers. Cookie Build rewards and community events follow
 * French calendar days, including daylight-saving transitions.
 */
export const PARIS_TIME_ZONE = "Europe/Paris";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(instant: Date): ZonedParts {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour! % 24,
    minute: values.minute!,
    second: values.second!,
  };
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(key: string) {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Paris calendar date (YYYY-MM-DD) of an instant. */
export function parisDateKey(instant: Date): string {
  const parts = zonedParts(instant);
  return formatDateKey(parts.year, parts.month, parts.day);
}

export function addDaysToDateKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a calendar date key. */
export function isoWeekdayOfDateKey(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

/** Converts a Paris wall-clock time on a calendar date into the UTC instant. */
export function parisWallTimeToUtc(key: string, hour: number, minute = 0): Date {
  const { year, month, day } = parseDateKey(key);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wallAsUtc;
  // Two passes settle the offset on both sides of a DST transition.
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = zonedParts(new Date(guess));
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess += wallAsUtc - observed;
  }
  return new Date(guess);
}

/** Start of the next Paris calendar day. */
export function nextParisMidnight(instant: Date): Date {
  return parisWallTimeToUtc(addDaysToDateKey(parisDateKey(instant), 1), 0, 0);
}

/** ISO week key (e.g. 2026-W40) of a calendar date key. */
export function isoWeekKeyOfDateKey(key: string): string {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
