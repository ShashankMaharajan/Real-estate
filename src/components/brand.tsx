import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 36" fill="none" aria-hidden="true">
      <path
        d="M3 31V14L16 4l13 10v17M9 31V18l7-5 7 5v13M16 22v9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M1 32h30" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** The Aangan logo, linking home. Size it with a text-* class; the mark scales with it. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("brand", className)} aria-label="Aangan home">
      <BrandMark />
      aangan.
    </Link>
  );
}
