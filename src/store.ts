import type { Licence } from './types.ts'

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
 * Return the closest matches for a given query (for "did you mean?" suggestions).
 * Uses simple character overlap scoring.
 */
export function getSuggestions(query: string, max = 3): string[] {
  const q = query.toLowerCase()
  const scored = licences.map((l) => {
    const name = l.app.toLowerCase()
    let score = 0
    for (const char of q) {
      if (name.includes(char)) score++
    }
    return { name: l.app, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((s) => s.name)
}
