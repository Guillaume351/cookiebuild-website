export function databaseErrorCode(error: unknown): string | null {
  let current = error;
  const visited = new Set<object>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const record = current as Record<string, unknown>;
    if (typeof record.code === "string") return record.code;
    current = record.cause;
  }
  return null;
}
