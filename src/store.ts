import type { Licence } from './types.ts'

/** Maximum Levenshtein distance to consider for suggestions */
const MAX_SUGGESTION_DISTANCE = 10

/**
 * Mock licence data matching the Notion "Licences" database schema.
 * Includes both key-based and file-based licences.
 * Will be swapped for a Notion adapter later.
 */
const licences: Licence[] = [
  {
    id: 'mock-1',
    app: 'JetBrains All Products Pack',
    licenceKey: 'JBAP-2X9K4-M7R3N-HQWF8-PLZV6',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: null,
    url: 'https://account.jetbrains.com',
    purchaseDate: new Date('2025-10-10'),
    expiryDate: new Date('2026-06-15'),
    note: 'Monthly billing, includes IntelliJ, WebStorm, DataGrip'
  },
  {
    id: 'mock-2',
    app: 'Sublime Text',
    licenceKey: 'SUBL-4R8T2-VN5CX-QJ7WM-3YKBD',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '4',
    url: null,
    purchaseDate: new Date('2023-03-15'),
    expiryDate: null,
    note: 'Perpetual licence with free updates to v4.x'
  },
  {
    id: 'mock-3',
    app: '1Password',
    licenceKey: 'A3-XKMR47-NF8QYL-BWTZ62-DPCHV9-JE5GA',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: null,
    url: 'https://my.1password.com',
    purchaseDate: new Date('2024-01-20'),
    expiryDate: new Date('2027-01-20'),
    note: 'Family plan, up to 5 members'
  },
  {
    id: 'mock-4',
    app: 'SoundSource',
    licenceKey: 'SS5-DXWM-7KRN-VQJF-3BTH',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '5',
    url: 'https://rogueamoeba.com/soundsource/',
    purchaseDate: new Date('2025-08-12'),
    expiryDate: null,
    note: null
  },
  {
    id: 'mock-5',
    app: 'Typora',
    licenceKey: 'TYP-9NXW4-RQKM7-BFHZ2',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '1.x',
    url: 'https://store.typora.io',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: null,
    note: 'Perpetual for v1.x, up to 3 devices'
  },
  {
    id: 'mock-6',
    app: 'Microsoft Office 365',
    licenceKey: null,
    licenceFile: {
      name: 'microsoft-office-365.lic',
      // Mock base64 content representing a licence XML file
      data: Buffer.from(
        `<?xml version="1.0"?>
<Licence>
  <Product>Microsoft Office 365</Product>
  <Key>NKGG6-WBPCC-HXWMY-6DQGJ-CPQVG</Key>
  <Type>E3</Type>
  <Seats>5</Seats>
  <Expires>2026-12-31</Expires>
</Licence>`
      ).toString('base64')
    },
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '365',
    url: 'https://portal.office.com',
    purchaseDate: new Date('2025-01-01'),
    expiryDate: new Date('2026-12-31'),
    note: 'E3 licence, 5 seats'
  },
  {
    id: 'mock-7',
    app: 'Sketch',
    licenceKey: null,
    licenceFile: {
      name: 'sketch-licence.txt',
      data: Buffer.from(
        'SKETCH-LICENCE-V99\nHolder: Dave Williams\nEmail: dave@dave.io\nKey: SK99-XWMR-4QKN-7BFH-ZTPL\nDevices: 2\nExpires: Never\n'
      ).toString('base64')
    },
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '99',
    url: 'https://www.sketch.com',
    purchaseDate: new Date('2024-11-20'),
    expiryDate: null,
    note: 'Perpetual, 2 devices'
  },
  {
    id: 'mock-8',
    app: 'Adobe Creative Cloud',
    licenceKey: 'ADCC-7WX2F-QR9TN-4MLBK-8YCVH-ZP6JD',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: null,
    url: 'https://account.adobe.com',
    purchaseDate: new Date('2025-05-01'),
    expiryDate: new Date('2026-11-30'),
    note: 'All Apps plan'
  }
]

/** Fuzzy substring match against app name (case-insensitive) */
export function searchLicences(query: string): Licence[] {
  const q = query.toLowerCase()
  return licences.filter((l) => l.app.toLowerCase().includes(q))
}

/** Return all licences */
export function getAllLicences(): Licence[] {
  return [...licences]
}

/** Exact-ish match: case-insensitive, prefers exact over partial */
export function getLicence(name: string): Licence | null {
  const q = name.toLowerCase()
  return (
    licences.find((l) => l.app.toLowerCase() === q) ?? licences.find((l) => l.app.toLowerCase().includes(q)) ?? null
  )
}

/**
 * Calculate Levenshtein distance between two strings with early exit.
 * Returns the minimum number of single-character edits needed to transform a into b.
 * Uses a space-optimised 2-row DP approach and caps distance at maxDistance for performance.
 * 
 * @param a First string
 * @param b Second string
 * @param maxDistance Maximum distance to consider (returns maxDistance + 1 if exceeded)
 * @returns Distance between strings, or maxDistance + 1 if it exceeds the threshold
 */
function levenshteinDistance(a: string, b: string, maxDistance = MAX_SUGGESTION_DISTANCE): number {
  const m = a.length
  const n = b.length

  // Early exit: if length difference exceeds maxDistance, no point computing
  if (Math.abs(m - n) > maxDistance) {
    return maxDistance + 1
  }

  // Use only 2 rows instead of full m×n matrix (space: O(n) instead of O(m×n))
  let prevRow = Array.from({ length: n + 1 }, (_, j) => j)
  let currRow = Array(n + 1).fill(0)

  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    let minInRow = Infinity // Track minimum value in current row for early exit

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j]! + 1,      // deletion
        currRow[j - 1]! + 1,  // insertion
        prevRow[j - 1]! + cost // substitution
      )
      minInRow = Math.min(minInRow, currRow[j]!)
    }

    // Early exit: if the best possible distance in this row exceeds threshold, bail
    if (minInRow > maxDistance) {
      return maxDistance + 1
    }

    // Swap rows for next iteration
    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  return prevRow[n]!
}

/**
 * Return the closest matches for a given query (for "did you mean?" suggestions).
 * Uses Levenshtein distance for fuzzy matching with a distance threshold.
 * Only returns suggestions with distance ≤ threshold.
 */
export function getSuggestions(query: string, max = 3): string[] {
  const q = query.toLowerCase()
  
  const scored = licences.map((l) => {
    const name = l.app.toLowerCase()
    // Use minimum distance to any word in the app name for better matching
    const words = name.split(/\s+/)
    const minWordDistance = Math.min(...words.map((word) => levenshteinDistance(q, word)))
    // Also consider distance to full name for exact matches
    const fullDistance = levenshteinDistance(q, name)
    // Take the better of the two scores
    const distance = Math.min(minWordDistance, fullDistance)
    return { name: l.app, distance }
  })
  
  // Filter out results that exceed threshold, then sort by distance (lower is better)
  return scored
    .filter((s) => s.distance <= MAX_SUGGESTION_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max)
    .map((s) => s.name)
}
