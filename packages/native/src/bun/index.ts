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
const run = (cmd: string): string => {
  try {
    const res = Bun.spawnSync(["sh", "-c", cmd]);
    if (!res.success || !res.stdout) {
      return "";
    }
    return new TextDecoder().decode(res.stdout).trim();
  } catch {
    return "";
  }
};

const getLinuxTheme = (): "light" | "dark" => {
  const de = (process.env.XDG_CURRENT_DESKTOP ?? "").toLowerCase();

  const portal = run(
    "gdbus call --session --dest org.freedesktop.portal.Desktop --object-path /org/freedesktop/portal/desktop --method org.freedesktop.portal.Settings.Read org.freedesktop.appearance color-scheme 2>/dev/null",
  );
  const pm = portal.match(/uint32\s+(\d+)/);
  if (pm) {
    const value = Number(pm[1]);
    if (value === 2) {
      return "dark";
    }
    if (value === 1) {
      return "light";
    }
  }

  if (de.includes("gnome") || de.includes("unity") || de.includes("pop")) {
    const cs = run("gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null");
    if (cs.includes("prefer-dark")) {
      return "dark";
    }
    if (cs.includes("prefer-light")) {
      return "light";
    }
  }

  if (de.includes("kde") || de.includes("plasma")) {
    const cs =
      run("kreadconfig5 --group General --key ColorScheme 2>/dev/null") ||
      run("grep -r 'ColorScheme=' ~/.config/kdeglobals 2>/dev/null");
    if (/dark/i.test(cs)) {
      return "dark";
    }
    return "light";
  }

  if (de.includes("xfce")) {
    const tn = run("xfconf-query -c xsettings -p /Net/ThemeName 2>/dev/null");
    if (/dark/i.test(tn)) {
      return "dark";
    }
    return "light";
  }

  const gtk =
    run("gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null") ||
    run("grep -i 'gtk-theme-name' ~/.config/gtk-3.0/settings.ini 2>/dev/null");
  if (/dark/i.test(gtk)) {
    return "dark";
  }
  return "light";
};

const getOsTheme = (): "light" | "dark" => {
  try {
    const { platform } = process;
    if (platform === "darwin") {
      const out = run("defaults read -g AppleInterfaceStyle 2>/dev/null");
      return out.includes("Dark") ? "dark" : "light";
    }
    if (platform === "win32") {
      const out = run(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme 2>/dev/null',
      );
      const m = out.match(/SystemUsesLightTheme\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
      if (m) {
        return Number.parseInt(m[1], 16) === 0 ? "dark" : "light";
      }
      return "light";
    }
    if (platform === "linux") {
      return getLinuxTheme();
    }
  } catch {
    // ignore and fall through to default
  }
  return "light";
};

const applyOsTheme = (win: BrowserWindow) => {
  const theme = getOsTheme();
  const js = `window.dispatchEvent(new CustomEvent('verso:os-theme', { detail: '${theme}' }));`;
  try {
    win.webview.executeJavascript(js);
  } catch {
    // webview not ready yet; dom-ready will retry
  }
};

mainWindow.on("dom-ready", () => applyOsTheme(mainWindow));
applyOsTheme(mainWindow);

let lastTheme = getOsTheme();
setInterval(() => {
  const theme = getOsTheme();
  if (theme !== lastTheme) {
    lastTheme = theme;
    applyOsTheme(mainWindow);
  }
}, 2000);

console.log(`Verso desktop application started! Window ID: ${mainWindow.id}`);
