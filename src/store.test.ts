import { test, expect, describe } from "bun:test"
import { searchLicenses, getAllLicenses, getLicense, getSuggestions } from "./store.ts"

describe("getAllLicenses", () => {
  test("returns all 6 licenses", () => {
    const all = getAllLicenses()
    expect(all).toHaveLength(6)
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
    expect(result!.software).toBe("Sublime Text")
  })

  test("finds partial match", () => {
    const result = getLicense("sublime")
    expect(result).not.toBeNull()
    expect(result!.software).toBe("Sublime Text")
  })

  test("returns null for no match", () => {
    expect(getLicense("nonexistent")).toBeNull()
  })

  test("prefers exact match over partial", () => {
    const result = getLicense("figma")
    expect(result).not.toBeNull()
    expect(result!.software).toBe("Figma")
  })
})

describe("searchLicenses", () => {
  test("finds matching licenses", () => {
    const results = searchLicenses("jet")
    expect(results).toHaveLength(1)
    expect(results[0]!.software).toBe("JetBrains All Products")
  })

  test("returns empty array for no match", () => {
    expect(searchLicenses("zzzzz")).toHaveLength(0)
  })

  test("returns multiple matches for broad queries", () => {
    // "a" appears in many names
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
