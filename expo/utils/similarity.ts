/** Text normalization + fuzzy matching helpers used by the card matcher. */

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  const clean = s.replace(/\s+/g, " ");
  for (let i = 0; i < clean.length - 1; i++) {
    const gram = clean.slice(i, i + 2);
    map.set(gram, (map.get(gram) ?? 0) + 1);
  }
  return map;
}

/** Sørensen–Dice coefficient over character bigrams (0..1). */
export function diceSimilarity(rawA: string, rawB: string): number {
  const a = normalizeText(rawA);
  const b = normalizeText(rawB);
  if (a.length < 2 || b.length < 2) return a === b && a.length > 0 ? 1 : 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let overlap = 0;
  let totalA = 0;
  let totalB = 0;
  gramsA.forEach((count) => {
    totalA += count;
  });
  gramsB.forEach((count) => {
    totalB += count;
  });
  gramsA.forEach((count, gram) => {
    const other = gramsB.get(gram) ?? 0;
    overlap += Math.min(count, other);
  });
  if (totalA + totalB === 0) return 0;
  return (2 * overlap) / (totalA + totalB);
}

/** Fraction of tokens from `needle` present in `haystack` (0..1). */
export function tokenOverlap(needle: string, haystack: string): number {
  const nTokens = normalizeText(needle).split(" ").filter((t) => t.length > 1);
  if (nTokens.length === 0) return 0;
  const hay = ` ${normalizeText(haystack)} `;
  let hits = 0;
  for (const token of nTokens) {
    if (hay.includes(` ${token} `) || hay.includes(token)) hits += 1;
  }
  return hits / nTokens.length;
}

/** Combined name similarity with containment boost (0..1). */
export function nameSimilarity(query: string, candidate: string): number {
  const dice = diceSimilarity(query, candidate);
  const q = normalizeText(query);
  const c = normalizeText(candidate);
  let boost = 0;
  if (q.length > 3 && (c.includes(q) || q.includes(c))) boost = 0.15;
  return Math.min(1, dice + boost);
}
