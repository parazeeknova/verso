import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  AppleLogoIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BoxArrowDownIcon,
  BrainIcon,
  ChatCenteredTextIcon,
  ChatCircleTextIcon,
  CloudArrowDownIcon,
  CubeIcon,
  DatabaseIcon,
  DeviceMobileIcon,
  FigmaLogoIcon,
  FileVideoIcon,
  GitBranchIcon,
  GithubLogoIcon,
  GoogleDriveLogoIcon,
  GraphIcon,
  HighlighterCircleIcon,
  LinuxLogoIcon,
  MagnifyingGlassIcon,
  MicrosoftExcelLogoIcon,
  MoonStarsIcon,
  PenIcon,
  PlugsConnectedIcon,
  PresentationIcon,
  ScanIcon,
  StackIcon,
  TableIcon,
  WindowsLogoIcon,
} from "@phosphor-icons/react";

interface GradientTextProps {
  as?: "h1" | "h2" | "h3" | "span";
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
  via?: string;
}

const GradientText = ({
  as: Tag = "h2",
  children,
  className = "",
  from,
  to,
  via,
}: GradientTextProps) => {
  const { isDarkMode } = useTheme();
  const top = from ?? (isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)");
  const mid = via ?? (isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.5)");
  const bot = to ?? (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.15)");

  return (
    <Tag
      className={className}
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        backgroundImage: `linear-gradient(0deg, ${top} 0%, ${mid} 40%, ${bot} 100%)`,
      }}
    >
      {children}
    </Tag>
  );
};

const REPO = "parazeeknova/verso";
const GH = `https://github.com/${REPO}`;
const API = `https://api.github.com/repos/${REPO}`;
const FALLBACK_TAG = "v0.3.70";

interface GhAsset {
  browser_download_url: string;
  name: string;
  size: number;
}

interface GhRelease {
  assets: GhAsset[];
  body: string;
  draft: boolean;
  html_url: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
}

type DownloadKey =
  | "appimage"
  | "arch"
  | "deb"
  | "linux"
  | "mac"
  | "nix"
  | "rpm"
  | "serve"
  | "web"
  | "win";

interface DownloadLink {
  detail: string;
  href: string;
  key: DownloadKey;
  name: string;
  ref?: string;
}

const FALLBACK_ASSET_NAMES = [
  "stable-linux-x64-update.json",
  "stable-linux-x64-Verso-Setup.tar.gz",
  "stable-linux-x64-Verso.tar.zst",
  "stable-macos-arm64-update.json",
  "stable-macos-arm64-Verso.app.tar.zst",
  "stable-macos-arm64-Verso.dmg",
  "stable-win-x64-update.json",
  "stable-win-x64-Verso-Setup.zip",
  "stable-win-x64-Verso.tar.zst",
  "verso-0.3.70-1.x86_64.rpm",
  "Verso-0.3.70-x86_64.AppImage",
  "verso_0.3.70_amd64.deb",
];

const fallbackAssets = (): GhAsset[] =>
  FALLBACK_ASSET_NAMES.map((name) => ({
    browser_download_url: `${GH}/releases/download/${FALLBACK_TAG}/${name}`,
    name,
    size: 0,
  }));

const FALLBACK_RELEASES: GhRelease[] = [
  {
    assets: fallbackAssets(),
    body: "## Changes\n\n- refactor[CORE]: Harden upload limits, secure inline media, clean up ImageView, and add try/finally tests (56aa1dc)\n- style[SIDEBAR]: Hide space details and settings option for nospace (2f69224)\n- refactor[CORE]: Fix security issues, deduplicate sidebar DnD, and add tests (0112da4)\n- feat[CORE]: Add backend and test checks to prevent deleting nospace system space (fd88c63)\n- fix[WEB]: Use ul instead of div for li",
    draft: false,
    html_url: `${GH}/releases/tag/v0.3.70`,
    name: "Release v0.3.70",
    prerelease: false,
    published_at: "2026-07-16T06:09:06Z",
    tag_name: "v0.3.70",
  },
  {
    assets: fallbackAssets(),
    body: "## Changes\n\n- fix[CI]: Update appimagetool download URL to continuous release tag (e8979ac)\n- feat[CI]: Automate SHA256/SRI hash updating on release (adac999)\n- fix[CI]: Extract AppImage tool to bypass FUSE dependencies (2999558)\n- feat[rebrand]: Update PKGBUILD maintainer email and association (1957e23)\n- feat[rebrand]: Update project descriptions to 'Personal knowledge base and folio, blog for public face & private brain, one app'",
    draft: false,
    html_url: `${GH}/releases/tag/v0.2.92`,
    name: "Release v0.2.92",
    prerelease: false,
    published_at: "2026-07-14T07:13:59Z",
    tag_name: "v0.2.92",
  },
  {
    assets: fallbackAssets(),
    body: '## Changes\n\n- fix[CI]: Fix Docker workspace dependency copy and desktop build folder change (62e9021)\n\n## Container Images\n\n- "ghcr.io/parazeeknova/verso-web:v0.2.90"\n- "ghcr.io/parazeeknova/verso-serve:v0.2.90"\n\n- "ghcr.io/parazeeknova/verso-web:latest"\n- "ghcr.io/parazeeknova/verso-serve:latest"',
    draft: false,
    html_url: `${GH}/releases/tag/v0.2.90`,
    name: "Release v0.2.90",
    prerelease: false,
    published_at: "2026-07-14T06:12:44Z",
    tag_name: "v0.2.90",
  },
];

const findAsset = (assets: GhAsset[], re: RegExp): GhAsset | undefined =>
  assets.find((a) => re.test(a.name));

const stripHtml = (s: string): string => s.replaceAll(/<[^>]+>/g, "");

const parseChanges = (body: string): { hash?: string; label: string }[] => {
  const text = stripHtml(body);
  const lines = text.split("\n");
  const out: { hash?: string; label: string }[] = [];
  let inChanges = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+changes/i.test(line)) {
      inChanges = true;
      continue;
    }
    if (/^##\s+/i.test(line)) {
      if (inChanges) {
        break;
      }
      continue;
    }
    if (inChanges && line.startsWith("-")) {
      const content = line.replace(/^-\s*/, "").trim();
      const m = content.match(/^(.*?)\s+\(([0-9a-f]{6,})\)\s*$/i);
      if (m) {
        out.push({ hash: m[2], label: m[1] });
      } else {
        out.push({ label: content });
      }
    }
  }
  return out;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const stripV = (tag: string): string => tag.replace(/^v/, "");

