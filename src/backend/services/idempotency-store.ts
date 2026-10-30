const seen = new Map<string, { status: string; result: unknown }>();

export const IdempotencyStore = {
  has(key: string): boolean {
    return seen.has(key);
  },
  get(key: string): { status: string; result: unknown } | undefined {
    return seen.get(key);
  },
  set(key: string, value: { status: string; result: unknown }): void {
    seen.set(key, value);
  },
  clear(): void {
    seen.clear();
  },
};