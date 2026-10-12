import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Cross-fades between pages, and morphs a listing photo into its detail page,
    // in browsers that support view transitions. Turned off under reduced motion (styles.css).
    defaultViewTransition: true,
  });

  return router;
};
