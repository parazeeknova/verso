import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "#/features/landing/components/about-page";

const AboutRoute = () => <AboutPage />;

export const Route = createFileRoute("/about")({
  component: AboutRoute,
  head: () => ({
    links: [
      {
        href: "/about",
        rel: "canonical",
      },
    ],
    meta: [
      { title: "verso — about" },
      {
        content:
          "verso is a self-hosted personal knowledge base, blog, and portfolio: a public face for visitors and a private, retrieval-augmented mind for its owner.",
        name: "description",
      },
      { content: "verso — about", property: "og:title" },
      {
        content:
          "verso is a self-hosted personal knowledge base, blog, and portfolio: a public face for visitors and a private, retrieval-augmented mind for its owner.",
        property: "og:description",
      },
      { content: "website", property: "og:type" },
      { content: "/verso-og.png", property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      { content: "image/png", property: "og:image:type" },
      { content: "summary_large_image", property: "twitter:card" },
      { content: "verso — about", property: "twitter:title" },
      {
        content:
          "verso is a self-hosted personal knowledge base, blog, and portfolio: a public face for visitors and a private, retrieval-augmented mind for its owner.",
        property: "twitter:description",
      },
      { content: "/verso-og.png", property: "twitter:image" },
    ],
  }),
});
