/**
 * Licence types matching the Notion "Licences" database schema.
 *
 * Notion fields:
 *   App (title), Licence Key (text), Licence File (file),
 *   Name (text), Email (email), Version (text), URL (url),
 *   Purchase Date (date), Expiry Date (date), Note (text)
 */

/** A file attachment from the Notion database */
export interface LicenceFile {
  /** Original filename */
  name: string
  /** File content as base64 (mock) or download URL (Notion) */
  data: string
}

/** Core licence record — mirrors the Notion schema exactly */
export interface Licence {
  /** Notion page ID */
  id: string
  /** Software / app name (Notion title field "App") */
  app: string
  /** Licence key string, if this is a key-based licence */
  licenceKey: string | null
  /** Licence file attachment, if this is a file-based licence */
  licenceFile: LicenceFile | null
  /** Registered name on the licence */
  name: string | null
  /** Email associated with the licence */
  email: string | null
  /** Software version */
  version: string | null
  /** Related URL (product page, account portal, etc.) */
  url: string | null
  /** When the licence was purchased */
  purchaseDate: Date | null
  /** When the licence expires (null = perpetual) */
  expiryDate: Date | null
  /** Additional notes */
  note: string | null
}

/** Discriminated helper: does this licence have a key, a file, or both? */
export type LicenceKind = 'key' | 'file' | 'both' | 'none'

export function licenceKind(licence: Licence): LicenceKind {
  const hasKey = licence.licenceKey !== null && licence.licenceKey.length > 0
  const hasFile = licence.licenceFile !== null
  if (hasKey && hasFile) return 'both'
  if (hasKey) return 'key'
  if (hasFile) return 'file'
  return 'none'
}

/** Expiry status for color-coding in the TUI */
export type ExpiryStatus = 'valid' | 'expiring' | 'expired' | 'perpetual'

/** Returns expiry status with a 30-day "expiring soon" window */
export function expiryStatus(licence: Licence): ExpiryStatus {
  if (licence.expiryDate === null) return 'perpetual'
  const now = new Date()
  if (licence.expiryDate < now) return 'expired'
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (licence.expiryDate.getTime() - now.getTime() < thirtyDays) return 'expiring'
  return 'valid'
}
