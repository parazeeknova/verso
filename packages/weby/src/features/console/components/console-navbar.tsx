import { gsap } from "gsap";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useDebouncedState } from "@tanstack/react-pacer";
import { useEffect, useRef, useState } from "react";
import type { Stats } from "#/shared/types";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import { useAuth, useAuthActions } from "#/features/auth/hooks/use-auth";
import { useTheme } from "#/shared/hooks/use-theme";
import { useSpaceBySlug, useSpaces } from "#/features/console/hooks/use-spaces";
import { useWorkspaces } from "#/features/console/hooks/use-workspaces";
import { useConsoleContext } from "./console-context";
import { NotificationBell } from "./notification-bell";
import {
  CaretDownIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  SidebarIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";

interface ConsoleNavbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

interface ProfileDropdownProps {
  isDarkMode: boolean;
  logout: () => void;
  navigate: ReturnType<typeof useNavigate>;
  selectedWorkspace: { icon: string; name: string } | undefined;
  stats: Stats | undefined;
  user:
    | { avatar_url: string; email: string; isOwner: boolean; name: string; username: string }
    | null
    | undefined;
  workspaceName: string;
}

const ProfileDropdown = ({
  isDarkMode,
  logout,
  navigate,
  selectedWorkspace,
  stats,
  user,
  workspaceName,
}: ProfileDropdownProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) {
      return;
    }
    const inner = dropdownRef.current.querySelector(":scope > div");
    if (inner) {
      gsap.fromTo(
        inner,
        { opacity: 0, scale: 0.98, y: -4 },
        { duration: 0.15, ease: "power2.out", opacity: 1, scale: 1, y: 0 },
      );
    }
  }, [dropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center gap-1.5 lowercase ${t("text-text-dark/50 hover:text-text-dark/80", "text-text-light/50 hover:text-text-light/80")}`}
        onClick={() => setDropdownOpen((o) => !o)}
        type="button"
      >
        <AvatarBadge
          className={`w-4 h-4 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
          icon={selectedWorkspace?.icon}
          name={selectedWorkspace?.name ?? workspaceName}
        />
        {workspaceName}
      </button>

      {dropdownOpen && (
        <div
          className={`absolute right-0 top-full z-50 mt-1 w-52 border shadow-xl ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
        >
          <div className="py-1">
            {/* Workspace actions */}
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
              onClick={() => {
                setDropdownOpen(false);
                void navigate({ search: { name: undefined }, to: "/settings/workspace" });
              }}
              type="button"
            >
              <GearSixIcon size={12} />
              workspace settings
            </button>
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
              onClick={() => {
                setDropdownOpen(false);
                void navigate({ to: "/settings/members" });
              }}
              type="button"
            >
              <UsersIcon size={12} />
              manage members
            </button>

            {/* User details */}
            <div
              className={`border-y my-1 px-3 pb-2 pt-1.5 ${t("border-border-dark", "border-border-light")}`}
            >
              <div className="flex items-center gap-2">
                <AvatarBadge
                  className={`w-6 h-6 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
                  icon={user?.avatar_url}
                  name={user?.name || user?.username || "?"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center min-w-0">
                      <p
                        className={`text-[13px] truncate ${t("text-text-dark", "text-text-light")}`}
                      >
                        {user?.name || user?.username}
                      </p>
                      {user?.isOwner && (
                        <span
                          className={`ml-1.5 inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide ${t("bg-white/10 text-text-dark/50", "bg-black/5 text-text-light/50")}`}
                        >
                          owner
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] shrink-0 truncate max-w-20 ${t("text-text-dark/40", "text-text-light/40")}`}
                    >
                      @{user?.username}
                    </p>
                  </div>
                  <p className={`text-[10px] ${t("text-text-dark/30", "text-text-light/30")}`}>
                    {user?.email}
                  </p>
                </div>
              </div>
              {stats && (
                <p className={`mt-1 text-[11px] ${t("text-text-dark/20", "text-text-light/20")}`}>
                  pg {stats.pages} &middot; pts {stats.posts} &middot; rmd {stats.readmes}
                </p>
              )}
            </div>

            {/* Profile actions */}
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
              onClick={() => {
                setDropdownOpen(false);
                void navigate({ to: "/settings/account/profile" });
              }}
              type="button"
            >
              <UserIcon size={12} />
              my profile
            </button>
            <button
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
              onClick={() => {
                setDropdownOpen(false);
                void navigate({ to: "/settings/account/preferences" });
              }}
              type="button"
            >
              <SlidersHorizontalIcon size={12} />
              my preferences
            </button>

            <div className={`border-t ${t("border-border-dark", "border-border-light")}`}>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] lowercase text-red-400 hover:bg-red-400/5"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                type="button"
              >
                <SignOutIcon size={12} />
                logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SpaceBreadcrumbProps {
  isDarkMode: boolean;
  navigate: ReturnType<typeof useNavigate>;
  selectedWorkspace: { icon: string; id: string; name: string } | undefined;
  workspaces: { icon: string; id: string; name: string }[] | undefined;
  spaceSlug: string;
}

const SpaceBreadcrumb = ({
  isDarkMode,
  navigate,
  selectedWorkspace,
  workspaces,
  spaceSlug,
}: SpaceBreadcrumbProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: spaces } = useSpaces(selectedWorkspace?.id ?? "");
  const { data: currentSpace } = useSpaceBySlug(spaceSlug);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [spMenuOpen, setSpMenuOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const spRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsMenuOpen) {
      return;
    }
    const h = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [wsMenuOpen]);

  useEffect(() => {
    if (!spMenuOpen) {
      return;
    }
    const h = (e: MouseEvent) => {
      if (spRef.current && !spRef.current.contains(e.target as Node)) {
        setSpMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [spMenuOpen]);

  return (
    <div className="flex items-center gap-1">
      <a
        className={`lowercase ${t("text-text-dark/50 hover:text-text-dark", "text-text-light/50 hover:text-text-light")}`}
        href="/home"
      >
        <img alt="verso" className="h-3.5 w-3.5" src="/verso.svg" />
      </a>

      <span className={t("text-text-dark/15", "text-text-light/15")}>/</span>

      <div className="relative" ref={wsRef}>
        <button
          className={`flex items-center gap-1.5 lowercase text-[12px] ${t("text-text-dark/50 hover:text-text-dark", "text-text-light/50 hover:text-text-light")}`}
          onClick={() => setWsMenuOpen((o) => !o)}
          type="button"
        >
          <AvatarBadge
            className={`w-5 h-5 ${t("bg-white/10 text-text-dark/50", "bg-black/5 text-text-light/50")}`}
            icon={selectedWorkspace?.icon}
            initialsClass={`text-[9px] font-semibold ${t("text-text-dark/60", "text-text-light/60")}`}
            name={selectedWorkspace?.name ?? "..."}
          />
          {selectedWorkspace?.name ?? "..."}
          <CaretDownIcon size={10} />
        </button>
        {wsMenuOpen && (
          <div
            className={`absolute left-0 top-full mt-1 border p-1.5 z-50 shadow-lg w-44 max-h-48 overflow-y-auto ${t("border-border-dark bg-text-light", "border-border-light bg-[#e0e0e0]")}`}
          >
            {workspaces?.map((w) => (
              <button
                className={`flex w-full items-center gap-1.5 px-1.5 py-1 text-left text-[11px] lowercase ${w.id === selectedWorkspace?.id ? t("text-text-dark", "text-text-light") : t("text-text-dark/50 hover:text-text-dark", "text-text-light/50 hover:text-text-light")}`}
                key={w.id}
                onClick={() => {
                  setWsMenuOpen(false);
                }}
                type="button"
              >
                <AvatarBadge
                  className={`mx-0.5 h-5 w-5 ${t("bg-white/10 text-text-dark/50", "bg-black/5 text-text-light/50")}`}
                  icon={w.icon}
                  initialsClass={`text-[9px] font-semibold ${t("text-text-dark/60", "text-text-light/60")}`}
                  name={w.name}
                />
                <span className="truncate">{w.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className={t("text-text-dark/15", "text-text-light/15")}>/</span>

      <div className="relative" ref={spRef}>
        <button
          className={`flex items-center gap-1.5 lowercase text-[12px] ${t("text-text-dark/70 hover:text-text-dark", "text-text-light/70 hover:text-text-light")}`}
          onClick={() => setSpMenuOpen((o) => !o)}
          type="button"
        >
          <AvatarBadge
            className={`w-5 h-5 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
            icon={currentSpace?.icon}
            initialsClass={`text-[9px] font-semibold ${t("text-text-dark/60", "text-text-light/60")}`}
            name={currentSpace?.name ?? spaceSlug}
          />
          <span className="truncate max-w-25">{currentSpace?.name ?? spaceSlug}</span>
          <CaretDownIcon size={10} />
        </button>
        {spMenuOpen && (
          <div
            className={`absolute left-0 top-full mt-1 border p-1.5 z-50 shadow-lg w-44 max-h-48 overflow-y-auto ${t("border-border-dark bg-text-light", "border-border-light bg-[#e0e0e0]")}`}
          >
            {spaces?.map((s) => (
              <button
                className={`flex w-full items-center gap-1.5 px-1.5 py-1 text-left text-[11px] lowercase ${s.id === currentSpace?.id ? t("text-text-dark", "text-text-light") : t("text-text-dark/50 hover:text-text-dark", "text-text-light/50 hover:text-text-light")}`}
                key={s.id}
                onClick={() => {
                  setSpMenuOpen(false);
                  navigate({ to: `/s/${s.slug}` });
                }}
                type="button"
              >
                <AvatarBadge
                  className={`mx-0.5 h-5 w-5 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
                  icon={s.icon}
                  initialsClass={`text-[9px] font-semibold ${t("text-text-dark/60", "text-text-light/60")}`}
                  name={s.name}
                />
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConsoleNavbar = ({ onToggleSidebar, sidebarOpen }: ConsoleNavbarProps) => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { data: user } = useAuth();
  const { logout } = useAuthActions();
  const { isDarkMode, toggleTheme } = useTheme();
  const { selectedWorkspaceId } = useConsoleContext();
  const { data: workspaces } = useWorkspaces();

  const selectedWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId);
  const workspaceName = selectedWorkspace?.name ?? user?.username ?? "...";
  const isSpaceRoute = routerState.location.pathname.startsWith("/s/");
  const spaceSlug = isSpaceRoute
    ? routerState.location.pathname.replace("/s/", "").split("/")[0]
    : "";
  const [searchQuery, setSearchQuery] = useDebouncedState("", { wait: 150 });

  const { data: stats } = useQuery<Stats>({
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/stats", { signal });
      if (!r.ok) {
        throw new Error("Failed to fetch stats");
      }
      return r.json() as Promise<Stats>;
    },
    queryKey: ["stats"],
    staleTime: 5 * 60 * 1000,
  });

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  return (
    <nav
      className={`sticky top-0 z-50 flex h-10 items-center gap-3 border-b px-3 text-[13px] transition-colors duration-500 ease-out ${t("border-border-dark", "border-border-light")} ${isDarkMode ? "bg-text-light" : "bg-[#e5e5e5]"}`}
    >
      {/* Left: sidebar toggle + brand */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          className={`flex items-center lowercase ${t("text-text-dark/50 hover:text-text-dark/80", "text-text-light/50 hover:text-text-light/80")}`}
          onClick={onToggleSidebar}
          type="button"
        >
          {sidebarOpen ? <SidebarSimpleIcon size={14} /> : <SidebarIcon size={14} />}
        </button>
        {isSpaceRoute ? (
          <SpaceBreadcrumb
            isDarkMode={isDarkMode}
            navigate={navigate}
            selectedWorkspace={
              selectedWorkspace
                ? {
                    icon: selectedWorkspace.icon,
                    id: selectedWorkspace.id,
                    name: selectedWorkspace.name,
                  }
                : undefined
            }
            spaceSlug={spaceSlug}
            workspaces={workspaces}
          />
        ) : (
          <a
            className={`flex items-center gap-1.5 lowercase mr-1 md:mr-3 ${t("text-text-dark/70 hover:text-text-dark", "text-text-light/70 hover:text-text-light")}`}
            href="/home"
          >
            <img alt="verso" className="h-3.5 w-3.5" src="/verso.svg" />
            verso
          </a>
        )}
      </div>

      {/* Middle: search */}
      <div className="mx-auto flex w-full max-w-40 md:max-w-md items-center gap-2">
        <MagnifyingGlassIcon className={t("text-text-dark/20", "text-text-light/20")} size={12} />
        <input
          aria-label="Search"
          className={`w-full bg-transparent py-1 text-[13px] lowercase outline-none ${t("placeholder:text-text-dark/20", "placeholder:text-text-light/20")}`}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="search"
          style={{
            borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
          }}
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Right: notification + profile dropdown */}
      <div className="flex items-center gap-3">
        {/* Theme toggle — desktop only */}
        <button
          aria-label="Toggle theme"
          className={`hidden md:block lowercase ${t("text-text-dark/30 hover:text-text-dark/60", "text-text-light/30 hover:text-text-light/60")}`}
          onClick={toggleTheme}
          type="button"
        >
          {isDarkMode ? "light" : "dark"}
        </button>

        <NotificationBell isDarkMode={isDarkMode} />

        <ProfileDropdown
          isDarkMode={isDarkMode}
          logout={logout}
          navigate={navigate}
          selectedWorkspace={selectedWorkspace}
          stats={stats}
          user={user}
          workspaceName={workspaceName}
        />
      </div>
    </nav>
  );
};