const buildDownloads = (release: GhRelease): DownloadLink[] => {
  const { assets, tag_name } = release;
  const dl = (re: RegExp): string | undefined => findAsset(assets, re)?.browser_download_url;

  const links: DownloadLink[] = [];

  const mac = dl(/^stable-macos-arm64-Verso\.dmg$/);
  if (mac) {
    links.push({
      detail: "apple silicon · .dmg",
      href: mac,
      key: "mac",
      name: "macos",
    });
  }
  const win = dl(/^stable-win-x64-Verso-Setup\.zip$/);
  if (win) {
    links.push({
      detail: "x64 · installer",
      href: win,
      key: "win",
      name: "windows",
    });
  }
  const linux = dl(/^stable-linux-x64-Verso-Setup\.tar\.gz$/);
  if (linux) {
    links.push({
      detail: "x64 · portable tarball",
      href: linux,
      key: "linux",
      name: "linux",
    });
  }
  const deb = dl(/^verso_.*_amd64\.deb$/);
  if (deb) {
    links.push({
      detail: "amd64 · .deb",
      href: deb,
      key: "deb",
      name: "debian / ubuntu",
    });
  }
  const rpm = dl(/^verso-.*\.x86_64\.rpm$/);
  if (rpm) {
    links.push({
      detail: "x86_64 · .rpm",
      href: rpm,
      key: "rpm",
      name: "fedora / rhel",
    });
  }
  const appimage = dl(/^Verso-.*\.AppImage$/);
  if (appimage) {
    links.push({
      detail: "x86_64 · portable",
      href: appimage,
      key: "appimage",
      name: "appimage",
    });
  }

  links.push({
    detail: "verso-bin · maintained pkgbuild",
    href: "https://aur.archlinux.org/packages/verso-bin",
    key: "arch",
    name: "arch (aur)",
  });
  links.push({
    detail: "flake · nix run github:parazeeknova/verso",
    href: `${GH}`,
    key: "nix",
    name: "nixos",
  });

  const ver = stripV(tag_name);
  links.push({
    detail: "container image",
    href: `${GH}/pkgs/container/verso-web`,
    key: "web",
    name: "verso-web",
    ref: `ghcr.io/parazeeknova/verso-web:${ver}`,
  });
  links.push({
    detail: "container image",
    href: `${GH}/pkgs/container/verso-serve`,
    key: "serve",
    name: "verso-serve",
    ref: `ghcr.io/parazeeknova/verso-serve:${ver}`,
  });

  return links;
};

const DownloadIcon = ({ className, k }: { className: string; k: DownloadKey }) => {
  const map: Record<DownloadKey, React.ReactNode> = {
    appimage: <BoxArrowDownIcon className={className} size={20} />,
    arch: <StackIcon className={className} size={20} />,
    deb: <LinuxLogoIcon className={className} size={20} />,
    linux: <LinuxLogoIcon className={className} size={20} />,
    mac: <AppleLogoIcon className={className} size={20} />,
    nix: <GitBranchIcon className={className} size={20} />,
    rpm: <LinuxLogoIcon className={className} size={20} />,
    serve: <CubeIcon className={className} size={20} />,
    web: <CubeIcon className={className} size={20} />,
    win: <WindowsLogoIcon className={className} size={20} />,
  };
  return <>{map[k]}</>;
};

const FeatureRow = ({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <div
      className={`border p-4 flex flex-col gap-2 transition-colors ${t("border-border-dark hover:bg-white/3", "border-border-light hover:bg-black/3")}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm lowercase font-bold">{title}</h3>
      </div>
      <p
        className={`text-[12px] leading-relaxed lowercase ${t("text-text-dark/45", "text-text-light/45")}`}
      >
        {children}
      </p>
    </div>
  );
};

const MAX_CHANGES = 10;

const changelogToggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, tag: string) =>
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    return next;
  });

// === Interactive preview (borrowed from the product landing) ===
const DEMOS = [
  {
    desc: "type / to insert headings, code blocks, tables, diagrams, and more.",
    title: "slash menu",
  },
  {
    desc: "mention team members with @ or link internal pages inline.",
    title: "smart mentions",
  },
  {
    desc: "find pages in seconds. full-text search across all content including pdf and docx attachments.",
    title: "search",
  },
  {
    desc: "rich text editor with tables, code blocks, markdown, diagrams, and real-time collaboration. see cursors and edits live.",
    title: "powerful editor",
  },
];

const slashItems = [
  { icon: "H1", label: "heading 1" },
  { icon: "H2", label: "heading 2" },
  { icon: "<>", label: "code block" },
  { icon: "⊞", label: "table" },
  { icon: "•", label: "bullet list" },
  { icon: "1.", label: "numbered list" },
  { icon: '"', label: "quote" },
  { icon: "◈", label: "diagram" },
];

const SlashMenuPreview = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <div>
      <div className={`text-[11px] lowercase mb-3 ${t("text-text-dark/45", "text-text-light/45")}`}>
        press <span className={`font-bold ${t("text-text-dark/60", "text-text-light/60")}`}>/</span>{" "}
        anywhere to open the command palette.
      </div>
      <div
        className={`border p-2.5 text-[10px] leading-5 ${t("border-border-dark bg-white/2", "border-border-light bg-black/2")}`}
      >
        <div
          className={`flex items-center gap-2 pb-2 mb-2 border-b ${t("border-border-dark/30", "border-border-light/30")}`}
        >
          {["B", "I", "U", "S", "link"].map((b) => (
            <span
              className={`px-1 text-[9px] border ${t("border-border-dark/40 text-text-dark/30", "border-border-light/40 text-text-light/30")}`}
              key={b}
            >
              {b}
            </span>
          ))}
        </div>
        <span className={t("text-text-dark/50", "text-text-light/50")}>## deployment guide</span>
        <div className="flex items-center">
          <span className={t("text-text-dark/50", "text-text-light/50")}>run </span>
          <span className={t("text-text-dark/25", "text-text-light/25")}>docker compose</span>
          <span className="animate-pulse">/</span>
        </div>
      </div>
      <div
        className={`border mt-1.5 p-1.5 max-w-55 ${t("border-border-dark bg-bg-dark shadow-sm", "border-border-light bg-bg-light shadow-sm")}`}
      >
        <div
          className={`flex items-center gap-1 text-[9px] lowercase pb-1 mb-1 border-b ${t("border-border-dark/30 text-text-dark/25", "border-border-light/30 text-text-light/25")}`}
        >
          <span>⌘K</span>
          <span className={t("text-text-dark/15", "text-text-light/15")}>to open</span>
        </div>
        {slashItems.slice(0, 6).map((item, i) => (
          <div
            className={`flex items-center justify-between text-[9px] lowercase px-1 py-0.5 ${i === 0 ? t("bg-white/10", "bg-black/5") : ""} ${t("hover:bg-white/5", "hover:bg-black/3")}`}
            key={item.label}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-4 text-center text-[8px] ${t("text-text-dark/30", "text-text-light/30")}`}
              >
                {item.icon}
              </span>
              <span className={t("text-text-dark/55", "text-text-light/55")}>{item.label}</span>
            </div>
            <span className={`text-[8px] ${t("text-text-dark/20", "text-text-light/20")}`}>
              ⌘{i + 1}
            </span>
          </div>
        ))}
        <div
          className={`text-[8px] text-center lowercase pt-1 mt-0.5 border-t ${t("border-border-dark/20 text-text-dark/18", "border-border-light/20 text-text-light/18")}`}
        >
          ↑↓ navigate · ↵ select · esc close
        </div>
      </div>
    </div>
  );
};

