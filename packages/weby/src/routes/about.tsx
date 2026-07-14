import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/features/landing/components/landing";

const AboutPage = () => <LandingPage />;

export const Route = createFileRoute("/about")({
  component: AboutPage,
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
          "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
        name: "description",
      },
      { content: "verso — about", property: "og:title" },
      {
        content:
          "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
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
          "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
        property: "twitter:description",
      },
      { content: "/verso-og.png", property: "twitter:image" },
    ],
  }),
});
