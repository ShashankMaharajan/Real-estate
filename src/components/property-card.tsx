import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bath, BedDouble, Compass, MapPin, Maximize, Signpost } from "lucide-react";
import { cityLabels, statusLabels, typeLabels, type Property } from "@/data/properties";
import { formatLandArea, formatPrice, formatSqFt } from "@/lib/format";

function cardFacts(p: Property) {
  if (p.type === "land") {
    return [
      { icon: Maximize, text: formatLandArea(p.landAana ?? 0) },
      { icon: Signpost, text: `${p.roadAccessFt} ft road` },
      { icon: Compass, text: `${p.facing} facing` },
    ];
  }
  return [
    { icon: BedDouble, text: `${p.beds} beds` },
    { icon: Bath, text: `${p.baths} baths` },
    {
      icon: Maximize,
      text: p.landAana ? formatLandArea(p.landAana) : formatSqFt(p.builtUpSqFt ?? 0),
    },
  ];
}

/**
 * Listing summary. The title link stretches over the whole card, so the card is
 * one click target and one tab stop.
 */
export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <article className="property-card group">
      <div className="property-media">
        <img
          className="property-image"
          src={p.image}
          alt=""
          width={1024}
          height={683}
          loading="lazy"
          decoding="async"
          style={{ viewTransitionName: `property-${p.slug}` }}
        />
        <span className="property-label" data-status={p.status}>
          {statusLabels[p.status]} · {typeLabels[p.type]}
        </span>
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden />
        {p.neighbourhood}, {cityLabels[p.city]}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3>
          <Link to="/properties/$slug" params={{ slug: p.slug }} className="property-link">
            {p.name}
          </Link>
        </h3>
        <ArrowUpRight
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        />
      </div>
      <ul className="property-facts">
        {cardFacts(p).map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon className="size-3.5" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-primary">
        {formatPrice(p.price)}
        {p.pricePerAana ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {formatPrice(p.pricePerAana)} / aana
          </span>
        ) : null}
      </p>
    </article>
  );
}
