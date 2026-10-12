import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, Home, KeyRound, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactBand } from "@/components/contact-band";
import { PageIntro } from "@/components/headings";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/services")({
  head: () =>
    pageMeta(
      "Our services",
      "Explore Aangan’s property buying, selling, land and investment guidance for homes and real estate in Nepal.",
    ),
  component: Services,
});

const services = [
  {
    icon: Home,
    title: "Find your home",
    text: "Explore houses and apartments that match your location, lifestyle, and budget.",
    items: [
      "A considered property shortlist",
      "Neighborhood and viewing guidance",
      "Support through your buying journey",
    ],
  },
  {
    icon: KeyRound,
    title: "Sell your property",
    text: "Present your property thoughtfully and connect with people looking for a place like yours.",
    items: [
      "Property positioning and pricing guidance",
      "Listing presentation and marketing",
      "Viewing and negotiation coordination",
    ],
  },
  {
    icon: Sprout,
    title: "Land & new possibilities",
    text: "Find a plot with the potential to become a home, a project, or a long-term investment.",
    items: [
      "Residential land search",
      "Location and access considerations",
      "Coordination of document review",
    ],
  },
  {
    icon: Building2,
    title: "Property consultation",
    text: "Get a clearer picture of your options before making your next real estate decision.",
    items: [
      "Buy-versus-invest conversations",
      "Local property market perspective",
      "Personalized next-step planning",
    ],
  },
];

function Services() {
  return (
    <>
      <section className="site-width section reveal">
        <PageIntro
          eyebrow="How we can help"
          title={
            <>
              Your next move,
              <br />
              thoughtfully <em>guided</em>.
            </>
          }
        >
          From a first conversation to the right property, we make room for your questions and help
          you move forward with clarity.
        </PageIntro>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <article key={s.title} className="surface-card reveal-on-scroll p-8 md:p-10">
              <span className="icon-circle mb-8 text-primary">
                <s.icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <h2 className="text-4xl">{s.title}</h2>
              <p className="body-copy mt-4 max-w-md">{s.text}</p>
              <ul className="mt-5 space-y-3">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-primary" aria-hidden>
                      —
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              <Button variant="link" size="inline" asChild className="mt-6">
                <Link to="/contact">
                  Let’s discuss your plans <ArrowUpRight />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
      <ContactBand />
    </>
  );
}
