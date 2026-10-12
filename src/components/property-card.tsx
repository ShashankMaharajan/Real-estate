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
    <article className="property-card group reveal-on-scroll">
      <div className="property-media">
        <img
          className="property-image"
          src={p.image}
          alt=""
          width={1024}
          height={768}
          loading="lazy"
          decoding="async"
          style={{ viewTransitionName: `property-${p.slug}` }}
        />
        <span className="property-label" data-status={p.status}>
          {statusLabels[p.status]} · {typeLabels[p.type]}
        </span>
        <span className="property-cta" aria-hidden>
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden />
        {p.neighbourhood}, {cityLabels[p.city]}
      </p>
      <h3 className="mt-2">
        <Link to="/properties/$slug" params={{ slug: p.slug }} className="property-link">
          {p.name}
        </Link>
      </h3>
      <ul className="property-facts">
        {cardFacts(p).map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon className="size-3.5" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
      <p className="property-price">
        {formatPrice(p.price)}
        {p.pricePerAana ? <small>{formatPrice(p.pricePerAana)} / aana</small> : null}
      </p>
    </article>
  );
}
