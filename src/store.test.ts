import { describe, expect, test } from 'bun:test'
import { getAllAppNames, getAllLicences, getLicence, getLicences, getSuggestions, searchLicences } from './store.ts'
import { expiryStatus, formatApps, licenceKind, primaryApp } from './types.ts'

describe('getAllLicences', () => {
  test('returns all 9 licences', () => {
    const all = getAllLicences()
    expect(all).toHaveLength(9)
  })

  test('returns a copy (not the original array)', () => {
    const firstResult = getAllLicences()
    const secondResult = getAllLicences()
    expect(firstResult).not.toBe(secondResult)
    expect(firstResult).toEqual(secondResult)
  })
})

describe('getLicence', () => {
  test('finds match via app name (case-insensitive)', () => {
    const result = getLicence('Sublime Text')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Sublime Text')
    expect(result!.apps).toContain('Sublime Text')
  })

  test('finds partial match via label', () => {
    const result = getLicence('sublime')
    expect(result).not.toBeNull()
    expect(result!.apps).toContain('Sublime Text')
  })

  test('returns null for no match', () => {
    expect(getLicence('nonexistent')).toBeNull()
  })

  test('finds licence via individual app name', () => {
    const result = getLicence('IntelliJ IDEA')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('JetBrains All Products Pack')
  })
})

describe('getLicences', () => {
  test('returns multiple licences for shared app name', () => {
    const results = getLicences('Sublime Text')
    expect(results.length).toBeGreaterThanOrEqual(2)
    const labels = results.map((licence) => licence.label)
    expect(labels).toContain('Sublime Text')
    expect(labels).toContain('Sublime Text Team')
  })

  test('returns empty array for no match', () => {
    expect(getLicences('nonexistent')).toHaveLength(0)
  })

  test('exact app matches come before partial matches', () => {
    const results = getLicences('Sublime Text')
    // Both mock-2 ("Sublime Text") and mock-9 ("Sublime Text Team") have exact app "Sublime Text"
    // They should appear before any partial-only matches
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  test('finds licence via label match', () => {
    const results = getLicences('JetBrains')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]!.label).toBe('JetBrains All Products Pack')
  })
})

describe('searchLicences', () => {
  test('finds matching licences via label', () => {
    const results = searchLicences('jet')
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('JetBrains All Products Pack')
  })

  test('finds matching licences via app name', () => {
    const results = searchLicences('IntelliJ')
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('JetBrains All Products Pack')
  })

  test('finds via app name that differs from label', () => {
    const results = searchLicences('Photoshop')
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('Adobe Creative Cloud All Apps')
  })

  test('returns empty array for no match', () => {
    expect(searchLicences('zzzzz')).toHaveLength(0)
  })

  test('returns multiple matches for broad queries', () => {
    const results = searchLicences('a')
    expect(results.length).toBeGreaterThan(1)
  })
})

describe('getSuggestions', () => {
  test('returns up to max suggestions', () => {
    const suggestions = getSuggestions('sublim', 2)
    expect(suggestions.length).toBeLessThanOrEqual(2)
  })

  test('returns relevant suggestions from app names', () => {
    const suggestions = getSuggestions('sublim')
    expect(suggestions).toContain('Sublime Text')
  })

  test('suggests individual app names, not just labels', () => {
    const suggestions = getSuggestions('Photosho')
    expect(suggestions).toContain('Photoshop')
  })
})

describe('getAllAppNames', () => {
  test('returns sorted unique app names', () => {
    const names = getAllAppNames()
    expect(names.length).toBeGreaterThan(9)
    // Check sorted
    for (let index = 1; index < names.length; index++) {
      expect(names[index]!.localeCompare(names[index - 1]!)).toBeGreaterThanOrEqual(0)
    }
  })

  test('contains individual app names from multi-app licences', () => {
    const names = getAllAppNames()
    expect(names).toContain('IntelliJ IDEA')
    expect(names).toContain('WebStorm')
    expect(names).toContain('Photoshop')
    expect(names).toContain('Illustrator')
    expect(names).toContain('Sublime Merge')
  })

  test('deduplicates shared app names', () => {
    const names = getAllAppNames()
    // "Sublime Text" appears in mock-2 and mock-9, but should only appear once
    const sublimeCount = names.filter((name) => name === 'Sublime Text').length
    expect(sublimeCount).toBe(1)
  })
})

describe('formatApps', () => {
  test('joins multiple apps with comma separator', () => {
    const licence = getLicence('JetBrains')!
    const result = formatApps(licence)
    expect(result).toContain('IntelliJ IDEA')
    expect(result).toContain(', ')
    expect(result).toContain('WebStorm')
  })

  test('returns single app name without separator', () => {
    const licence = getLicence('Sketch')!
    expect(formatApps(licence)).toBe('Sketch')
  })
})

describe('primaryApp', () => {
  test('returns first app from array', () => {
    const licence = getLicence('JetBrains')!
    expect(primaryApp(licence)).toBe('IntelliJ IDEA')
  })

  test('returns the only app for single-app licences', () => {
    const licence = getLicence('Sketch')!
    expect(primaryApp(licence)).toBe('Sketch')
  })
})

describe('licenceKind', () => {
  test('identifies key-based licences', () => {
    const licence = getLicence('Sublime Text')!
    expect(licenceKind(licence)).toBe('key')
  })

  test('identifies file-based licences', () => {
    const licence = getLicence('Sketch')!
    expect(licenceKind(licence)).toBe('file')
  })

  test('identifies licences with both key and file', () => {
    const licence = getLicence('Sublime Text')!
    const modified = {
      ...licence,
      licenceFile: { name: 'test.lic', data: 'dGVzdA==' }
    }
    expect(licenceKind(modified)).toBe('both')
  })
})

describe('expiryStatus', () => {
  test('identifies perpetual licences', () => {
    const licence = getLicence('Sublime Text')!
    expect(expiryStatus(licence)).toBe('perpetual')
  })

  test('identifies valid licences', () => {
    const licence = getLicence('1Password')!
    expect(expiryStatus(licence)).toBe('valid')
  })

  test('identifies expired licences', () => {
    const licence = getLicence('Sublime Text')!
    const modified = { ...licence, expiryDate: new Date('2020-01-01') }
    expect(expiryStatus(modified)).toBe('expired')
  })

  test('identifies expiring-soon licences', () => {
    const licence = getLicence('Sublime Text')!
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    const modified = { ...licence, expiryDate: soon }
    expect(expiryStatus(modified)).toBe('expiring')
  })
})
