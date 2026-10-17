/**
 * Near-duplicate detection for the same story reported by different outlets.
 * Exact duplicates (same canonical URL) are handled by the database's unique index.
 *
 * Near-duplicates are NOT deleted. They share a `cluster_id`, and the edition builder (M5)
 * shows one story per cluster, choosing the best with `representativeScore`.
 */

export const NEAR_DUPLICATE_THRESHOLD = 0.7;
export const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Very short titles produce noisy overlap, so they never cluster. */
const MIN_TOKENS = 3;

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const token of small) if (large.has(token)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

export interface ClusterEntry {
  id: string;
  tokens: ReadonlySet<string>;
  /** Publication time in ms. */
  ts: number;
  clusterId: string;
  /** True for older rows that have no cluster_id stored yet. */
  needsClusterWrite: boolean;
}

export class ClusterIndex {
  private readonly entries: ClusterEntry[] = [];

  add(entry: ClusterEntry): void {
    this.entries.push(entry);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Best entry with title Jaccard above the threshold and published within 48h, if any. */
  findMatch(tokens: ReadonlySet<string>, ts: number): ClusterEntry | undefined {
    if (tokens.size < MIN_TOKENS) return undefined;
    let best: ClusterEntry | undefined;
    let bestScore = NEAR_DUPLICATE_THRESHOLD;
    for (const entry of this.entries) {
      if (entry.tokens.size < MIN_TOKENS) continue;
      if (Math.abs(entry.ts - ts) > CLUSTER_WINDOW_MS) continue;
      const score = jaccard(tokens, entry.tokens);
      if (score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
    return best;
  }
}

/**
 * Picks the best article inside a cluster: richest content, most reliable source, has an image.
 * Higher is better. Used by M5; join `sources.reliability` on the article's domain.
 */
export function representativeScore(input: {
  textLength: number;
  reliability: number;
  hasImage: boolean;
}): number {
  const content = Math.min(Math.max(input.textLength, 0) / 4000, 1);
  return input.reliability * 0.5 + content * 0.4 + (input.hasImage ? 0.1 : 0);
}
