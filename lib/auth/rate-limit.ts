const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const hits = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length > 0) failures.set(key, hits);
  else failures.delete(key);
  return hits;
}

export function isLoginBlocked(key: string): boolean {
  return recent(key, Date.now()).length >= MAX_FAILURES;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  failures.set(key, [...recent(key, now), now]);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
