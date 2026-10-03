/** Small byte-bounded LRU cache (Map insertion order = recency). */
export class ByteLru<V extends { byteLength: number }> {
  private readonly entries = new Map<string, V>();
  private bytes = 0;

  constructor(private readonly maxEntries: number, private readonly maxBytes: number) {}

  get(key: string) {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: string, value: V) {
    const previous = this.entries.get(key);
    if (previous) {
      this.bytes -= previous.byteLength;
      this.entries.delete(key);
    }
    if (value.byteLength > this.maxBytes) return;
    this.entries.set(key, value);
    this.bytes += value.byteLength;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.bytes -= this.entries.get(oldest.value)!.byteLength;
      this.entries.delete(oldest.value);
    }
  }

  get size() {
    return this.entries.size;
  }

  get totalBytes() {
    return this.bytes;
  }
}
