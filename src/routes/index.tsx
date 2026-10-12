import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Compass,
  Handshake,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactBand } from "@/components/contact-band";
import { FilterSelect } from "@/components/filter-select";
import { BrandMark } from "@/components/brand";
import { SectionHeading } from "@/components/headings";
import { PropertyCard } from "@/components/property-card";
import { properties, typePluralLabels, type PropertyType } from "@/data/properties";
import { pageMeta } from "@/lib/page-meta";
import {
  budgetOptions,
  cityOptions,
  propertySearchSchema,
  typeOptions,
} from "@/lib/property-search";
import home from "@/assets/kathmandu-home.jpg";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "A place to call home in Nepal",
      "Discover homes, apartments and land in Nepal with Aangan. Thoughtful real estate guidance for your next chapter.",
    ),
  component: Index,
});

const featured = properties.filter((p) => p.featured);

const typeTiles: { type: PropertyType; icon: typeof Home; copy: string }[] = [
  { type: "house", icon: Home, copy: "Family homes with gardens, from Bhaisepati to Baluwatar." },
  { type: "apartment", icon: Building2, copy: "Lift-access living, close to the city." },
  { type: "land", icon: Sprout, copy: "Plots to build on, measured in ropani and aana." },
];

const values = [
  {
    icon: Compass,
    title: "Local perspective",
    copy: "A thoughtful understanding of Nepal’s neighborhoods and property landscape.",
  },
  {
    icon: ShieldCheck,
    title: "Clarity at every step",
    copy: "Straightforward advice, careful checks, and no unnecessary surprises.",
  },
  {
    icon: Handshake,
    title: "People before property",
    copy: "Your plans, your pace, and a place that truly fits your life.",
  },
];

function Index() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ city: "", type: "", budget: "" });
  const findProperties = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void navigate({ to: "/properties", search: propertySearchSchema.parse(filters) });
  };

  return (
    <>
      <section className="hero">
        <img
          src={home}
          className="hero-image"
          width={1536}
          height={1024}
          fetchPriority="high"
          alt="Contemporary Nepalese home with a landscaped garden and mountain views"
        />
        <div className="hero-content site-width reveal">
          <p className="eyebrow">Real estate · Nepal</p>
          <h1>
            A place to call
            <br />
            <em>home</em> in Nepal.
          </h1>
          <p>
            Homes, land, and possibilities. Find a space that feels like you, with people who
            understand.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild variant="inverse" size="lg">
              <Link to="/properties">
                Explore properties <ArrowUpRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="link"
              size="inline"
              className="text-sm text-on-image focus-visible:ring-on-image focus-visible:ring-offset-transparent"
            >
              <Link to="/about">
                Our story <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <p className="hero-note">
          <MapPin className="size-3.5" aria-hidden /> Bhaisepati, Lalitpur
        </p>
      </section>

      <form
        className="dock filter-bar site-width -mt-16"
        onSubmit={findProperties}
        aria-label="Find a property"
      >
        <FilterSelect
          id="location"
          label="Location"
          placeholder="All locations"
          options={cityOptions}
          value={filters.city}
          onChange={(city) => setFilters({ ...filters, city })}
        />
        <FilterSelect
          id="type"
          label="Property type"
          placeholder="All properties"
          options={typeOptions}
          value={filters.type}
          onChange={(type) => setFilters({ ...filters, type })}
        />
        <FilterSelect
          id="budget"
          label="Budget"
          placeholder="Any budget"
          options={budgetOptions}
          value={filters.budget}
          onChange={(budget) => setFilters({ ...filters, budget })}
        />
        <Button type="submit" size="lg">
          <Search />
          Find a property
        </Button>
      </form>

      <section className="site-width section">
        <div className="mb-10 flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Spaces with possibility"
            title={
              <>
                A few places you’ll <em>love</em>.
              </>
            }
          />
          <Button asChild variant="outline" className="hidden md:inline-flex">
            <Link to="/properties">
              View all {properties.length} properties <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-3">
          {featured.map((p) => (
            <PropertyCard key={p.slug} property={p} />
          ))}
        </div>
        <Button asChild variant="outline" size="lg" className="mt-10 w-full md:hidden">
          <Link to="/properties">
            View all {properties.length} properties <ArrowUpRight />
          </Link>
        </Button>
        <p className="mt-8 text-xs text-muted-foreground">
          Illustrative properties and prices · Actual availability to be confirmed.
        </p>
      </section>

      <section className="site-width pb-24 md:pb-32">
        <SectionHeading
          eyebrow="Browse by type"
          className="mb-10"
          title={
            <>
              Start with what you <em>need</em>.
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-[1.25fr_1fr] md:grid-rows-2">
          {typeTiles.map(({ type, icon: Icon, copy }, i) => {
            const count = properties.filter((p) => p.type === type).length;
            return (
              <Link
                key={type}
                to="/properties"
                search={{ type }}
                className={`type-tile group reveal-on-scroll ${i === 0 ? "type-tile--feature md:row-span-2" : ""}`}
              >
                {i === 0 && (
                  <span className="type-tile-mark">
                    <BrandMark />
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <Icon className="size-7" strokeWidth={1.25} aria-hidden />
                  <span className="icon-circle">
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </div>
                <div>
                  <p className="type-tile-count">{count}</p>
                  <p className="mt-3 text-lg font-medium">{typePluralLabels[type]}</p>
                  <p className="mt-1 max-w-xs text-sm opacity-75">{copy}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y bg-muted">
        <div className="site-width section">
          <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
            <div>
              <SectionHeading
                eyebrow="More than real estate"
                title={
                  <>
                    Local roots.
                    <br />
                    <em>Personal</em> connections.
                  </>
                }
              />
              <p className="body-copy mt-6 max-w-sm">
                Aangan means courtyard — a place where life happens. We bring that same sense of
                belonging to every property journey.
              </p>
              <Button asChild variant="link" size="inline" className="mt-4 text-sm">
                <Link to="/about">
                  Get to know us <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {values.map((v) => (
                <div key={v.title} className="reveal-on-scroll border-t pt-6">
                  <span className="icon-circle mb-8 text-primary">
                    <v.icon className="size-5" strokeWidth={1.5} aria-hidden />
                  </span>
                  <h3>{v.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{v.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ContactBand />
    </>
  );
}
