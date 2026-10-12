import { describe, expect, it } from "vitest";

import { getProperty, getSimilarProperties, properties } from "@/data/properties";
import { aanaToSqFt, formatLandArea, formatPrice, groupDigits } from "@/lib/format";
import { propertySearchSchema, searchProperties } from "@/lib/property-search";
import { emailLink, whatsappLink } from "@/lib/site";

describe("formatting", () => {
  it("groups digits in lakh/crore style", () => {
    expect(groupDigits(999)).toBe("999");
    expect(groupDigits(1450)).toBe("1,450");
    expect(groupDigits(123456)).toBe("1,23,456");
    expect(groupDigits(45_000_000)).toBe("4,50,00,000");
  });
  it("shortens prices to crore and lakh", () => {
    expect(formatPrice(45_000_000)).toBe("NPR 4.5 Cr");
    expect(formatPrice(18_500_000)).toBe("NPR 1.85 Cr");
    expect(formatPrice(3_500_000)).toBe("NPR 35 L");
    expect(formatPrice(85_000)).toBe("NPR 85,000");
  });
  it("writes land area in ropani, aana and paisa", () => {
    expect(formatLandArea(6)).toBe("6 aana");
    expect(formatLandArea(16)).toBe("1 ropani");
    expect(formatLandArea(20)).toBe("1 ropani 4 aana");
    expect(formatLandArea(5.5)).toBe("5 aana 2 paisa");
    expect(aanaToSqFt(16)).toBe(5476);
  });
});

describe("property search", () => {
  it("drops unknown or malformed URL values instead of failing", () => {
    expect(propertySearchSchema.parse({ city: "pokhara", type: "land", budget: 7 })).toEqual({
      type: "land",
    });
  });
  it("filters by city, type and budget", () => {
    const results = searchProperties(properties, { city: "lalitpur", budget: "under-2cr" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.city === "lalitpur" && p.price < 20_000_000)).toBe(true);
    expect(searchProperties(properties, { type: "land" }).every((p) => p.type === "land")).toBe(
      true,
    );
  });
  it("sorts newest first by default, or by price", () => {
    const newest = searchProperties(properties, {}).map((p) => p.listedOn);
    expect(newest).toEqual([...newest].sort().reverse());
    const cheapest = searchProperties(properties, { sort: "price-asc" }).map((p) => p.price);
    expect(cheapest).toEqual([...cheapest].sort((a, b) => a - b));
  });
  it("does not reorder the source list", () => {
    const before = properties.map((p) => p.slug);
    searchProperties(properties, { sort: "price-desc" });
    expect(properties.map((p) => p.slug)).toEqual(before);
  });
});

describe("listings data", () => {
  it("has unique slugs", () => {
    const slugs = properties.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("suggests similar listings without the current one", () => {
    const property = getProperty("bhaisepati-family-home")!;
    const similar = getSimilarProperties(property);
    expect(similar).toHaveLength(3);
    expect(similar).not.toContain(property);
    expect(similar[0]?.type).toBe(property.type);
  });
});

describe("contact channels", () => {
  it("hides send buttons until contact details are configured", () => {
    expect(whatsappLink("Hello")).toBeNull();
    expect(emailLink("Subject", "Body")).toBeNull();
  });
});
