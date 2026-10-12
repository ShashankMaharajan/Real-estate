import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header, Footer } from "@/components/site-layout";
import { PageIntro } from "@/components/headings";
import { buttonVariants } from "@/components/ui/button";
import { themeInitScript } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <section className="site-width section flex min-h-[70vh] flex-col justify-center">
      <PageIntro
        eyebrow="Page not found"
        title={
          <>
            This door doesn’t lead <em>anywhere</em>.
          </>
        }
      >
        The page you’re looking for doesn’t exist or has been moved.
      </PageIntro>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className={buttonVariants({ size: "lg" })}>
          Go home
        </Link>
        <Link to="/properties" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Browse properties
        </Link>
      </div>
    </section>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <section className="site-width section flex min-h-[70vh] flex-col justify-center">
      <PageIntro
        eyebrow="Something went wrong"
        title={
          <>
            This page didn’t <em>load</em>.
          </>
        }
      >
        Something went wrong on our end. You can try again or head back home.
      </PageIntro>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className={buttonVariants({ size: "lg" })}
        >
          Try again
        </button>
        {/* A full page load, in case client-side state is what broke. */}
        <a href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Go home
        </a>
      </div>
    </section>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,50;1,9..144,300..600,50&family=Instrument+Sans:wght@400..700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The theme script adds `dark` to <html> before React hydrates, so its class differs by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </QueryClientProvider>
  );
}
