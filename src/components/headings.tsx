import type { ReactNode } from "react";

/** Eyebrow, serif h1 and optional lede that open every top-level page. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <p className="eyebrow mb-6 text-primary">{eyebrow}</p>
      <h1 className="max-w-3xl text-heading">{title}</h1>
      {children ? <p className="lede mt-6">{children}</p> : null}
    </>
  );
}

/** Eyebrow and serif h2 that open a section within a page. */
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow mb-4 text-primary">{eyebrow}</p>
      <h2 className="text-title">{title}</h2>
    </div>
  );
}
