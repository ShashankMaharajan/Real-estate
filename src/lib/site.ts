/**
 * Business contact details. Leave a value empty until it's real: the site hides the
 * matching buttons, and enquiries stay on the visitor's device (nothing is sent).
 */
export const contact = {
  /** International format, digits only, e.g. "9779800000000". Turns on WhatsApp buttons. */
  whatsapp: "",
  /** As it should be displayed, e.g. "+977 980-0000000". Turns on tap-to-call. */
  phone: "",
  /** Turns on "Send by email" for prepared enquiries. */
  email: "",
};

export function whatsappLink(message: string): string | null {
  return contact.whatsapp
    ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`
    : null;
}

export function emailLink(subject: string, body: string): string | null {
  return contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;
}

export function phoneLink(): string | null {
  return contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : null;
}
