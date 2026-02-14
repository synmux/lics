import type { License } from "./types.ts";

/**
 * Mock license data matching the Notion "Licences" database schema.
 * Includes both key-based and file-based licenses.
 * Will be swapped for a Notion adapter later.
 */
const licenses: License[] = [
  {
    id: "mock-1",
    app: "JetBrains All Products Pack",
    licenseKey: "JBAP-2X9K4-M7R3N-HQWF8-PLZV6",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: null,
    url: "https://account.jetbrains.com",
    purchaseDate: new Date("2025-10-10"),
    expiryDate: new Date("2026-06-15"),
    note: "Monthly billing, includes IntelliJ, WebStorm, DataGrip",
  },
  {
    id: "mock-2",
    app: "Sublime Text",
    licenseKey: "SUBL-4R8T2-VN5CX-QJ7WM-3YKBD",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: "4",
    url: null,
    purchaseDate: new Date("2023-03-15"),
    expiryDate: null,
    note: "Perpetual license with free updates to v4.x",
  },
  {
    id: "mock-3",
    app: "1Password",
    licenseKey: "A3-XKMR47-NF8QYL-BWTZ62-DPCHV9-JE5GA",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: null,
    url: "https://my.1password.com",
    purchaseDate: new Date("2024-01-20"),
    expiryDate: new Date("2027-01-20"),
    note: "Family plan, up to 5 members",
  },
  {
    id: "mock-4",
    app: "SoundSource",
    licenseKey: "SS5-DXWM-7KRN-VQJF-3BTH",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: "5",
    url: "https://rogueamoeba.com/soundsource/",
    purchaseDate: new Date("2025-08-12"),
    expiryDate: null,
    note: null,
  },
  {
    id: "mock-5",
    app: "Typora",
    licenseKey: "TYP-9NXW4-RQKM7-BFHZ2",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: "1.x",
    url: "https://store.typora.io",
    purchaseDate: new Date("2024-06-01"),
    expiryDate: null,
    note: "Perpetual for v1.x, up to 3 devices",
  },
  {
    id: "mock-6",
    app: "Microsoft Office 365",
    licenseKey: null,
    licenseFile: {
      name: "microsoft-office-365.lic",
      // Mock base64 content representing a license XML file
      data: Buffer.from(
        `<?xml version="1.0"?>
<License>
  <Product>Microsoft Office 365</Product>
  <Key>NKGG6-WBPCC-HXWMY-6DQGJ-CPQVG</Key>
  <Type>E3</Type>
  <Seats>5</Seats>
  <Expires>2026-12-31</Expires>
</License>`,
      ).toString("base64"),
    },
    name: "Dave Williams",
    email: "dave@dave.io",
    version: "365",
    url: "https://portal.office.com",
    purchaseDate: new Date("2025-01-01"),
    expiryDate: new Date("2026-12-31"),
    note: "E3 license, 5 seats",
  },
  {
    id: "mock-7",
    app: "Sketch",
    licenseKey: null,
    licenseFile: {
      name: "sketch-license.txt",
      data: Buffer.from(
        "SKETCH-LICENSE-V99\nHolder: Dave Williams\nEmail: dave@dave.io\nKey: SK99-XWMR-4QKN-7BFH-ZTPL\nDevices: 2\nExpires: Never\n",
      ).toString("base64"),
    },
    name: "Dave Williams",
    email: "dave@dave.io",
    version: "99",
    url: "https://www.sketch.com",
    purchaseDate: new Date("2024-11-20"),
    expiryDate: null,
    note: "Perpetual, 2 devices",
  },
  {
    id: "mock-8",
    app: "Adobe Creative Cloud",
    licenseKey: "ADCC-7WX2F-QR9TN-4MLBK-8YCVH-ZP6JD",
    licenseFile: null,
    name: "Dave Williams",
    email: "dave@dave.io",
    version: null,
    url: "https://account.adobe.com",
    purchaseDate: new Date("2025-05-01"),
    expiryDate: new Date("2026-11-30"),
    note: "All Apps plan",
  },
];

/** Fuzzy substring match against app name (case-insensitive) */
export function searchLicenses(query: string): License[] {
  const q = query.toLowerCase();
  return licenses.filter((l) => l.app.toLowerCase().includes(q));
}

/** Return all licenses */
export function getAllLicenses(): License[] {
  return [...licenses];
}

/** Exact-ish match: case-insensitive, prefers exact over partial */
export function getLicense(name: string): License | null {
  const q = name.toLowerCase();
  return (
    licenses.find((l) => l.app.toLowerCase() === q) ??
    licenses.find((l) => l.app.toLowerCase().includes(q)) ??
    null
  );
}

/**
 * Return the closest matches for a given query (for "did you mean?" suggestions).
 * Uses simple character overlap scoring.
 */
export function getSuggestions(query: string, max = 3): string[] {
  const q = query.toLowerCase();
  const scored = licenses.map((l) => {
    const name = l.app.toLowerCase();
    let score = 0;
    for (const char of q) {
      if (name.includes(char)) score++;
    }
    return { name: l.app, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.name);
}
