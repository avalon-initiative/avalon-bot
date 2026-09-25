/** Short-lived in-memory key/value store; entries expire after `ttlMs`. */
export class TtlStore<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  set(key: string, value: V): void {
    this.sweep();
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  /** Returns and removes the entry, or undefined if missing or expired. */
  take(key: string): V | undefined {
    const entry = this.entries.get(key);
    this.entries.delete(key);
    return entry && entry.expiresAt > this.now() ? entry.value : undefined;
  }

  private sweep(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