const MentionsPreview = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <div>
      <div className={`text-[11px] lowercase mb-3 ${t("text-text-dark/45", "text-text-light/45")}`}>
        <span className={`font-bold ${t("text-text-dark/60", "text-text-light/60")}`}>@</span>{" "}
        mentions people and{" "}
        <span className={`font-bold ${t("text-text-dark/60", "text-text-light/60")}`}>[[</span>{" "}
        links internal pages.
      </div>
      <div
        className={`border p-2.5 text-[10px] leading-5 ${t("border-border-dark bg-white/2", "border-border-light bg-black/2")}`}
      >
        <span className={t("text-text-dark/50", "text-text-light/50")}>assigned to </span>
        <span
          className={`px-1 py-0.5 text-[9px] ${t("bg-white/10 text-text-dark/70", "bg-black/5 text-text-light/70")}`}
        >
          @alice
        </span>
        <span className={t("text-text-dark/50", "text-text-light/50")}> — please review the </span>
        <span
          className={`px-1 py-0.5 text-[9px] underline ${t("text-text-dark/60", "text-text-light/60")}`}
        >
          [[deployment guide]]
        </span>
        <div className="mt-2 flex items-center">
          <span className={`text-[9px] ${t("text-text-dark/30", "text-text-light/30")}`}>
            add a comment{" "}
          </span>
          <span className="animate-pulse">@</span>
        </div>
      </div>
      <div
        className={`border mt-1.5 p-1.5 max-w-55 ${t("border-border-dark bg-bg-dark shadow-sm", "border-border-light bg-bg-light shadow-sm")}`}
      >
        <div
          className={`text-[8px] lowercase pb-1 mb-1 border-b ${t("border-border-dark/30 text-text-dark/20", "border-border-light/30 text-text-light/20")}`}
        >
          people online
        </div>
        {[
          { name: "alice", online: true, role: "engineer" },
          { name: "bob", online: true, role: "designer" },
          { name: "carol", online: false, role: "pm" },
        ].map((p, i) => (
          <div
            className={`flex items-center justify-between text-[9px] lowercase px-1 py-0.5 ${i === 0 ? t("bg-white/10", "bg-black/5") : ""} ${t("hover:bg-white/5", "hover:bg-black/3")}`}
            key={p.name}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <span
                  className={`h-4 w-4 border text-[8px] flex items-center justify-center ${t("border-border-dark/50 text-text-dark/40", "border-border-light/50 text-text-light/40")}`}
                >
                  {p.name[0]}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border ${p.online ? t("bg-text-dark/40 border-text-dark/30", "bg-text-light/40 border-text-light/30") : t("border-border-dark/40", "border-border-light/40")}`}
                />
              </div>
              <div>
                <div className={t("text-text-dark/55", "text-text-light/55")}>@{p.name}</div>
                <div className={`text-[7px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                  {p.role}
                </div>
              </div>
            </div>
            <span
              className={`px-1 text-[7px] border ${t("border-border-dark/30 text-text-dark/25", "border-border-light/30 text-text-light/25")}`}
            >
              tab
            </span>
          </div>
        ))}
        <div
          className={`text-[8px] lowercase pt-1 mt-1 border-t ${t("border-border-dark/20 text-text-dark/20", "border-border-light/20 text-text-light/20")}`}
        >
          recent pages
        </div>
        {["handbook.md", "runbooks.md"].map((page, i) => (
          <div
            className={`flex items-center gap-2 text-[9px] lowercase px-1 py-0.5 ${t("hover:bg-white/5", "hover:bg-black/3")}`}
            key={page}
          >
            <span className={t("text-text-dark/25", "text-text-light/25")}>#</span>
            <span className={t("text-text-dark/50", "text-text-light/50")}>{page}</span>
            <span className={`ml-auto text-[7px] ${t("text-text-dark/20", "text-text-light/20")}`}>
              {i === 0 ? "2h ago" : "yesterday"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SearchPreview = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <div className="space-y-2.5">
      <div
        className={`flex items-center justify-between border px-2 py-1.5 text-[10px] ${t("border-border-dark bg-white/3", "border-border-light bg-black/3")}`}
      >
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className={t("text-text-dark/35", "text-text-light/35")} size={10} />
          <span className={t("text-text-dark/50", "text-text-light/50")}>deploy</span>
          <span
            className={`inline-block w-1 h-3 animate-pulse ${t("bg-text-dark/40", "bg-text-light/40")}`}
          />
        </div>
        <span
          className={`text-[8px] px-1 border ${t("border-border-dark/30 text-text-dark/20", "border-border-light/30 text-text-light/20")}`}
        >
          ⌘F
        </span>
      </div>
      <div className="flex gap-1">
        {["pages", "blogs", "files", "comments"].map((f) => (
          <span
            className={`px-1.5 py-0.5 text-[8px] lowercase border ${f === "pages" ? t("border-border-dark bg-white/10 text-text-dark/55", "border-border-light bg-black/5 text-text-light/55") : t("border-border-dark/30 text-text-dark/25", "border-border-light/30 text-text-light/25")}`}
            key={f}
          >
            {f}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className={`text-[8px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}>
          6 results in 0.04s
        </div>
        {[
          { badge: "md", date: "2d ago", path: "engineering/", title: "deployment guide" },
          { badge: "md", date: "1w ago", path: "ops/", title: "docker compose setup" },
          { badge: "pdf", date: "3d ago", path: "engineering/", title: "ci/cd pipeline overview" },
        ].map((r, i) => (
          <div
            className={`border-l-2 pl-2 pr-1 py-0.5 text-[9px] lowercase ${i === 0 ? t("border-border-dark bg-white/5", "border-border-light bg-black/3") : t("border-border-dark/30", "border-border-light/30")}`}
            key={i}
          >
            <div className="flex items-center gap-1.5">
              <span className={t("text-text-dark/25", "text-text-light/25")}>#</span>
              <span className={`font-bold ${t("text-text-dark/60", "text-text-light/60")}`}>
                {r.title}
              </span>
              <span
                className={`ml-auto px-1 text-[7px] border ${t("border-border-dark/30 text-text-dark/20", "border-border-light/30 text-text-light/20")}`}
              >
                {r.badge}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 mt-0.5 ${t("text-text-dark/20", "text-text-light/20")}`}
            >
              <span>{r.path}</span>
              <span>·</span>
              <span>{r.date}</span>
              {i === 0 && (
                <span className={t("text-highlight/50", "text-highlight/50")}>4 matches</span>
              )}
            </div>
          </div>
        ))}
        <div className={`text-[9px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
          + 12 matches in 4 pdf and 2 docx attachments
        </div>
      </div>
    </div>
  );
};

const EditorPreview = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <div className="space-y-2.5">
      <div className={`text-[10px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}>
        rich text with tables, code, diagrams, and real-time collaboration.
      </div>
      <div
        className={`flex items-center gap-1 flex-wrap border-b pb-1.5 ${t("border-border-dark/30", "border-border-light/30")}`}
      >
        {[
          { label: "H1", tip: "heading" },
          { label: "H2", tip: "sub" },
          { label: "B", tip: "bold" },
          { label: "I", tip: "italic" },
          { label: "link", tip: "link" },
          { label: "code", tip: "code" },
          { active: true, label: "table", tip: "table" },
          { label: "img", tip: "image" },
        ].map((btn) => (
          <span
            className={`px-1 py-0.5 text-[8px] lowercase border ${btn.active ? t("border-border-dark bg-white/15 text-text-dark/60", "border-border-light bg-black/10 text-text-light/60") : t("border-border-dark/30 text-text-dark/25", "border-border-light/30 text-text-light/25")}`}
            key={btn.label}
            title={btn.tip}
          >
            {btn.label}
          </span>
        ))}
        <span
          className={`ml-auto flex items-center gap-1 text-[7px] ${t("text-text-dark/20", "text-text-light/20")}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${t("bg-text-dark/30", "bg-text-light/30")}`}
          />{" "}
          2 online
        </span>
      </div>
      <div
        className={`border p-2.5 text-[10px] leading-5 space-y-2 ${t("border-border-dark bg-white/2", "border-border-light bg-black/2")}`}
      >
        <div
          className={`text-[12px] font-bold border-b pb-1 ${t("border-border-dark/30", "border-border-light/30")}`}
        >
          deployment guide
        </div>
        <div className={t("text-text-dark/55", "text-text-light/55")}>
          this guide covers setting up verso for production. follow each step carefully.
          <span
            className={`inline-block w-1 h-3 ml-0.5 animate-pulse ${t("bg-text-dark/40", "bg-text-light/40")}`}
          />
        </div>
        <div
          className={`border text-[8px] ${t("border-border-dark/50", "border-border-light/50")}`}
        >
          <div
            className={`grid grid-cols-3 border-b ${t("border-border-dark/50", "border-border-light/50")}`}
          >
            {["env", "cpu", "memory"].map((h) => (
              <div
                className={`px-1 py-0.5 font-bold lowercase border-r ${t("border-border-dark/50", "border-border-light/50")}`}
                key={h}
              >
                {h}
              </div>
            ))}
          </div>
          {[
            ["dev", "2", "4gb"],
            ["prod", "8", "32gb"],
            ["staging", "4", "16gb"],
          ].map((row, i) => (
            <div
              className={`grid grid-cols-3 ${i < 2 ? `border-b ${t("border-border-dark/30", "border-border-light/30")}` : ""} ${t("hover:bg-white/5", "hover:bg-black/3")}`}
              key={i}
            >
              {row.map((cell, j) => (
                <div
                  className={`px-1 py-0.5 lowercase border-r ${t("border-border-dark/30", "border-border-light/30")}`}
                  key={j}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          className={`border p-1.5 text-[8px] leading-4 ${t("border-border-dark/50 bg-black/10", "border-border-light/50 bg-black/3")}`}
        >
          <div className="flex items-center justify-between pb-1 border-b border-dotted border-white/10 mb-1">
            <span className={`lowercase ${t("text-text-dark/20", "text-text-light/20")}`}>
              docker-compose.yml
            </span>
            <span className={`text-[7px] ${t("text-text-dark/15", "text-text-light/15")}`}>
              · lang: yaml
            </span>
          </div>
          <span className={t("text-text-dark/20", "text-text-light/20")}>services:</span>
          <div className="pl-2">
            <span className={t("text-text-dark/15", "text-text-light/15")}>web:</span>
            <div className="pl-2">
              <span className={t("text-text-dark/40", "text-text-light/40")}>image:</span>{" "}
              <span className={t("text-text-dark/55", "text-text-light/55")}>verso-web:latest</span>
            </div>
            <div className="pl-2">
              <span className={t("text-text-dark/40", "text-text-light/40")}>ports:</span>{" "}
              <span className={t("text-text-dark/55", "text-text-light/55")}>8080:8080</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span
              className={`inline-block w-1 h-3 animate-pulse ${t("bg-text-dark/30", "bg-text-light/30")}`}
            />
            <span className={`text-[7px] ${t("text-text-dark/15", "text-text-light/15")}`}>
              alice is typing...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InteractivePreview = () => {
  const { isDarkMode } = useTheme();
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const DURATION = 4000;

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    startTimeRef.current = Date.now();

    const scheduleTick = () => {
      if (cancelledRef.current) {
        return;
      }
      timerRef.current = setTimeout(() => {
        if (cancelledRef.current) {
          return;
        }
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.min((elapsed / DURATION) * 100, 100);
        setProgress(pct);
        if (pct >= 100) {
          setActive((a) => (a + 1) % DEMOS.length);
        } else {
          scheduleTick();
        }
      }, 30);
    };

    scheduleTick();
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [active]);

  useEffect(() => {
    if (previewRef.current) {
      gsap.fromTo(
        previewRef.current,
        { opacity: 0, y: 8 },
        { duration: 0.25, ease: "power2.out", opacity: 1, y: 0 },
      );
    }
  }, [active]);

  return (
    <div className="grid sm:grid-cols-2 gap-8">
      <div className="flex flex-col gap-3">
        {DEMOS.map((demo, i) => (
          <button
            className={`relative text-left border px-4 py-3 transition-colors lowercase overflow-hidden ${i === active ? t("border-border-dark bg-white/5", "border-border-light bg-black/5") : t("border-border-dark/30 hover:border-border-dark hover:bg-white/3", "border-border-light/30 hover:border-border-light hover:bg-black/3")}`}
            key={demo.title}
            onClick={() => setActive(i)}
            type="button"
          >
            {i === active && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5">
                <div
                  className={`h-full w-full transition-all duration-100 ease-linear ${t("bg-text-dark/40", "bg-text-light/40")}`}
                  style={{ transform: `scaleY(${progress / 100})`, transformOrigin: "top" }}
                />
              </div>
            )}
            {i < active && (
              <div
                className={`absolute left-0 top-0 bottom-0 w-0.5 ${t("bg-text-dark/20", "bg-text-light/20")}`}
              />
            )}
            <span className="text-[13px] font-bold lowercase">
              {i + 1}. {demo.title}
            </span>
            <p
              className={`mt-0.5 text-[11px] lowercase ${t("text-text-dark/45", "text-text-light/45")}`}
            >
              {demo.desc}
            </p>
          </button>
        ))}
      </div>

      <div ref={previewRef}>
        <div className={`border h-full min-h-75 ${t("border-border-dark", "border-border-light")}`}>
          <div
            className={`flex items-center gap-1.5 border-b px-3 py-1.5 ${t("border-border-dark", "border-border-light")}`}
          >
            <span
              className={`h-2 w-2 border ${t("border-border-dark/50", "border-border-light/50")}`}
            />
            <span
              className={`h-2 w-2 border ${t("border-border-dark/50", "border-border-light/50")}`}
            />
            <span
              className={`h-2 w-2 border ${t("border-border-dark/50", "border-border-light/50")}`}
            />
            <span
              className={`ml-2 text-[9px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              {DEMOS[active].title}
            </span>
          </div>

          <div className="p-4">
            {active === 0 && <SlashMenuPreview />}
            {active === 1 && <MentionsPreview />}
            {active === 2 && <SearchPreview />}
            {active === 3 && <EditorPreview />}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutPage = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [latest, setLatest] = useState<GhRelease>(FALLBACK_RELEASES[0]);
  const [releases, setReleases] = useState<GhRelease[]>(FALLBACK_RELEASES);
  const [live, setLive] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const [showFixedNav, setShowFixedNav] = useState(false);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setShowFixedNav(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [latestRes, listRes] = await Promise.all([
          fetch(`${API}/releases/latest`, { headers: { accept: "application/vnd.github+json" } }),
          fetch(`${API}/releases?per_page=6`, {
            headers: { accept: "application/vnd.github+json" },
          }),
        ]);
        if (!latestRes.ok || !listRes.ok) {
          return;
        }
        const latestData = (await latestRes.json()) as GhRelease;
        const listData = (await listRes.json()) as GhRelease[];
        if (cancelled) {
          return;
        }
        setLatest(latestData);
        const stable = listData.filter((r) => !r.draft && !r.prerelease);
        setReleases(stable.length > 0 ? stable : [latestData]);
        setLive(true);
      } catch {
        // keep fallback content visible
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloads = buildDownloads(latest);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    applicationCategory: "ProductivityApplication",
    author: {
      "@type": "Organization",
      name: "parazeeknova",
      url: "https://github.com/parazeeknova",
    },
    description:
      "Verso is a self-hosted personal knowledge base, blog, and portfolio with two access tiers: a public portfolio and blog, and an authenticated markdown workspace with RAG, OCR, and capture channels.",
    downloadUrl: downloads.map((d) => d.href),
    name: "Verso",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    operatingSystem: "macOS, Windows, Linux",
    sameAs: [GH],
    softwareVersion: stripV(latest.tag_name),
    url: "https://przknv.cc/about",
  };
  const desktopKeys = new Set<DownloadKey>(["appimage", "deb", "linux", "mac", "rpm", "win"]);
  const managerKeys = new Set<DownloadKey>(["arch", "nix"]);
  const containerKeys = new Set<DownloadKey>(["serve", "web"]);

  const desktop = downloads.filter((d) => desktopKeys.has(d.key));
  const managers = downloads.filter((d) => managerKeys.has(d.key));
  const containers = downloads.filter((d) => containerKeys.has(d.key));

  const renderCard = (d: DownloadLink) => (
    <a
      className={`group flex flex-col gap-2 border p-4 transition-colors ${t("border-border-dark/30 hover:border-border-dark hover:bg-white/3", "border-border-light/30 hover:border-border-light hover:bg-black/3")}`}
      href={d.href}
      key={d.key}
      rel="noopener noreferrer"
      style={{
        background: isDarkMode
          ? "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01), transparent)"
          : "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01), transparent)",
      }}
      target="_blank"
    >
      <div className="flex items-center gap-2">
        <DownloadIcon className={t("text-text-dark/60", "text-text-light/60")} k={d.key} />
        <span className="text-sm lowercase font-bold">{d.name}</span>
      </div>
      <span className={`text-[11px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}>
        {d.detail}
      </span>
      {d.ref ? (
        <code
          className={`mt-auto text-[11px] lowercase break-all ${t("text-text-dark/55", "text-text-light/55")}`}
          style={{ fontFamily: "'Ubuntu Mono', monospace" }}
        >
          {d.ref}
        </code>
      ) : (
        <span
          className={`mt-auto text-[11px] lowercase flex items-center gap-1 ${t("text-text-dark/30 group-hover:text-text-dark/60", "text-text-light/30 group-hover:text-text-light/60")}`}
        >
          download <ArrowSquareOutIcon size={12} />
        </span>
      )}
    </a>
  );

  return (
    <div
      className={`relative min-h-screen transition-colors duration-500 ease-out ${t("bg-bg-dark text-text-dark", "bg-bg-light text-text-light")}`}
    >
      <div aria-hidden="true" className="absolute left-0 top-0 h-px w-full" ref={topSentinelRef} />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      {/* Fixed scroll nav */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 pt-3 transition-transform duration-200 ease-out ${showFixedNav ? "translate-y-0" : "-translate-y-full"}`}
      >
        <nav
          className={`mx-auto max-w-180 px-4 sm:px-6 flex items-center justify-between border py-2 text-[13px] ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
          style={{
            backgroundImage: isDarkMode
              ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(180,180,180,0.02), rgba(255,255,255,0.04))"
              : "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.01), rgba(0,0,0,0.03))",
          }}
        >
          <a className="flex items-center gap-2 lowercase" href="/">
            <img alt="verso" className="h-4 w-4" src="/verso.svg" />
            verso
          </a>
          <div className="flex items-center gap-3">
            <a className="lowercase" href={`${GH}`}>
              github
            </a>
            <button
              className={t(
                "text-text-dark/30 hover:text-text-dark/60",
                "text-text-light/30 hover:text-text-light/60",
              )}
              onClick={toggleTheme}
              type="button"
            >
              {isDarkMode ? "light" : "dark"}
            </button>
          </div>
        </nav>
      </div>

      {/* === Markdown Document Body === */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-12 sm:pt-20 pb-8">
        {/* Inline nav / header bar */}
        <div
          className={`flex items-center justify-between border-b pb-3 mb-10 text-[13px] ${t("border-border-dark", "border-border-light")}`}
        >
          <a className="flex items-center gap-2 lowercase" href="/">
            <img alt="verso" className="h-4 w-4" src="/verso.svg" />
            verso
          </a>
          <div className="flex items-center gap-4 lowercase">
            <a href={`${GH}`}>github</a>
            <button
              className={t(
                "text-text-dark/30 hover:text-text-dark/60",
                "text-text-light/30 hover:text-text-light/60",
              )}
              onClick={toggleTheme}
              type="button"
            >
              {isDarkMode ? "light" : "dark"}
            </button>
          </div>
        </div>

        {/* # Hero heading */}
        <div className="flex items-start justify-between gap-4">
          <GradientText
            as="h1"
            className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] lowercase"
          >
            # one app.
            <br />
            two minds.
          </GradientText>
          <img alt="verso" className="h-20 w-20 shrink-0 sm:h-32 sm:w-32" src="/verso.svg" />
        </div>

        <p
          className={`mt-5 text-[14px] leading-relaxed lowercase ${t("text-text-dark/60", "text-text-light/60")}`}
        >
          a self-hosted personal knowledge base, blog, and portfolio built as one app with two
          access tiers. publicly it shows a portfolio and blog anyone can browse. behind
          authentication it becomes a full markdown editor and workspace for{" "}
          <strong className={t("text-text-dark/80", "text-text-light/80")}>
            notes, documents, and long-term memory
          </strong>
          , with docmost-style editing and workspace management.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            className={`flex items-center gap-2 border px-5 py-2.5 text-[13px] lowercase transition-colors ${t("border-border-dark bg-text-dark text-bg-dark hover:bg-text-dark/90", "border-border-light bg-text-light text-bg-light hover:bg-text-light/90")}`}
            href="https://przknv.cc"
            rel="noopener noreferrer"
            style={{
              backgroundImage: isDarkMode
                ? "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(180,180,180,0.06), rgba(255,255,255,0.1))"
                : "linear-gradient(135deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
            }}
            target="_blank"
          >
            preview
            <ArrowRightIcon size={14} />
          </a>
          <a
            className={`border px-5 py-2.5 text-[13px] lowercase transition-colors ${t("border-border-dark hover:bg-white/5", "border-border-light hover:bg-black/5")}`}
            href={`${GH}`}
            style={{
              backgroundImage: isDarkMode
                ? "linear-gradient(135deg, rgba(255,255,255,0.03), transparent)"
                : "linear-gradient(135deg, rgba(0,0,0,0.03), transparent)",
            }}
            target="_blank"
          >
            source
          </a>
        </div>

        {/* ## what is verso */}
        <section className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## what is verso
          </GradientText>

          <div className="space-y-3">
            <p
              className={`text-[13px] leading-relaxed lowercase ${t("text-text-dark/55", "text-text-light/55")}`}
            >
              the whole knowledge base is retrieval-augmented: markdown content is chunked,
              embedded, and stored in a vector index so it can be searched semantically and asked
              questions about directly, with recency-aware ranking so recent memory entries surface
              above older ones when relevant.
            </p>
            <p
              className={`text-[13px] leading-relaxed lowercase ${t("text-text-dark/55", "text-text-light/55")}`}
            >
              content can be captured from anywhere — a whatsapp message can save a note, attach a
              file, transcribe a voice memo, or edit existing content, with the same capture and
              chat flow also available through telegram and discord. photos of documents or
              handwritten notes are OCR&apos;d automatically into searchable text.
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <FeatureRow
              icon={
                <BrainIcon className={t("text-text-dark/50", "text-text-light/50")} size={18} />
              }
              title="private mind"
            >
              a full markdown workspace — notes, documents, and long-term memory — with
              docmost-style editing, workspace management, and a vector index over every page.
            </FeatureRow>
            <FeatureRow
              icon={
                <DeviceMobileIcon
                  className={t("text-text-dark/50", "text-text-light/50")}
                  size={18}
                />
              }
              title="capture from anywhere"
            >
              save notes, attach files, transcribe voice memos, or edit content straight from
              whatsapp, telegram, and discord.
            </FeatureRow>
            <FeatureRow
              icon={
                <DatabaseIcon className={t("text-text-dark/50", "text-text-light/50")} size={18} />
              }
              title="retrieval-augmented"
            >
              markdown is chunked, embedded, and indexed for semantic search and direct questions,
              ranked by recency so fresh memory floats up.
            </FeatureRow>
            <FeatureRow
              icon={<ScanIcon className={t("text-text-dark/50", "text-text-light/50")} size={18} />}
              title="automatic OCR"
            >
              photos of documents or handwritten notes are transcribed into searchable text without
              a manual step.
            </FeatureRow>
          </div>

          {/* ### two chat experiences */}
          <GradientText as="h3" className="text-lg sm:text-xl font-bold lowercase mt-10 mb-4">
            ### two chat experiences
          </GradientText>
          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureRow
              icon={
                <ChatCircleTextIcon
                  className={t("text-text-dark/50", "text-text-light/50")}
                  size={18}
                />
              }
              title="owner's chat"
            >
              one experience with full access to the private knowledge base, for the owner&apos;s
              own use across any of the messaging channels.
            </FeatureRow>
            <FeatureRow
              icon={
                <PlugsConnectedIcon
                  className={t("text-text-dark/50", "text-text-light/50")}
                  size={18}
                />
              }
              title="public chat"
            >
              a separate, deliberately limited chat embedded on the public portfolio. visitors ask
              about the owner and their work without ever touching private notes.
            </FeatureRow>
          </div>

          <blockquote
            className={`mt-8 border-l-2 pl-4 ${t("border-border-dark text-text-dark/60", "border-border-light text-text-light/60")}`}
          >
            <p className="leading-relaxed lowercase text-[14px]">
              in short, it&apos;s a personal knowledge system that remembers everything written into
              it and can be talked to — with a public face for visitors and a private mind for its
              owner, unified in a single app.
            </p>
          </blockquote>
        </section>

        {/* ## releases */}
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase">
              ## releases
            </GradientText>
            <span
              className={`text-[11px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              {live ? "fetched live from github" : "latest known release"}
            </span>
          </div>

          <div
            className={`mt-6 border p-5 flex flex-col gap-3 ${t("border-border-dark bg-white/3", "border-border-light bg-black/3")}`}
            style={{
              backgroundImage: isDarkMode
                ? "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01), transparent)"
                : "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01), transparent)",
            }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-bold lowercase ${t("text-text-dark/90", "text-text-light/90")}`}
                >
                  v{stripV(latest.tag_name)}
                </span>
                {latest.prerelease && (
                  <span
                    className={`text-[10px] lowercase border px-1.5 py-0.5 ${t("border-border-dark text-text-dark/50", "border-border-light text-text-light/50")}`}
                  >
                    pre-release
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}
              >
                {formatDate(latest.published_at)}
              </span>
            </div>
            <a
              className={`inline-flex items-center gap-1 text-[12px] lowercase w-fit ${t("text-text-dark/55 hover:text-text-dark/80", "text-text-light/55 hover:text-text-light/80")}`}
              href={latest.html_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              view release notes <ArrowSquareOutIcon size={12} />
            </a>
          </div>

          <div className="mt-4 flex flex-col">
            {releases.slice(0, 5).map((r, i) => (
              <a
                className={`flex items-center justify-between gap-4 py-2.5 border-b ${t("border-border-dark/40 hover:text-text-dark/80", "border-border-light/40 hover:text-text-light/80")} ${i === releases.length - 1 ? "border-b-0" : ""}`}
                href={r.html_url}
                key={r.tag_name}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="text-[13px] lowercase font-bold">v{stripV(r.tag_name)}</span>
                <span
                  className={`text-[11px] lowercase ml-auto ${t("text-text-dark/35", "text-text-light/35")}`}
                >
                  {formatDate(r.published_at)}
                </span>
                <ArrowSquareOutIcon
                  className={t("text-text-dark/30", "text-text-light/30")}
                  size={12}
                />
              </a>
            ))}
          </div>
        </section>

        {/* ## downloads */}
        <section className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-2">
            ## downloads
          </GradientText>
          <p
            className={`text-[12px] leading-relaxed lowercase mb-6 ${t("text-text-dark/45", "text-text-light/45")}`}
          >
            links update automatically with each release. currently pulling assets for{" "}
            <strong className={t("text-text-dark/70", "text-text-light/70")}>
              v{stripV(latest.tag_name)}
            </strong>
            .
          </p>

          {/* Desktop apps */}
          <h3 className="text-[12px] lowercase font-bold mb-3 flex items-center gap-2">
            <CloudArrowDownIcon
              className={t("text-text-dark/40", "text-text-light/40")}
              size={14}
            />
            desktop apps
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{desktop.map(renderCard)}</div>

          {/* Package managers */}
          <h3 className="text-[12px] lowercase font-bold mt-8 mb-3 flex items-center gap-2">
            <StackIcon className={t("text-text-dark/40", "text-text-light/40")} size={14} />
            package managers
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">{managers.map(renderCard)}</div>
          <p
            className={`text-[12px] leading-relaxed lowercase mt-3 ${t("text-text-dark/45", "text-text-light/45")}`}
          >
            arch (aur) and nix need a little extra setup. for nix add the flake to your home manager
            config and rebuild, and for arch clone the repo to build the aur package. both track the
            latest tagged release.
          </p>

          {/* Containers */}
          <h3 className="text-[12px] lowercase font-bold mt-8 mb-3 flex items-center gap-2">
            <CubeIcon className={t("text-text-dark/40", "text-text-light/40")} size={14} />
            containers
            <span
              className={`text-[10px] lowercase font-normal ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              (also :latest)
            </span>
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">{containers.map(renderCard)}</div>
          <p
            className={`text-[12px] leading-relaxed lowercase mt-3 ${t("text-text-dark/45", "text-text-light/45")}`}
          >
            these images run the server side of verso. use them to self-host your own instance
            behind a reverse proxy or on your own host.
          </p>
        </section>

        {/* ## self-hosted */}
        <section id="self-hosted" className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## self-hosted
          </GradientText>
          <div className="grid sm:grid-cols-5 gap-8">
            <div className="sm:col-span-3 flex flex-col gap-3">
              <blockquote
                className={`border-l-2 pl-4 ${t("border-border-dark text-text-dark/60", "border-border-light text-text-light/60")}`}
              >
                <p className="leading-relaxed lowercase text-[14px]">
                  fully self-hosted.{" "}
                  <strong className={t("text-text-dark/80", "text-text-light/80")}>
                    air-gap compatible
                  </strong>
                  . zero external dependencies. run verso on a raspberry pi, your homelab, or your
                  enterprise cluster.
                </p>
              </blockquote>
              <blockquote
                className={`border-l-2 pl-4 ${t("border-border-dark text-text-dark/50", "border-border-light text-text-light/50")}`}
              >
                <p className="text-[12px] lowercase">your data never leaves your server.</p>
              </blockquote>
              <blockquote
                className={`border-l-2 pl-4 ${t("border-border-dark text-text-dark/40", "border-border-light text-text-light/40")}`}
              >
                <p className="text-[11px] lowercase">
                  deploy with a single docker compose command. no kubernetes required. no cloud
                  account needed. ships as two lightweight containers — the web frontend and the go
                  backend — both available on ghcr.
                </p>
              </blockquote>
              <blockquote
                className={`border-l-2 pl-4 ${t("border-border-dark text-text-dark/35", "border-border-light text-text-light/35")}`}
              >
                <p className="text-[11px] lowercase">
                  runs on amd64 and arm64. tested on raspberry pi 5, hetzner vps, and your laptop.
                </p>
              </blockquote>
            </div>
            <div
              className={`sm:col-span-2 border p-4 text-[12px] leading-6 ${t("border-border-dark bg-white/3", "border-border-light bg-black/3")}`}
            >
              <div
                className={`text-[10px] lowercase mb-3 ${t("text-text-dark/30", "text-text-light/30")}`}
              >
                ```sh
              </div>
              <div>
                <span className={t("text-text-dark/25", "text-text-light/25")}>$</span> git clone
                https://github.com/parazeeknova/verso
              </div>
              <div>
                <span className={t("text-text-dark/25", "text-text-light/25")}>$</span> cd verso
              </div>
              <div>
                <span className={t("text-text-dark/25", "text-text-light/25")}>$</span> cp
                .env.example .env
              </div>
              <div>
                <span className={t("text-text-dark/25", "text-text-light/25")}>$</span> docker
                compose -f docker/docker-compose.yml up -d
              </div>
              <div
                className={`text-[10px] lowercase mt-3 ${t("text-text-dark/30", "text-text-light/30")}`}
              >
                ```
              </div>
            </div>
          </div>
        </section>

        {/* ## see verso in action */}
        <section className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## see verso in action
          </GradientText>
          <InteractivePreview />
        </section>

        {/* ## integrations */}
        <section className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## integrations
          </GradientText>
          <p
            className={`text-[13px] lowercase leading-relaxed mb-8 ${t("text-text-dark/50", "text-text-light/50")}`}
          >
            seamlessly embed and integrate with your existing tools. from diagrams to databases,
            bring all your content together.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
            {[
              { icon: FigmaLogoIcon, name: "figma" },
              { icon: TableIcon, name: "airtable" },
              { icon: GoogleDriveLogoIcon, name: "google drive" },
              { icon: GraphIcon, name: "mermaid" },
              { icon: PenIcon, name: "draw.io" },
              { icon: HighlighterCircleIcon, name: "excalidraw" },
              { icon: MicrosoftExcelLogoIcon, name: "google sheets" },
              { icon: PresentationIcon, name: "miro" },
              { icon: FileVideoIcon, name: "loom" },
              { icon: ChatCenteredTextIcon, name: "typeform" },
              { icon: MoonStarsIcon, name: "lumen" },
              { icon: GithubLogoIcon, name: "Github" },
            ].map(({ icon: Icon, name }) => (
              <div
                className={`flex flex-col items-center justify-center gap-1.5 border p-3 aspect-square transition-colors ${t("border-border-dark/30 hover:border-border-dark", "border-border-light/30 hover:border-border-light")}`}
                key={name}
                style={{
                  background: isDarkMode
                    ? "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01), transparent)"
                    : "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01), transparent)",
                }}
              >
                <Icon className={t("text-text-dark/35", "text-text-light/35")} size={20} />
                <span className="text-[10px] lowercase">{name}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {[
              {
                desc: "create flowcharts, UML, network diagrams, and org charts with hundreds of built-in shape libraries.",
                title: "draw.io",
              },
              {
                desc: "sketch ideas with a natural, hand-drawn style. perfect for quick whiteboarding and visual brainstorming.",
                title: "excalidraw",
              },
              {
                desc: "write diagrams using simple text syntax. mermaid turns markdown-like text into flowcharts, sequence diagrams, and more.",
                title: "mermaid",
              },
            ].map((card) => (
              <div
                className={`border p-4 flex flex-col gap-1.5 transition-colors ${t("border-border-dark/30 hover:border-border-dark hover:bg-white/3", "border-border-light/30 hover:border-border-light hover:bg-black/3")}`}
                key={card.title}
              >
                <h3 className="text-[12px] font-bold lowercase">{card.title}</h3>
                <p
                  className={`text-[11px] leading-relaxed lowercase ${t("text-text-dark/40", "text-text-light/40")}`}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          <div
            className={`flex items-center justify-center gap-2 px-4 ${t("text-text-dark/20", "text-text-light/20")}`}
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-px flex-1 bg-current opacity-30" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            <span className="h-px flex-1 bg-current opacity-30" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </div>
        </section>

        {/* ## changelog */}
        <section className="mt-16 pb-8">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## changelog
          </GradientText>
          <div className="space-y-10">
            {releases.slice(0, 4).map((r) => {
              const changes = parseChanges(r.body);
              const isCollapsed = collapsed.has(r.tag_name);
              const showAllChanges = showAll.has(r.tag_name);
              let visible: { hash?: string; label: string }[] = [];
              if (!isCollapsed) {
                visible =
                  showAllChanges || changes.length <= MAX_CHANGES
                    ? changes
                    : changes.slice(0, MAX_CHANGES);
              }
              const hiddenCount = changes.length - MAX_CHANGES;
              return (
                <div key={r.tag_name}>
                  <div className="flex items-baseline gap-3 border-b pb-2 mb-3">
                    <h3
                      className={`text-lg font-bold lowercase ${t("text-text-dark/65", "text-text-light/65")}`}
                    >
                      v{stripV(r.tag_name)}
                    </h3>
                    <span
                      className={`text-[11px] lowercase ${t("text-text-dark/35", "text-text-light/35")}`}
                    >
                      {formatDate(r.published_at)}
                    </span>
                    {changes.length > 0 && (
                      <button
                        className={`ml-auto text-[11px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
                        onClick={() => changelogToggle(setCollapsed, r.tag_name)}
                        type="button"
                      >
                        {isCollapsed ? "show changes" : "hide changes"}
                      </button>
                    )}
                  </div>
                  {changes.length > 0 ? (
                    !isCollapsed && (
                      <div>
                        <ul className="space-y-1.5">
                          {visible.map((c, i) => (
                            <li
                              className={`text-[12px] lowercase flex gap-2 ${t("text-text-dark/40", "text-text-light/40")}`}
                              key={`${r.tag_name}-${i}`}
                            >
                              <span
                                className={`select-none ${t("text-text-dark/25", "text-text-light/25")}`}
                              >
                                -
                              </span>
                              <span>{c.label}</span>
                              {c.hash && (
                                <code
                                  className={`ml-auto shrink-0 ${t("text-text-dark/25", "text-text-light/25")}`}
                                  style={{ fontFamily: "'Ubuntu Mono', monospace" }}
                                >
                                  {c.hash}
                                </code>
                              )}
                            </li>
                          ))}
                        </ul>
                        {changes.length > MAX_CHANGES && (
                          <button
                            className={`mt-2 text-[11px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
                            onClick={() => changelogToggle(setShowAll, r.tag_name)}
                            type="button"
                          >
                            {showAllChanges ? "show less" : `show ${hiddenCount} more`}
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <p
                      className={`text-[12px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}
                    >
                      see release notes for details.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ## get started */}
        <section className="mt-16 pb-8">
          <GradientText
            as="h2"
            className="text-3xl sm:text-5xl font-bold leading-[1.08] lowercase mb-5"
          >
            ### no subscriptions.
            <br />
            no lock-in. just yours.
          </GradientText>
          <p className={`text-[13px] lowercase ${t("text-text-dark/50", "text-text-light/50")}`}>
            free, open source, MIT licensed. set up in under two minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className={`flex items-center gap-2 border px-6 py-3 text-[13px] lowercase transition-colors ${t("border-border-dark bg-text-dark text-bg-dark hover:bg-text-dark/90", "border-border-light bg-text-light text-bg-light hover:bg-text-light/90")}`}
              href="/home"
              style={{
                backgroundImage: isDarkMode
                  ? "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))"
                  : "linear-gradient(135deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
              }}
            >
              start your wiki
              <ArrowRightIcon size={14} />
            </a>
            <a
              className={`flex items-center gap-2 border px-6 py-3 text-[13px] lowercase transition-colors ${t("border-border-dark hover:bg-white/5", "border-border-light hover:bg-black/5")}`}
              href={GH}
              style={{
                backgroundImage: isDarkMode
                  ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(180,180,180,0.02), transparent)"
                  : "linear-gradient(135deg, rgba(0,0,0,0.04), transparent)",
              }}
            >
              <GithubLogoIcon size={14} />
              fork on github
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="pb-10 pt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 overflow-visible">
          <div className={`border-t ${t("border-border-dark", "border-border-light")}`} />
          <div className="flex flex-col items-center pt-12 pb-4">
            <div className="flex items-end gap-4 sm:gap-6">
              <img alt="verso" className="h-16 sm:h-24 lg:h-28 mb-2 opacity-80" src="/verso.svg" />
              <GradientText
                as="h2"
                className="text-8xl lg:text-[10em] font-bold tracking-tight lowercase"
              >
                verso
              </GradientText>
            </div>
            <p
              className={`mt-4 text-[11px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              open source &middot; self-hosted &middot; yours
            </p>
            <p
              className={`mt-1 text-[10px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}
            >
              &copy; {new Date().getFullYear()} verso. open source &middot; MIT &middot; yours.
            </p>
            <div
              className={`mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] lowercase ${t("text-text-dark/35", "text-text-light/35")}`}
            >
              <a
                className={t("hover:text-text-dark/70", "hover:text-text-light/70")}
                href={`${GH}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                github
              </a>
              <a
                className={t("hover:text-text-dark/70", "hover:text-text-light/70")}
                href="https://przknv.cc"
                rel="noopener noreferrer"
                target="_blank"
              >
                demo
              </a>
              <a
                className={t("hover:text-text-dark/70", "hover:text-text-light/70")}
                href="https://itssingularity.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                made possible via singularity works
              </a>
              <a
                className={t("hover:text-text-dark/70", "hover:text-text-light/70")}
                href="https://asocialmedia.cc"
                rel="noopener noreferrer"
                target="_blank"
              >
                asocialmedia.cc
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
