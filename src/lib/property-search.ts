import { z } from "zod";
import { cities, cityLabels, propertyTypes, typeLabels, type Property } from "@/data/properties";

export const budgets = ["under-2cr", "2-4cr", "4cr-plus"] as const;
export const sorts = ["newest", "price-asc", "price-desc"] as const;
export type Budget = (typeof budgets)[number];
export type Sort = (typeof sorts)[number];

const budgetRanges: Record<Budget, { label: string; min: number; max: number }> = {
  "under-2cr": { label: "Under NPR 2 Cr", min: 0, max: 20_000_000 },
  "2-4cr": { label: "NPR 2–4 Cr", min: 20_000_000, max: 40_000_000 },
  "4cr-plus": { label: "NPR 4 Cr and above", min: 40_000_000, max: Infinity },
};
const sortLabels: Record<Sort, string> = {
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export const cityOptions = cities.map((value) => ({ value, label: cityLabels[value] }));
export const typeOptions = propertyTypes.map((value) => ({ value, label: typeLabels[value] }));
export const budgetOptions = budgets.map((value) => ({ value, label: budgetRanges[value].label }));
export const sortOptions = sorts.map((value) => ({ value, label: sortLabels[value] }));

/**
 * The /properties URL search params. Unknown or malformed values are dropped
 * instead of erroring, so a mistyped shared link still shows listings.
 */
export const propertySearchSchema = z.object({
  city: z.enum(cities).optional().catch(undefined),
  type: z.enum(propertyTypes).optional().catch(undefined),
  budget: z.enum(budgets).optional().catch(undefined),
  sort: z.enum(sorts).optional().catch(undefined),
});
export type PropertySearch = z.infer<typeof propertySearchSchema>;

export function searchProperties(list: readonly Property[], search: PropertySearch): Property[] {
  const range = search.budget ? budgetRanges[search.budget] : undefined;
  const sort = search.sort ?? "newest";
  return list
    .filter(
      (p) =>
        (!search.city || p.city === search.city) &&
        (!search.type || p.type === search.type) &&
        (!range || (p.price >= range.min && p.price < range.max)),
    )
    .sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return b.listedOn.localeCompare(a.listedOn);
    });
}

export const hasActiveFilters = (search: PropertySearch) =>
  Boolean(search.city || search.type || search.budget);
