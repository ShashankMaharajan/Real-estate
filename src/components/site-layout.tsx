import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { propertyTypes, typePluralLabels } from "@/data/properties";
import { Wordmark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/about", label: "About us" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-width flex h-18 items-center justify-between">
        <Wordmark />
        <nav aria-label="Main navigation" className="hidden items-center gap-9 md:flex">
          {navigation.map((n) => (
            <Link key={n.to} to={n.to} className="nav-link" activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild className="hidden md:inline-flex">
            <Link to="/contact">
              Let’s talk <ArrowUpRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full flex flex-col border-b bg-background px-6 py-4 shadow-[var(--elevation-soft)] md:hidden"
        >
          {navigation.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="nav-link"
              activeOptions={{ exact: n.to === "/" }}
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="overflow-hidden border-t">
      <div className="site-width grid gap-12 pt-20 pb-14 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <p className="statement max-w-sm text-4xl leading-tight">
            A place for new <em>beginnings</em>.
          </p>
          <p className="body-copy mt-4 max-w-xs">
            Homes, apartments and land across the Kathmandu Valley.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <p className="footer-heading">Explore</p>
          <ul className="footer-links">
            {navigation.slice(1).map((n) => (
              <li key={n.to}>
                <Link to={n.to}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="footer-heading">Browse</p>
          <ul className="footer-links">
            {propertyTypes.map((type) => (
              <li key={type}>
                <Link to="/properties" search={{ type }}>
                  {typePluralLabels[type]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="site-width flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground md:flex-row md:justify-between">
        <p>© 2026 Aangan Real Estate · Nepal</p>
        <p>Listings shown are illustrative.</p>
      </div>
      <p className="footer-wordmark" aria-hidden="true">
        aangan.
      </p>
    </footer>
  );
}
