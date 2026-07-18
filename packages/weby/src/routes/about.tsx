import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "#/features/landing/components/about-page";

const AboutRoute = () => <AboutPage />;

export const Route = createFileRoute("/about")({
  component: AboutRoute,
  head: () => ({
    links: [
      {
        href: "https://przknv.cc/about",
        rel: "canonical",
      },
    ],
    meta: [
      { title: "verso — about" },
      {
        content:
          "verso is a self-hosted personal knowledge base, blog, and portfolio: a public face for visitors and a private, retrieval-augmented mind for its owner. free, open source, MIT licensed, with desktop apps, package managers, and self-hosted containers.",
        name: "description",
      },
      {
        content:
          "verso, personal knowledge base, blog, portfolio, self-hosted, PKM, RAG, markdown, notes, open source, MIT, download",
        name: "keywords",
      },
      { content: "parazeeknova", name: "author" },
      { content: "index, follow, max-image-preview:large", name: "robots" },
      { content: "verso", name: "application-name" },
      { content: "#111111", name: "theme-color" },
      { content: "verso — about", property: "og:title" },
      {
        content:
          "verso is a self-hosted personal knowledge base, blog, and portfolio: a public face for visitors and a private, retrieval-augmented mind for its owner.",
        property: "og:description",
      },
      { content: "website", property: "og:type" },
      { content: "https://przknv.cc/about", property: "og:url" },
      { content: "verso", property: "og:site_name" },
      { content: "en_US", property: "og:locale" },
      { content: "https://przknv.cc/verso-og.png", property: "og:image" },
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
      { content: "https://przknv.cc/verso-og.png", property: "twitter:image" },
    ],
  }),
});
