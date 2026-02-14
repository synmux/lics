/**
 * License types matching the Notion "Licences" database schema.
 *
 * Notion fields:
 *   App (title), License Key (text), License File (file),
 *   Name (text), Email (email), Version (text), URL (url),
 *   Purchase Date (date), Expiry Date (date), Note (text)
 */

/** A file attachment from the Notion database */
export interface LicenseFile {
  /** Original filename */
  name: string
  /** File content as base64 (mock) or download URL (Notion) */
  data: string
}

/** Core license record — mirrors the Notion schema exactly */
export interface License {
  /** Notion page ID */
  id: string
  /** Software / app name (Notion title field "App") */
  app: string
  /** License key string, if this is a key-based license */
  licenseKey: string | null
  /** License file attachment, if this is a file-based license */
  licenseFile: LicenseFile | null
  /** Registered name on the license */
  name: string | null
  /** Email associated with the license */
  email: string | null
  /** Software version */
  version: string | null
  /** Related URL (product page, account portal, etc.) */
  url: string | null
  /** When the license was purchased */
  purchaseDate: Date | null
  /** When the license expires (null = perpetual) */
  expiryDate: Date | null
  /** Additional notes */
  note: string | null
}

/** Discriminated helper: does this license have a key, a file, or both? */
export type LicenseKind = "key" | "file" | "both" | "none"

export function licenseKind(license: License): LicenseKind {
  const hasKey = license.licenseKey !== null && license.licenseKey.length > 0
  const hasFile = license.licenseFile !== null
  if (hasKey && hasFile) return "both"
  if (hasKey) return "key"
  if (hasFile) return "file"
  return "none"
}

/** Expiry status for color-coding in the TUI */
export type ExpiryStatus = "valid" | "expiring" | "expired" | "perpetual"

/** Returns expiry status with a 30-day "expiring soon" window */
export function expiryStatus(license: License): ExpiryStatus {
  if (license.expiryDate === null) return "perpetual"
  const now = new Date()
  if (license.expiryDate < now) return "expired"
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (license.expiryDate.getTime() - now.getTime() < thirtyDays) return "expiring"
  return "valid"
}
