import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="relative z-20 bg-background">
      <div className="site-width flex h-22 items-center justify-between">
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
          <Button variant="outline" asChild className="hidden text-xs md:inline-flex">
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
          className="absolute inset-x-0 top-full flex flex-col border-b bg-background px-6 py-4 md:hidden"
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
    <footer className="border-t">
      <div className="site-width flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Wordmark className="text-2xl" />
          <p className="mt-3 text-xs text-muted-foreground">A place for new beginnings.</p>
        </div>
        <nav className="flex flex-wrap gap-6" aria-label="Footer navigation">
          {navigation.slice(1).map((n) => (
            <Link className="text-xs text-muted-foreground hover:text-primary" key={n.to} to={n.to}>
              {n.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">© 2026 Aangan Real Estate · Nepal</p>
      </div>
    </footer>
  );
}
