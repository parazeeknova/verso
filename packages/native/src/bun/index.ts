import { BrowserWindow, Updater, PATHS } from "electrobun/bun";
import { join } from "node:path";

const DEV_SERVER_PORT = 3000;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const getAppUrl = async (): Promise<string> => {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    console.log(`Checking for Vite dev server at ${DEV_SERVER_URL}...`);
    // Retry up to 50 times (10 seconds total) to give Vite time to boot up
    let retries = 0;
    while (retries < 50) {
      try {
        await fetch(DEV_SERVER_URL, { method: "HEAD" });
        console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
        return DEV_SERVER_URL;
      } catch {
        // eslint-disable-next-line promise/avoid-new
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 200);
        });
        retries += 1;
      }
    }
    throw new Error(
      `Vite dev server not detected at ${DEV_SERVER_URL} after 10 seconds. Please make sure the dev server is running (e.g. by running 'bun run dev').`,
    );
  }

  // Production: Configure environment variables for the SSR server
  const port = process.env.PORT || "3000";
  process.env.PORT = port;
  process.env.NODE_ENV = "production";

  // Set default production API backend if not already set
  if (!process.env.BACKY_ORIGIN) {
    process.env.BACKY_ORIGIN = "https://verso-serve.przknv.cc";
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

// System theme awareness: detect the OS theme and forward it into the webview
// so the app follows light/dark across Windows, macOS, and Linux (Wayland/X11).
// The web app listens for the `verso:os-theme` event and only applies it while
// its own preference is "system", so manual theme choices are always respected.
const run = async (args: string[]): Promise<string> => {
  try {
    const proc = Bun.spawn(args, {
      signal: AbortSignal.timeout(800),
      stderr: "ignore",
      stdout: "pipe",
    });
    proc.unref();
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    return output.trim();
  } catch {
    return "";
  }
};

const runShell = (cmd: string): Promise<string> => run(["sh", "-c", cmd]);

const getLinuxTheme = async (): Promise<"light" | "dark"> => {
  const desktopEnvironment = (process.env.XDG_CURRENT_DESKTOP ?? "").toLowerCase();

  const portal = await runShell(
    "gdbus call --session --dest org.freedesktop.portal.Desktop --object-path /org/freedesktop/portal/desktop --method org.freedesktop.portal.Settings.Read org.freedesktop.appearance color-scheme 2>/dev/null",
  );
  const portalMatch = portal.match(/uint32\s+(\d+)/);
  if (portalMatch) {
    const value = Number(portalMatch[1]);
    if (value === 2) {
      return "dark";
    }
    if (value === 1) {
      return "light";
    }
  }

  if (
    desktopEnvironment.includes("gnome") ||
    desktopEnvironment.includes("unity") ||
    desktopEnvironment.includes("pop")
  ) {
    const colorScheme = await runShell(
      "gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null",
    );
    if (colorScheme.includes("prefer-dark")) {
      return "dark";
    }
    if (colorScheme.includes("prefer-light")) {
      return "light";
    }
  }

  if (desktopEnvironment.includes("kde") || desktopEnvironment.includes("plasma")) {
    const colorScheme =
      (await runShell("kreadconfig5 --group General --key ColorScheme 2>/dev/null")) ||
      (await runShell("grep -r 'ColorScheme=' ~/.config/kdeglobals 2>/dev/null"));
    if (/dark/i.test(colorScheme)) {
      return "dark";
    }
    return "light";
  }

  if (desktopEnvironment.includes("xfce")) {
    const themeName = await runShell("xfconf-query -c xsettings -p /Net/ThemeName 2>/dev/null");
    if (/dark/i.test(themeName)) {
      return "dark";
    }
    return "light";
  }

  const gtkTheme =
    (await runShell("gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null")) ||
    (await runShell("grep -i 'gtk-theme-name' ~/.config/gtk-3.0/settings.ini 2>/dev/null"));
  if (/dark/i.test(gtkTheme)) {
    return "dark";
  }
  return "light";
};

const getOsTheme = async (): Promise<"light" | "dark"> => {
  try {
    const { platform } = process;
    if (platform === "darwin") {
      const commandOutput = await runShell("defaults read -g AppleInterfaceStyle 2>/dev/null");
      return commandOutput.includes("Dark") ? "dark" : "light";
    }
    if (platform === "win32") {
      const commandOutput = await run([
        "reg",
        "query",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        "/v",
        "SystemUsesLightTheme",
      ]);
      const registryMatch = commandOutput.match(
        /SystemUsesLightTheme\s+REG_DWORD\s+0x([0-9a-fA-F]+)/,
      );
      if (registryMatch) {
        return Number.parseInt(registryMatch[1], 16) === 0 ? "dark" : "light";
      }
      return "light";
    }
    if (platform === "linux") {
      return await getLinuxTheme();
    }
  } catch {
    // ignore and fall through to default
  }
  return "light";
};

const applyOsTheme = (win: BrowserWindow, theme: "light" | "dark") => {
  const js = `window.dispatchEvent(new CustomEvent('verso:os-theme', { detail: '${theme}' }));`;
  try {
    win.webview.executeJavascript(js);
  } catch {
    // webview not ready yet; dom-ready will retry
  }
};

mainWindow.on("dom-ready", async () => {
  const theme = await getOsTheme();
  applyOsTheme(mainWindow, theme);
});

void (async () => {
  const initialTheme = await getOsTheme();
  applyOsTheme(mainWindow, initialTheme);

  let lastTheme = initialTheme;
  const poll = async () => {
    const theme = await getOsTheme();
    if (theme !== lastTheme) {
      lastTheme = theme;
      applyOsTheme(mainWindow, theme);
    }
    await Bun.sleep(2000);
    void poll();
  };
  void poll();
})();

console.log(`Verso desktop application started! Window ID: ${mainWindow.id}`);
