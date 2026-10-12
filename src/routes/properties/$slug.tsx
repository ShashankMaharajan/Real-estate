import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/headings";
import { PropertyCard } from "@/components/property-card";
import {
  cityLabels,
  getProperty,
  getSimilarProperties,
  statusLabels,
  typeLabels,
  type Property,
} from "@/data/properties";
import { aanaToSqFt, formatLandArea, formatPrice, formatSqFt, groupDigits } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { phoneLink, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/properties/$slug")({
  loader: ({ params }) => {
    const property = getProperty(params.slug);
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageMeta(
          `${loaderData.property.name} in ${loaderData.property.neighbourhood}`,
          loaderData.property.summary,
        )
      : {},
  component: PropertyPage,
});

function keyDetails(p: Property) {
  const rows: { label: string; value: string }[] = [];
  if (p.landAana) {
    rows.push({
      label: "Land area",
      value: `${formatLandArea(p.landAana)} (≈ ${formatSqFt(aanaToSqFt(p.landAana))})`,
    });
  }
  if (p.builtUpSqFt) rows.push({ label: "Built-up area", value: formatSqFt(p.builtUpSqFt) });
  if (p.beds) rows.push({ label: "Bedrooms", value: String(p.beds) });
  if (p.baths) rows.push({ label: "Bathrooms", value: String(p.baths) });
  if (p.floors) rows.push({ label: p.type === "apartment" ? "Floor" : "Storeys", value: p.floors });
  if (p.parking) rows.push({ label: "Parking", value: p.parking });
  rows.push(
    { label: "Road access", value: `${p.roadAccessFt} ft` },
    { label: "Facing", value: p.facing },
    { label: "Water", value: p.water },
    { label: "To Ring Road", value: `${p.ringRoadKm} km` },
    { label: "Documents", value: p.documents },
  );
  return rows;
}

function mapUrls({ lat, lng }: Property["coordinates"]) {
  const bbox = [lng - 0.012, lat - 0.007, lng + 0.012, lat + 0.007].map((n) => n.toFixed(4));
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join("%2C")}&layer=mapnik`,
    link: `https://www.openstreetmap.org/#map=15/${lat}/${lng}`,
  };
}

function PropertyPage() {
  const { property: p } = Route.useLoaderData();
  const similar = getSimilarProperties(p);
  const map = mapUrls(p.coordinates);
  const location = `${p.neighbourhood}, ${cityLabels[p.city]}`;
  const whatsapp = whatsappLink(`Hi Aangan, I'm interested in "${p.name}" in ${location}.`);
  const phone = phoneLink();

  return (
    <>
      <article className="site-width section">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/properties" className="hover:text-primary">
                Properties
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link to="/properties" search={{ city: p.city }} className="hover:text-primary">
                {cityLabels[p.city]}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li aria-current="page" className="text-foreground">
              {p.name}
            </li>
          </ol>
        </nav>

        <header className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-4 text-primary">
              {statusLabels[p.status]} · {typeLabels[p.type]}
            </p>
            <h1 className="max-w-3xl text-heading">{p.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {location}
            </p>
          </div>
          <div className="md:text-right">
            <p className="font-serif text-4xl text-primary">{formatPrice(p.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.pricePerAana ? `${formatPrice(p.pricePerAana)} per aana · ` : ""}NPR{" "}
              {groupDigits(p.price)}
            </p>
          </div>
        </header>

        <img
          src={p.image}
          alt={p.imageAlt}
          width={1536}
          height={864}
          fetchPriority="high"
          className="mt-10 aspect-video w-full object-cover"
          style={{ viewTransitionName: `property-${p.slug}` }}
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <h2 className="text-title">About the property</h2>
            <div className="body-copy mt-6 max-w-2xl space-y-4">
              {p.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <h3 className="mt-12">Highlights</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>

            <h3 className="mt-12">Key details</h3>
            <dl className="spec-list mt-4">
              {keyDetails(p).map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-12">Location</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Approximate area shown. We share the exact location when you enquire.
            </p>
            <iframe
              title={`Map of ${location}`}
              src={map.embed}
              loading="lazy"
              className="map-frame mt-4"
            />
            <Button asChild variant="link" size="inline" className="mt-2">
              <a href={map.link} target="_blank" rel="noreferrer">
                Open larger map <ArrowUpRight />
              </a>
            </Button>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="border bg-secondary p-6">
              <p className="eyebrow text-primary">Interested?</p>
              <p className="mt-4 font-serif text-3xl text-primary">{formatPrice(p.price)}</p>
              <p className="body-copy mt-3">
                Ask about viewings, documents or the neighbourhood — we’ll come back to you with the
                details.
              </p>
              <div className="mt-6 grid gap-3">
                <Button asChild size="lg">
                  <Link to="/contact" search={{ property: p.slug }}>
                    Enquire about this property <ArrowUpRight />
                  </Link>
                </Button>
                {whatsapp && (
                  <Button asChild variant="outline" size="lg">
                    <a href={whatsapp} target="_blank" rel="noreferrer">
                      <MessageCircle /> Chat on WhatsApp
                    </a>
                  </Button>
                )}
                {phone && (
                  <Button asChild variant="outline" size="lg">
                    <a href={phone}>
                      <Phone /> Call us
                    </a>
                  </Button>
                )}
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Illustrative listing. Availability and pricing are not confirmed.
              </p>
            </div>
          </aside>
        </div>
      </article>

      {similar.length > 0 && (
        <section className="border-t bg-muted">
          <div className="site-width section">
            <SectionHeading
              eyebrow="You might also like"
              title="Similar places."
              className="mb-8"
            />
            <div className="grid gap-8 md:grid-cols-3">
              {similar.map((s) => (
                <PropertyCard key={s.slug} property={s} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
