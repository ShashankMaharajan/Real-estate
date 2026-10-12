import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowUpRight, Check, Copy, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/headings";
import { cityLabels, getProperty } from "@/data/properties";
import { formatPrice } from "@/lib/format";
import { pageMeta } from "@/lib/page-meta";
import { contact, emailLink, phoneLink, whatsappLink } from "@/lib/site";

const contactSearchSchema = z.object({
  /** Slug of the listing the visitor came from; pre-fills the enquiry. */
  property: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => contactSearchSchema.parse(search),
  head: () =>
    pageMeta(
      "Let’s talk",
      "Start a conversation with Aangan about buying, selling or exploring property in Nepal.",
    ),
  component: Contact,
});

const interests = [
  "Buying a property",
  "Selling a property",
  "Land & investment",
  "General consultation",
];

function Contact() {
  const { property: slug } = Route.useSearch();
  const property = slug ? getProperty(slug) : undefined;
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setDraft(
      `Property enquiry\nName: ${values.get("name")}\nEmail: ${values.get("email")}\nPhone: ${values.get("phone") || "Not provided"}\nInterested in: ${values.get("interest")}\n\n${values.get("message")}`,
    );
    setCopied(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const whatsapp = draft ? whatsappLink(draft) : null;
  const email = draft ? emailLink("Property enquiry", draft) : null;
  const phone = phoneLink();
  const canSend = Boolean(contact.whatsapp || contact.email);

  return (
    <section className="site-width section reveal">
      <PageIntro
        eyebrow="Let’s start a conversation"
        title={
          <>
            A new beginning
            <br />
            starts with hello.
          </>
        }
      />
      <div className="mt-12 grid gap-14 md:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="body-copy max-w-sm">
            Tell us what you have in mind — a home, a piece of land, or simply a question. Let’s
            explore the possibilities together.
          </p>
          <div className="mt-10 flex items-start gap-4 border-t py-6">
            <MapPin className="size-5 text-primary" aria-hidden />
            <div>
              <h3>Rooted in Nepal</h3>
              <p className="mt-2 text-sm text-muted-foreground">Kathmandu Valley & beyond</p>
            </div>
          </div>
          {phone || contact.email ? (
            <div className="space-y-3 border-t pt-6 text-sm">
              {phone && (
                <a href={phone} className="flex items-center gap-3 hover:text-primary">
                  <Phone className="size-4 text-primary" aria-hidden /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 hover:text-primary"
                >
                  <Mail className="size-4 text-primary" aria-hidden /> {contact.email}
                </a>
              )}
            </div>
          ) : (
            <p className="body-copy max-w-sm border-t pt-6">
              Business contact details are coming soon. You can prepare and copy your enquiry here;
              nothing will be sent.
            </p>
          )}
        </div>
        {/* Keyed so arriving from a different listing resets the pre-filled fields. */}
        <form key={slug} onSubmit={submit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="name">
                Your name *
              </label>
              <input
                className="form-control"
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Full name"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="email">
                Email address *
              </label>
              <input
                className="form-control"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="phone">
                Phone number
              </label>
              <input
                className="form-control"
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+977"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="interest">
                I’m interested in
              </label>
              <select
                className="form-control"
                id="interest"
                name="interest"
                defaultValue={property?.type === "land" ? "Land & investment" : interests[0]}
              >
                {interests.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="message">
              A little about your plans *
            </label>
            <textarea
              id="message"
              name="message"
              className="form-control min-h-36 resize-y"
              placeholder="Your preferred location, budget, or anything you’d like to ask…"
              defaultValue={
                property
                  ? `I'm interested in "${property.name}" in ${property.neighbourhood}, ${cityLabels[property.city]} (${formatPrice(property.price)}). Could you share more details and possible viewing times?`
                  : undefined
              }
              required
              maxLength={3000}
            />
          </div>
          <Button type="submit" size="lg">
            Prepare enquiry <ArrowUpRight />
          </Button>
          {draft && (
            <div className="border-t pt-6" role="status">
              <h3 className="flex items-center gap-2">
                <Check className="size-4 text-primary" aria-hidden />
                {canSend ? "Your enquiry is ready to send" : "Your enquiry is ready — not sent"}
              </h3>
              <pre className="my-4 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-muted-foreground">
                {draft}
              </pre>
              <div className="flex flex-wrap gap-3">
                {whatsapp && (
                  <Button asChild>
                    <a href={whatsapp} target="_blank" rel="noreferrer">
                      <MessageCircle /> Send on WhatsApp
                    </a>
                  </Button>
                )}
                {email && (
                  <Button asChild variant="outline">
                    <a href={email}>
                      <Mail /> Send by email
                    </a>
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={copy}>
                  <Copy />
                  {copied ? "Copied" : "Copy enquiry"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
