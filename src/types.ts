export interface License {
  id: string
  software: string
  key: string
  type: "personal" | "team" | "family" | "enterprise"
  expiresAt: Date | null // null = perpetual
  notes?: string
}

export type LicenseType = License["type"]
