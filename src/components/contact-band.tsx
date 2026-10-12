import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/headings";

export function ContactBand() {
  return (
    <section className="bg-secondary py-14">
      <div className="site-width flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <SectionHeading
          eyebrow="Your next chapter"
          title="Good things begin with a conversation."
        />
        <Button asChild size="lg">
          <Link to="/contact">
            Let’s find your place <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
