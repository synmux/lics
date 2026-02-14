import type { License } from "./types.ts"

const licenses: License[] = [
  {
    id: "1",
    software: "JetBrains All Products",
    key: "JBAP-2X9K4-M7R3N-HQWF8-PLZV6",
    type: "personal",
    expiresAt: new Date("2026-06-15"),
    notes: "Includes IntelliJ, WebStorm, DataGrip, etc.",
  },
  {
    id: "2",
    software: "Sublime Text",
    key: "SUBL-4R8T2-VN5CX-QJ7WM-3YKBD",
    type: "personal",
    expiresAt: null,
    notes: "Perpetual license with free updates",
  },
  {
    id: "3",
    software: "1Password",
    key: "A3-XKMR47-NF8QYL-BWTZ62-DPCHV9-JE5GA",
    type: "family",
    expiresAt: new Date("2027-01-20"),
    notes: "Family plan, up to 5 members",
  },
  {
    id: "4",
    software: "Figma",
    key: "FIG-PRO-8NX4KR-VT2MQW-6JBLP7",
    type: "team",
    expiresAt: new Date("2026-03-01"),
  },
  {
    id: "5",
    software: "Adobe Creative Cloud",
    key: "ADCC-7WX2F-QR9TN-4MLBK-8YCVH-ZP6JD",
    type: "enterprise",
    expiresAt: new Date("2026-11-30"),
    notes: "All Apps plan",
  },
  {
    id: "6",
    software: "Tailwind UI",
    key: "TWUI-ALL-9GKXR3-BN7VQM-2WFHTP",
    type: "team",
    expiresAt: null,
    notes: "Lifetime access, all components",
  },
]

/** Fuzzy substring match against software name (case-insensitive) */
export function searchLicenses(query: string): License[] {
  const q = query.toLowerCase()
  return licenses.filter((l) => l.software.toLowerCase().includes(q))
}

/** Return all licenses */
export function getAllLicenses(): License[] {
  return [...licenses]
}

/** Exact-ish match: case-insensitive, returns first match */
export function getLicense(name: string): License | null {
  const q = name.toLowerCase()
  return (
    licenses.find((l) => l.software.toLowerCase() === q) ??
    licenses.find((l) => l.software.toLowerCase().includes(q)) ??
    null
  )
}

/**
 * Return the closest matches for a given query (for "did you mean?" suggestions).
 * Uses simple character overlap scoring.
 */
export function getSuggestions(query: string, max = 3): string[] {
  const q = query.toLowerCase()
  const scored = licenses.map((l) => {
    const name = l.software.toLowerCase()
    let score = 0
    for (const char of q) {
      if (name.includes(char)) score++
    }
    return { name: l.software, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.name)
}
