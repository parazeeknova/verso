import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const readPackageVersion = (): string => {
  try {
    const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "package.json"), "utf-8")) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
};

const config = defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = env.PORT || env.BACKEND_PORT || "7000";
  const isCloudflare = env.CLOUDFLARE === "1";
  const appVersion = readPackageVersion();

  const plugins = [devtools(), tailwindcss(), tanstackStart(), viteReact()];

  if (isCloudflare) {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.unshift(cloudflare({ viteEnvironment: { name: "ssr" } }));
  } else {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "node-server" }));
  }

  return {
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    optimizeDeps: {
      include: ["use-sync-external-store/shim/with-selector", "use-sync-external-store/shim"],
    },
    plugins,
    resolve: { tsconfigPaths: true },
    server: {
      proxy: {
        "/api": {
          changeOrigin: true,
          configure: (proxy: {
            on: (event: string, handler: (...args: unknown[]) => void) => void;
          }) => {
            proxy.on("error", (_err: unknown, _req: unknown, res: unknown) => {
              const response = res as {
                writeHead?: (code: number, headers: Record<string, string>) => void;
                end?: (body: string) => void;
                writableEnded?: boolean;
              };
              if (response?.writeHead && !response.writableEnded) {
                response.writeHead(502, { "Content-Type": "application/json" });
                response.end?.(JSON.stringify({ error: "backend unavailable" }));
              }
            });
          },
          target: `http://localhost:${port}`,
        },
      },
    },
  };
});

export default config;
