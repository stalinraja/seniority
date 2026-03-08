import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { APPLY_SECTION_ENABLED } from "./config/features";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        lazy: async () => {
          const mod = await import("./pages/Dashboard");
          return { Component: mod.Dashboard };
        },
      },
      ...(APPLY_SECTION_ENABLED
        ? [
            {
              path: "apply",
              lazy: async () => {
                const mod = await import("./pages/ApplyPage");
                return { Component: mod.ApplyPage };
              },
            },
          ]
        : []),
    ],
  },
]);
