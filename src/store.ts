import { fuzzyMatch } from './fuzzy.ts'
import type { Licence } from './types.ts'

/**
 * Mock licence data matching the Notion "Licences" database schema.
 * Includes both key-based and file-based licences.
 * Will be swapped for a Notion adapter later.
 */
const licences: Licence[] = [
  {
    id: 'mock-1',
    label: 'JetBrains All Products Pack',
    apps: ['IntelliJ IDEA', 'WebStorm', 'DataGrip', 'GoLand', 'PyCharm'],
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
    label: 'Sublime Text',
    apps: ['Sublime Text'],
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
    label: '1Password Family',
    apps: ['1Password'],
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
    label: 'SoundSource',
    apps: ['SoundSource'],
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
    label: 'Typora',
    apps: ['Typora'],
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
    label: 'Microsoft Office 365 E3',
    apps: ['Microsoft Office 365', 'Word', 'Excel', 'PowerPoint', 'Outlook'],
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
    label: 'Sketch',
    apps: ['Sketch'],
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
    label: 'Adobe Creative Cloud All Apps',
    apps: ['Adobe Creative Cloud', 'Photoshop', 'Illustrator', 'Premiere Pro'],
    licenceKey: 'ADCC-7WX2F-QR9TN-4MLBK-8YCVH-ZP6JD',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: null,
    url: 'https://account.adobe.com',
    purchaseDate: new Date('2025-05-01'),
    expiryDate: new Date('2026-11-30'),
    note: 'All Apps plan'
  },
  {
    id: 'mock-9',
    label: 'Sublime Text Team',
    apps: ['Sublime Text', 'Sublime Merge'],
    licenceKey: 'STEA-8QW3R-XN2VK-JM6FP-4YBTH',
    licenceFile: null,
    name: 'Dave Williams',
    email: 'dave@dave.io',
    version: '4',
    url: 'https://www.sublimehq.com',
    purchaseDate: new Date('2025-02-01'),
    expiryDate: new Date('2027-02-01'),
    note: 'Team licence, covers Sublime Text and Sublime Merge'
  }
]

/** Substring match against both label and app names (case-insensitive) */
export function searchLicences(query: string): Licence[] {
  const normalizedQuery = query.toLowerCase()
  return licences.filter(
    (licence) =>
      licence.label.toLowerCase().includes(normalizedQuery) ||
      licence.apps.some((appName) => appName.toLowerCase().includes(normalizedQuery))
  )
}

/** Return all licences */
export function getAllLicences(): Licence[] {
  return [...licences]
}

/**
 * Return all licences whose apps array contains a match for the given name.
 * Exact app-name matches are sorted first, then partial matches.
 */
export function getLicences(name: string): Licence[] {
  const normalizedName = name.toLowerCase()

  const exactAppMatches: Licence[] = []
  const partialMatches: Licence[] = []

  for (const licence of licences) {
    const hasExactApp = licence.apps.some((appName) => appName.toLowerCase() === normalizedName)
    const hasPartialApp = licence.apps.some((appName) => appName.toLowerCase().includes(normalizedName))
    const labelMatch =
      licence.label.toLowerCase() === normalizedName || licence.label.toLowerCase().includes(normalizedName)

    if (hasExactApp) {
      exactAppMatches.push(licence)
    } else if (hasPartialApp || labelMatch) {
      partialMatches.push(licence)
    }
  }

  return [...exactAppMatches, ...partialMatches]
}

/** Exact-ish match: wraps getLicences(), returns the first result or null */
export function getLicence(name: string): Licence | null {
  return getLicences(name)[0] ?? null
}

/**
 * Return the closest matches for a given query (for "did you mean?" suggestions).
 * Collects all unique app names across all licences and delegates to fuzzyMatch.
 */
export function getSuggestions(query: string, max = 3): string[] {
  return fuzzyMatch(query, getAllAppNames(), max)
}

/** Returns a sorted list of unique app names across all licences */
export function getAllAppNames(): string[] {
  const appNames = new Set(licences.flatMap((licence) => licence.apps))
  return [...appNames].sort((first, second) => first.localeCompare(second))
}
