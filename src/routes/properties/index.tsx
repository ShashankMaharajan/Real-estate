import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactBand } from "@/components/contact-band";
import { FilterSelect } from "@/components/filter-select";
import { PageIntro } from "@/components/headings";
import { PropertyCard } from "@/components/property-card";
import { properties } from "@/data/properties";
import { pageMeta } from "@/lib/page-meta";
import {
  budgetOptions,
  cityOptions,
  hasActiveFilters,
  propertySearchSchema,
  searchProperties,
  sortOptions,
  typeOptions,
  type PropertySearch,
} from "@/lib/property-search";

export const Route = createFileRoute("/properties/")({
  validateSearch: (search: Record<string, unknown>) => propertySearchSchema.parse(search),
  head: () =>
    pageMeta(
      "Properties for sale",
      "Browse homes, apartments and land for sale across the Kathmandu Valley with Aangan.",
    ),
  component: Properties,
});

function Properties() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const results = searchProperties(properties, search);
  // Filters live in the URL, so any search can be bookmarked or shared.
  const setFilter = (key: keyof PropertySearch) => (value: string) =>
    navigate({
      search: (prev) => propertySearchSchema.parse({ ...prev, [key]: value || undefined }),
      replace: true,
      resetScroll: false,
    });

  return (
    <>
      <section className="site-width section reveal">
        <PageIntro
          eyebrow="Properties"
          title={
            <>
              Find a place
              <br />
              that fits.
            </>
          }
        >
          Homes, apartments and land across the Kathmandu Valley. Filter by area, type and budget —
          and share the link with family when something catches your eye.
        </PageIntro>

        <div className="filter-bar mt-10 border-t md:grid-cols-4">
          <FilterSelect
            id="city"
            label="Location"
            placeholder="All locations"
            options={cityOptions}
            value={search.city ?? ""}
            onChange={setFilter("city")}
          />
          <FilterSelect
            id="type"
            label="Property type"
            placeholder="All properties"
            options={typeOptions}
            value={search.type ?? ""}
            onChange={setFilter("type")}
          />
          <FilterSelect
            id="budget"
            label="Budget"
            placeholder="Any budget"
            options={budgetOptions}
            value={search.budget ?? ""}
            onChange={setFilter("budget")}
          />
          <FilterSelect
            id="sort"
            label="Sort by"
            options={sortOptions}
            value={search.sort ?? "newest"}
            onChange={setFilter("sort")}
          />
        </div>

        <div className="mt-8 mb-8 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "property" : "properties"}
          </p>
          {hasActiveFilters(search) && (
            <Button asChild variant="link" size="inline">
              <Link to="/properties" search={search.sort ? { sort: search.sort } : {}}>
                Clear filters
              </Link>
            </Button>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PropertyCard key={p.slug} property={p} />
            ))}
          </div>
        ) : (
          <div className="border-y py-16 text-center">
            <h2 className="text-title">No matching properties.</h2>
            <p className="body-copy mx-auto mt-3 max-w-sm">
              Try another location, type or budget — or tell us what you’re after and we’ll keep an
              eye out.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/properties">Show all properties</Link>
              </Button>
              <Button asChild>
                <Link to="/contact">
                  Tell us what you need <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
        <p className="mt-10 text-xs text-muted-foreground">
          Illustrative properties and prices · Actual availability to be confirmed.
        </p>
      </section>
      <ContactBand />
    </>
  );
}
