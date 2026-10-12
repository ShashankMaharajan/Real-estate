import { createFileRoute } from "@tanstack/react-router";
import { ContactBand } from "@/components/contact-band";
import { PageIntro } from "@/components/headings";
import { pageMeta } from "@/lib/page-meta";
import home from "@/assets/kathmandu-home.jpg";

export const Route = createFileRoute("/about")({
  head: () =>
    pageMeta(
      "Our story",
      "Meet Aangan, a Nepal-focused real estate business built around local understanding, thoughtful guidance and a sense of belonging.",
    ),
  component: About,
});

const principles = [
  {
    number: "01",
    title: "Listen first",
    copy: "Your goals lead the way. We take time to understand the life you want to build.",
  },
  {
    number: "02",
    title: "Keep it clear",
    copy: "Honest conversations and thoughtful guidance make confident decisions possible.",
  },
  {
    number: "03",
    title: "Think long-term",
    copy: "The right property should work for today and leave room for tomorrow.",
  },
];

function About() {
  return (
    <>
      <section className="site-width section reveal">
        <PageIntro
          eyebrow="The Aangan story"
          title={
            <>
              Real estate with
              <br />a sense of belonging.
            </>
          }
        >
          A home is more than an address. It’s where your days unfold, your family grows, and your
          next chapter begins.
        </PageIntro>
        <img
          src={home}
          alt="A welcoming home nestled in a Nepalese neighborhood"
          width={1536}
          height={1024}
          className="mt-12 max-h-120 w-full object-cover"
        />
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <h2 className="text-title">
            Rooted in Nepal.
            <br />
            Built around you.
          </h2>
          <div className="body-copy space-y-5">
            <p>
              In Nepali, “aangan” means courtyard: the familiar space that brings a home together.
              That simple idea is at the heart of our approach.
            </p>
            <p>
              Whether you’re looking for a first home, a new investment, or land to build on, we
              believe your property journey should feel considered, clear, and personal.
            </p>
            <p>
              We focus on understanding what matters to you, helping you explore your options, and
              bringing a local perspective to every conversation.
            </p>
          </div>
        </div>
      </section>
      <section className="border-t bg-muted">
        <div className="site-width section grid gap-8 md:grid-cols-3">
          {principles.map((v) => (
            <div key={v.number}>
              <span className="text-xs text-primary">{v.number} /</span>
              <h3 className="mt-5">{v.title}</h3>
              <p className="body-copy mt-3 max-w-xs">{v.copy}</p>
            </div>
          ))}
        </div>
      </section>
      <ContactBand />
    </>
  );
}
