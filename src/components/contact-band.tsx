import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactBand() {
  return (
    <section className="site-width py-12 md:py-16">
      <div className="panel reveal-on-scroll px-7 py-14 md:px-16 md:py-20">
        <div className="relative flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-5">Your next chapter</p>
            <h2 className="max-w-2xl text-heading">
              Good things begin with a <em>conversation</em>.
            </h2>
          </div>
          <Button asChild variant="inverse" size="lg">
            <Link to="/contact">
              Let’s find your place <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
