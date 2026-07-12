import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { createTheme, MantineProvider } from "@mantine/core";

import mantineCss from "@mantine/core/styles.css?url";
import appCss from "../styles.css?url";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 60,
      },
    },
  });

const theme = createTheme({
  fontFamily: '"Ubuntu Mono", monospace',
  fontFamilyMonospace: '"Ubuntu Mono", monospace',
});

const RootComponent = () => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Outlet />
      </MantineProvider>
    </QueryClientProvider>
  );
};

const THEME_SCRIPT = [
  "(function(){var t='dark';try{var s=localStorage.getItem('verso-theme');",
  "if(s){var j=JSON.parse(s);var p=j.state?.preference;",
  "if(p==='light'||p==='dark')t=p;else if(p==='system')",
  "t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}",
  "}catch(e){}document.documentElement.dataset.theme=t;",
  "document.documentElement.dataset.mantineColorScheme=t})()",
].join("");

const RootShell = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" data-theme="dark" data-mantine-color-scheme="dark" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <script
        defer
        src="https://tracking.przknv.cc/script.js"
        data-website-id="2e47b7c9-3f7a-4e37-b435-3922b269c7ec"
      />
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [
      {
        href: mantineCss,
        rel: "stylesheet",
      },
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: "/verso.svg",
        rel: "icon",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        color: "#000000",
        href: "/verso.svg",
        rel: "mask-icon",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        content: "#000000",
        name: "msapplication-TileColor",
      },
      {
        content: "#ffffff",
        name: "theme-color",
      },
      {
        content: "third year undergrad, full stack and devops engineer",
        name: "description",
      },
      {
        content: "gist, parazeeknova, developer, fullstack, devops",
        name: "keywords",
      },
      {
        content: "parazeeknova",
        name: "author",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "gist - parazeeknova",
        property: "og:title",
      },
      {
        content: "third year undergrad, fullstack & devops engineer",
        property: "og:description",
      },
      {
        content:
          "http://cdn.itssingularity.com/images/2026/05/02/52d60e02dc868234b4c03f50270ba3f0.png",
        property: "og:image",
      },
      {
        content: "https://folio.przknv.cc",
        property: "og:url",
      },
      {
        content: "summary_large_image",
        property: "twitter:card",
      },
      {
        content: "gist - parazeeknova",
        property: "twitter:title",
      },
      {
        content: "third year undergrad, fullstack & devops engineer",
        property: "twitter:description",
      },
      {
        content:
          "http://cdn.itssingularity.com/images/2026/05/02/52d60e02dc868234b4c03f50270ba3f0.png",
        property: "twitter:image",
      },
      {
        content: "gist - parazeeknova",
        name: "application-name",
      },
      {
        content: "yes",
        name: "apple-mobile-web-app-capable",
      },
      {
        content: "default",
        name: "apple-mobile-web-app-status-bar-style",
      },
      {
        content: "gist",
        name: "apple-mobile-web-app-title",
      },
      {
        content: "yes",
        name: "mobile-web-app-capable",
      },
    ],
    title: "gist - parazeeknova",
  }),
  notFoundComponent: () => <p>Not Found</p>,
  shellComponent: RootShell,
});
