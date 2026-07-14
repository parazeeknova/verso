import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  ArrowRightIcon,
  BellIcon,
  ChatCenteredTextIcon,
  FigmaLogoIcon,
  FileVideoIcon,
  GitForkIcon,
  GithubLogoIcon,
  GoogleDriveLogoIcon,
  GraphIcon,
  HighlighterCircleIcon,
  MagnifyingGlassIcon,
  MicrosoftExcelLogoIcon,
  MoonStarsIcon,
  PenIcon,
  PresentationIcon,
  SidebarSimpleIcon,
  TableIcon,
} from "@phosphor-icons/react";

interface GradientTextProps {
  as?: "h1" | "h2" | "h3" | "span";
  children: React.ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}

const GradientText = ({
  as: Tag = "h2",
  children,
  className = "",
  from,
  via,
  to,
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
      {/* Mini editor with slash command */}
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
      {/* Slash dropdown */}
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
      {/* Mini editor with mention */}
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
      {/* Mentions dropdown */}
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
      {/* Search bar */}
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
      {/* Quick filters */}
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
      {/* Results */}
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
      {/* Rich toolbar */}
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
      {/* Editor content */}
      <div
        className={`border p-2.5 text-[10px] leading-5 space-y-2 ${t("border-border-dark bg-white/2", "border-border-light bg-black/2")}`}
      >
        {/* Heading */}
        <div
          className={`text-[12px] font-bold border-b pb-1 ${t("border-border-dark/30", "border-border-light/30")}`}
        >
          deployment guide
        </div>
        {/* Paragraph with cursor */}
        <div className={t("text-text-dark/55", "text-text-light/55")}>
          this guide covers setting up verso for production. follow each step carefully.
          <span
            className={`inline-block w-1 h-3 ml-0.5 animate-pulse ${t("bg-text-dark/40", "bg-text-light/40")}`}
          />
        </div>
        {/* Mini table */}
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
        {/* Code block */}
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
      {/* Left: demo list with progress bars */}
      <div className="flex flex-col gap-3">
        {DEMOS.map((demo, i) => (
          <button
            className={`relative text-left border px-4 py-3 transition-colors lowercase overflow-hidden ${i === active ? t("border-border-dark bg-white/5", "border-border-light bg-black/5") : t("border-border-dark/30 hover:border-border-dark hover:bg-white/3", "border-border-light/30 hover:border-border-light hover:bg-black/3")}`}
            key={demo.title}
            onClick={() => setActive(i)}
            type="button"
          >
            {/* Progress bar */}
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

      {/* Right: animated preview */}
      <div ref={previewRef}>
        <div className={`border h-full min-h-75 ${t("border-border-dark", "border-border-light")}`}>
          {/* Window chrome */}
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

          {/* Preview content */}
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

const FEATURES = [
  {
    desc: "runs on your own infrastructure. air-gap compatible. your data never leaves your server.",
    label: "self-hosted",
  },
  {
    desc: "multiple users edit the same page simultaneously. crdt-based, conflict-free merging.",
    label: "real-time sync",
  },
  {
    desc: "separate workspaces per team or project. granular access control at every level.",
    label: "spaces & permissions",
  },
  {
    desc: "structure your knowledge to any depth. drag & drop to reorganize entire hierarchies.",
    label: "nested pages",
  },
  {
    desc: "discuss in context. resolve threads. keep the full history of every conversation.",
    label: "inline comments",
  },
  {
    desc: "MIT licensed. fork it, modify it, audit every line. no vendor lock-in ever.",
    label: "open source",
  },
];

export const LandingPage = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showFixedNav, setShowFixedNav] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  useEffect(() => {
    const onScroll = () => setShowFixedNav(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              { opacity: 0, y: 20 },
              { duration: 0.5, ease: "power2.out", opacity: 1, y: 0 },
            );
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );

    for (const el of sections) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (showFixedNav) {
      gsap.fromTo(
        ".fixed-nav-inner",
        { opacity: 0, y: -8 },
        { duration: 0.15, ease: "power2.out", opacity: 1, y: 0 },
      );
    }
  }, [showFixedNav]);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ease-out ${t("bg-bg-dark text-text-dark", "bg-bg-light text-text-light")}`}
    >
      {/* Fixed scroll nav */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 pt-3 transition-transform duration-200 ease-out ${showFixedNav ? "translate-y-0" : "-translate-y-full"}`}
      >
        <nav
          className={`fixed-nav-inner mx-auto max-w-180 px-4 sm:px-6 flex items-center justify-between border py-2 text-[13px] ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
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
            <a className="lowercase" href="https://github.com/parazeeknova/verso">
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
            <a href="https://github.com/parazeeknova/verso">github</a>
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
        <GradientText
          as="h1"
          className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] lowercase"
        >
          # your wiki, your server.
          <br />
          your knowledge.
        </GradientText>

        <p
          className={`mt-5 text-[14px] leading-relaxed lowercase ${t("text-text-dark/60", "text-text-light/60")}`}
        >
          a personal knowledge base and folio, blog for public face & private brain, one app. write,
          organize, and publish your thinking —{" "}
          <strong className={t("text-text-dark/80", "text-text-light/80")}>in real-time</strong>,
          with{" "}
          <strong className={t("text-text-dark/80", "text-text-light/80")}>full control</strong>{" "}
          over your data. no subscriptions. no lock-in. just yours.
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
            href="#self-hosted"
            style={{
              backgroundImage: isDarkMode
                ? "linear-gradient(135deg, rgba(255,255,255,0.03), transparent)"
                : "linear-gradient(135deg, rgba(0,0,0,0.03), transparent)",
            }}
          >
            self-host it
          </a>
          <span
            className={`text-[11px] lowercase self-center ${t("text-text-dark/30", "text-text-light/30")}`}
          >
            open-source alternative to notion and confluence
          </span>
        </div>

        {/* --- App preview --- */}
        <div className={`mt-12 border ${t("border-border-dark", "border-border-light")}`}>
          {/* Navbar */}
          <div
            className={`flex items-center gap-2 border-b px-2 py-1.5 text-[10px] ${t("border-border-dark", "border-border-light")}`}
          >
            <SidebarSimpleIcon className={t("text-text-dark/30", "text-text-light/30")} size={8} />
            <span className="lowercase">verso</span>
            <span className={t("text-text-dark/20", "text-text-light/20")}>/</span>
            <span className="lowercase">home</span>
            <span className={t("text-text-dark/20", "text-text-light/20")}>/</span>
            <span className="lowercase">public</span>
            <span className={t("text-text-dark/20", "text-text-light/20")}>/</span>
            <span className="lowercase">blogs</span>
            <div
              className={`mx-auto flex items-center gap-1 max-w-30 border-b px-1 py-0.5 ${t("border-border-dark/30", "border-border-light/30")}`}
            >
              <MagnifyingGlassIcon
                className={t("text-text-dark/20", "text-text-light/20")}
                size={8}
              />
              <span className={t("text-text-dark/25", "text-text-light/25")}>search</span>
            </div>
            <BellIcon className={t("text-text-dark/30", "text-text-light/30")} size={8} />
            <span className={t("text-text-dark/40", "text-text-light/40")}>@you</span>
          </div>

          {/* Body: sidebar + main */}
          <div className="flex min-h-65">
            {/* Sidebar */}
            <div
              className={`hidden sm:flex w-24 sm:w-32 shrink-0 border-r flex-col text-[10px] ${t("border-border-dark", "border-border-light")}`}
            >
              <div
                className={`flex items-center justify-center gap-1 border-b px-1 py-1.5 ${t("border-border-dark", "border-border-light")}`}
              >
                <span className={`lowercase ${t("text-text-dark/60", "text-text-light/60")}`}>
                  spaces
                </span>
                <span className={t("text-text-dark/20", "text-text-light/20")}>|</span>
                <span className={`lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
                  favs
                </span>
                <span className={t("text-text-dark/20", "text-text-light/20")}>|</span>
                <span className={`lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
                  me
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="p-1.5 space-y-1">
                  <div className={`lowercase ${t("text-text-dark/50", "text-text-light/50")}`}>
                    engineering
                  </div>
                  <div className={`lowercase pl-2 ${t("text-text-dark/35", "text-text-light/35")}`}>
                    handbook.md
                  </div>
                  <div className={`lowercase pl-2 ${t("text-text-dark/25", "text-text-light/25")}`}>
                    runbooks.md
                  </div>
                  <div className="mt-2 lowercase">api docs</div>
                  <div className={`lowercase pl-2 ${t("text-text-dark/25", "text-text-light/25")}`}>
                    rest.md
                  </div>
                  <div className="mt-2 lowercase">onboarding</div>
                </div>
                <div className={`border-t p-1.5 ${t("border-border-dark", "border-border-light")}`}>
                  <div className={`lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
                    help
                  </div>
                  <div className={`lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
                    settings
                  </div>
                </div>
              </div>
            </div>

            {/* Main: editor split */}
            <div className="flex-1 flex flex-col">
              <div
                className={`flex items-center justify-between border-b px-2 py-1 text-[9px] ${t("border-border-dark text-text-dark/30", "border-border-light text-text-light/30")}`}
              >
                <span>~/verso/engineering/handbook.md</span>
              </div>
              <div className="flex-1 grid grid-cols-2">
                {/* Source pane */}
                <div className={t("border-border-dark", "border-border-light")}>
                  <div
                    className={`border-b px-2 py-0.5 text-[8px] lowercase ${t("border-border-dark text-text-dark/25", "border-border-light text-text-light/25")}`}
                  >
                    source.md
                  </div>
                  <div className="p-2 text-[10px] leading-5">
                    {[
                      " 1  # handbook",
                      " 2",
                      " 3  welcome to the wiki",
                      " 4",
                      " 5  ## principles",
                      " 6",
                      " 7  - self-hosted",
                      " 8  - no external deps",
                      " 9  - docs as build step",
                      "10",
                      "11  ## runbooks",
                      "12",
                      "13  > see incidents.md",
                      "14  |",
                    ].map((line, i) => (
                      <div className={i === 13 ? "animate-pulse" : ""} key={i}>
                        <span className={t("text-text-dark/20", "text-text-light/20")}>
                          {line.slice(0, 2)}
                        </span>
                        <span className={t("text-text-dark/50", "text-text-light/50")}>
                          {line.slice(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Preview pane */}
                <div>
                  <div
                    className={`border-b px-2 py-0.5 text-[8px] lowercase ${t("border-border-dark text-text-dark/25", "border-border-light text-text-light/25")}`}
                  >
                    preview
                  </div>
                  <div className="p-2 text-[10px] leading-5 space-y-1.5">
                    <h3
                      className={`text-[11px] font-bold border-b pb-0.5 ${t("border-border-dark", "border-border-light")}`}
                    >
                      handbook
                    </h3>
                    <p className={t("text-text-dark/55", "text-text-light/55")}>
                      welcome to the wiki for the platform team.
                    </p>
                    <h4 className="text-[10px] font-bold lowercase">principles</h4>
                    <ul className="space-y-0">
                      <li className={`${t("text-text-dark/45", "text-text-light/45")}`}>
                        - self-hosted
                      </li>
                      <li className={`${t("text-text-dark/45", "text-text-light/45")}`}>
                        - no external deps
                      </li>
                      <li className={`${t("text-text-dark/45", "text-text-light/45")}`}>
                        - docs as build
                      </li>
                    </ul>
                    <h4 className="text-[10px] font-bold lowercase">runbooks</h4>
                    <blockquote
                      className={`border-l pl-1.5 ${t("border-border-dark text-text-dark/45", "border-border-light text-text-light/45")}`}
                    >
                      see incidents.md
                    </blockquote>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div
            className={`flex items-center justify-between border-t px-2 py-1 text-[8px] ${t("border-border-dark text-text-dark/20", "border-border-light text-text-light/20")}`}
          >
            <span>crdt &middot; utf-8</span>
            <span>3 editors online &middot; ln 14, col 1</span>
          </div>
        </div>

        {/* ## features */}
        <section id="features" className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## features
          </GradientText>
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            ref={(el) => {
              sectionRefs.current[0] = el;
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.label}>
                <div
                  className={`border-b pb-2 mb-2 ${t("border-border-dark", "border-border-light")}`}
                >
                  <h3 className="text-sm lowercase font-bold">{f.label}</h3>
                </div>
                <p
                  className={`text-[12px] leading-relaxed lowercase ${t("text-text-dark/45", "text-text-light/45")}`}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ## self-hosted */}
        <section id="self-hosted" className="mt-16">
          <GradientText as="h2" className="text-2xl sm:text-3xl font-bold lowercase mb-6">
            ## self-hosted
          </GradientText>
          <div
            className="grid sm:grid-cols-5 gap-8"
            ref={(el) => {
              sectionRefs.current[1] = el;
            }}
          >
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

          {/* External integrations grid */}
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

          {/* Diagramming tool cards */}
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

          {/* Timeline bar */}
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
              href="https://github.com/parazeeknova/verso"
              style={{
                backgroundImage: isDarkMode
                  ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(180,180,180,0.02), transparent)"
                  : "linear-gradient(135deg, rgba(0,0,0,0.04), transparent)",
              }}
            >
              <GitForkIcon size={14} />
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
          </div>
        </div>
      </footer>
    </div>
  );
};
