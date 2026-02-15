import { jaroWinkler } from '@skyra/jaro-winkler'

/**
 * Return the closest matches for a query from a list of candidates.
 * Uses Jaro-Winkler similarity, which rewards matching prefixes.
 *
 * Multi-word candidates are scored both as whole strings and word-by-word,
 * taking the best match. This lets "sublim" match "Sublime Text" via the
 * word "Sublime" even though the full string is longer.
 */
export function fuzzyMatch(query: string, candidates: string[], max = 3): string[] {
  const normalizedQuery = query.toLowerCase()
  const scored = candidates.map((candidate) => {
    const name = candidate.toLowerCase()
    const words = name.split(/\s+/)
    const maxWordSimilarity = Math.max(...words.map((word) => jaroWinkler(normalizedQuery, word)))
    const fullSimilarity = jaroWinkler(normalizedQuery, name)
    const similarity = Math.max(maxWordSimilarity, fullSimilarity)
    return { candidate, similarity }
  })
  scored.sort((left, right) => right.similarity - left.similarity)
  return scored.slice(0, max).map((scoredEntry) => scoredEntry.candidate)
}
