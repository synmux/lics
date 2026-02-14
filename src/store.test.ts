import { test, expect, describe } from "bun:test";
import {
  searchLicences,
  getAllLicences,
  getLicence,
  getSuggestions,
} from "./store.ts";
import { licenceKind, expiryStatus } from "./types.ts";

describe("getAllLicences", () => {
  test("returns all 8 licences", () => {
    const all = getAllLicences();
    expect(all).toHaveLength(8);
  });

  test("returns a copy (not the original array)", () => {
    const a = getAllLicences();
    const b = getAllLicences();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("getLicence", () => {
  test("finds exact match (case-insensitive)", () => {
    const result = getLicence("Sublime Text");
    expect(result).not.toBeNull();
    expect(result!.app).toBe("Sublime Text");
  });

  test("finds partial match", () => {
    const result = getLicence("sublime");
    expect(result).not.toBeNull();
    expect(result!.app).toBe("Sublime Text");
  });

  test("returns null for no match", () => {
    expect(getLicence("nonexistent")).toBeNull();
  });

  test("prefers exact match over partial", () => {
    const result = getLicence("sketch");
    expect(result).not.toBeNull();
    expect(result!.app).toBe("Sketch");
  });
});

describe("searchLicences", () => {
  test("finds matching licences", () => {
    const results = searchLicences("jet");
    expect(results).toHaveLength(1);
    expect(results[0]!.app).toBe("JetBrains All Products Pack");
  });

  test("returns empty array for no match", () => {
    expect(searchLicences("zzzzz")).toHaveLength(0);
  });

  test("returns multiple matches for broad queries", () => {
    const results = searchLicences("a");
    expect(results.length).toBeGreaterThan(1);
  });
});

describe("getSuggestions", () => {
  test("returns up to max suggestions", () => {
    const suggestions = getSuggestions("sublim", 2);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  test("returns relevant suggestions", () => {
    const suggestions = getSuggestions("sublim");
    expect(suggestions).toContain("Sublime Text");
  });
});

describe("licenceKind", () => {
  test("identifies key-based licences", () => {
    const licence = getLicence("Sublime Text")!;
    expect(licenceKind(licence)).toBe("key");
  });

  test("identifies file-based licences", () => {
    const licence = getLicence("Sketch")!;
    expect(licenceKind(licence)).toBe("file");
  });

  test("identifies licences with both key and file", () => {
    // None in our mock data have both, but test the function
    const licence = getLicence("Sublime Text")!;
    const modified = {
      ...licence,
      licenceFile: { name: "test.lic", data: "dGVzdA==" },
    };
    expect(licenceKind(modified)).toBe("both");
  });
});

describe("expiryStatus", () => {
  test("identifies perpetual licences", () => {
    const licence = getLicence("Sublime Text")!;
    expect(expiryStatus(licence)).toBe("perpetual");
  });

  test("identifies valid licences", () => {
    const licence = getLicence("1Password")!;
    expect(expiryStatus(licence)).toBe("valid");
  });

  test("identifies expired licences", () => {
    const licence = getLicence("Sublime Text")!;
    const modified = { ...licence, expiryDate: new Date("2020-01-01") };
    expect(expiryStatus(modified)).toBe("expired");
  });

  test("identifies expiring-soon licences", () => {
    const licence = getLicence("Sublime Text")!;
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const modified = { ...licence, expiryDate: soon };
    expect(expiryStatus(modified)).toBe("expiring");
  });
});
