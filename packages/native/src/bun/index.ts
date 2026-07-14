import { BrowserWindow, Updater, PATHS } from "electrobun/bun";
import { join } from "node:path";

const DEV_SERVER_PORT = 3000;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const getAppUrl = async (): Promise<string> => {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      // Check if Vite dev server is running
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log(
        `Vite dev server not running at ${DEV_SERVER_URL}. Falling back to production behavior.`,
      );
    }
  }

  // Production: Configure environment variables for the SSR server
  const port = process.env.PORT || "3000";
  process.env.PORT = port;
  process.env.NODE_ENV = "production";

  // Set default production API backend if not already set
  if (!process.env.BACKY_ORIGIN) {
    process.env.BACKY_ORIGIN = "https://przknv.cc";
  }

  // Dynamic path to the bundled Nitro SSR server inside the views resources folder
  const serverPath = join(PATHS.VIEWS_FOLDER, "weby-server", "server", "index.mjs");

  console.log(`Starting production Nitro server from: ${serverPath}`);
  try {
    await import(serverPath);
    console.log(`Nitro server running on http://localhost:${port}`);
    return `http://localhost:${port}`;
  } catch (error) {
    console.error("Failed to start Nitro SSR server:", error);
    throw error;
  }
};

// Create the main application window
const url = await getAppUrl();

const mainWindow = new BrowserWindow({
  frame: {
    height: 800,
    width: 1200,
    x: 100,
    y: 100,
  },
  title: "Verso",
  url,
});

console.log(`Verso desktop application started! Window ID: ${mainWindow.id}`);
