import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Handshake,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactBand } from "@/components/contact-band";
import { FilterSelect } from "@/components/filter-select";
import { SectionHeading } from "@/components/headings";
import { PropertyCard } from "@/components/property-card";
import { properties } from "@/data/properties";
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
          <p className="eyebrow">Aangan real estate · Nepal</p>
          <h1>
            A place to call
            <br />
            home in Nepal.
          </h1>
          <p>
            Homes, land, and possibilities. Find a space that feels like you, with people who
            understand.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <Button asChild variant="inverse" size="lg">
              <Link to="/properties">
                Explore properties <ArrowUpRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="link"
              size="inline"
              className="text-primary-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-transparent"
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
        className="filter-bar site-width"
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
        <div className="mb-8 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Spaces with possibility" title="A few places you’ll love." />
          <Button asChild variant="link" size="inline" className="hidden md:flex">
            <Link to="/properties">
              View all properties <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {featured.map((p) => (
            <PropertyCard key={p.slug} property={p} />
          ))}
        </div>
        <Button asChild variant="outline" size="lg" className="mt-8 w-full md:hidden">
          <Link to="/properties">
            View all {properties.length} properties <ArrowUpRight />
          </Link>
        </Button>
        <p className="mt-6 text-xs text-muted-foreground">
          Illustrative properties and prices · Actual availability to be confirmed.
        </p>
      </section>

      <section className="border-t bg-muted">
        <div className="site-width section">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <div>
              <SectionHeading
                eyebrow="More than real estate"
                title={
                  <>
                    Local roots.
                    <br />
                    Personal connections.
                  </>
                }
              />
              <p className="body-copy mt-5 max-w-sm">
                Aangan means courtyard — a place where life happens. We bring that same sense of
                belonging to every property journey.
              </p>
              <Button asChild variant="link" size="inline" className="mt-4">
                <Link to="/about">
                  Get to know us <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              {values.map((v) => (
                <div key={v.title}>
                  <v.icon className="mb-6 size-7 text-primary" strokeWidth={1.25} aria-hidden />
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
