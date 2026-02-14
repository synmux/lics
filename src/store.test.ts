import { test, expect, describe } from "bun:test"
import { searchLicenses, getAllLicenses, getLicense, getSuggestions } from "./store.ts"
import { licenseKind, expiryStatus } from "./types.ts"

describe("getAllLicenses", () => {
  test("returns all 8 licenses", () => {
    const all = getAllLicenses()
    expect(all).toHaveLength(8)
  })

  test("returns a copy (not the original array)", () => {
    const a = getAllLicenses()
    const b = getAllLicenses()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe("getLicense", () => {
  test("finds exact match (case-insensitive)", () => {
    const result = getLicense("Sublime Text")
    expect(result).not.toBeNull()
    expect(result!.app).toBe("Sublime Text")
  })

  test("finds partial match", () => {
    const result = getLicense("sublime")
    expect(result).not.toBeNull()
    expect(result!.app).toBe("Sublime Text")
  })

  test("returns null for no match", () => {
    expect(getLicense("nonexistent")).toBeNull()
  })

  test("prefers exact match over partial", () => {
    const result = getLicense("sketch")
    expect(result).not.toBeNull()
    expect(result!.app).toBe("Sketch")
  })
})

describe("searchLicenses", () => {
  test("finds matching licenses", () => {
    const results = searchLicenses("jet")
    expect(results).toHaveLength(1)
    expect(results[0]!.app).toBe("JetBrains All Products Pack")
  })

  test("returns empty array for no match", () => {
    expect(searchLicenses("zzzzz")).toHaveLength(0)
  })

  test("returns multiple matches for broad queries", () => {
    const results = searchLicenses("a")
    expect(results.length).toBeGreaterThan(1)
  })
})

describe("getSuggestions", () => {
  test("returns up to max suggestions", () => {
    const suggestions = getSuggestions("sublim", 2)
    expect(suggestions.length).toBeLessThanOrEqual(2)
  })

  test("returns relevant suggestions", () => {
    const suggestions = getSuggestions("sublim")
    expect(suggestions).toContain("Sublime Text")
  })
})

describe("licenseKind", () => {
  test("identifies key-based licenses", () => {
    const license = getLicense("Sublime Text")!
    expect(licenseKind(license)).toBe("key")
  })

  test("identifies file-based licenses", () => {
    const license = getLicense("Sketch")!
    expect(licenseKind(license)).toBe("file")
  })

  test("identifies licenses with both key and file", () => {
    // None in our mock data have both, but test the function
    const license = getLicense("Sublime Text")!
    const modified = { ...license, licenseFile: { name: "test.lic", data: "dGVzdA==" } }
    expect(licenseKind(modified)).toBe("both")
  })
})

describe("expiryStatus", () => {
  test("identifies perpetual licenses", () => {
    const license = getLicense("Sublime Text")!
    expect(expiryStatus(license)).toBe("perpetual")
  })

  test("identifies valid licenses", () => {
    const license = getLicense("1Password")!
    expect(expiryStatus(license)).toBe("valid")
  })

  test("identifies expired licenses", () => {
    const license = getLicense("Sublime Text")!
    const modified = { ...license, expiryDate: new Date("2020-01-01") }
    expect(expiryStatus(modified)).toBe("expired")
  })

  test("identifies expiring-soon licenses", () => {
    const license = getLicense("Sublime Text")!
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    const modified = { ...license, expiryDate: soon }
    expect(expiryStatus(modified)).toBe("expiring")
  })
})
