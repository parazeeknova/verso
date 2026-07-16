import {
  ChatCenteredTextIcon,
  ClockCounterClockwiseIcon,
  CommandIcon,
  ControlIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  HouseSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { detectPlatform } from "@tanstack/hotkeys";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { useTheme } from "#/shared/hooks/use-theme";
import { useSpaceBySlug } from "#/features/console/hooks/use-spaces";
import { ConsoleContext } from "./console-context";
import { FlashToast, setFlashToast } from "./flash-toast";
import { ConsoleNavbar } from "./console-navbar";
import { DebugSidebar } from "./debug/sidebar";
import { FloatingSidebar } from "./floating-sidebar";
import { SettingsSidebar } from "./settings-sidebar";
import { SidebarFooter } from "./sidebar-footer";
import { SpaceSidebar } from "#/features/space/components/space-sidebar";
import { useConsoleStore } from "#/features/console/stores/console-store";
import { useConsoleBootstrap } from "#/features/console/hooks/use-console-bootstrap";
import { FileTreeSidebar } from "./file-tree-sidebar";
import { useCreatePage } from "#/features/console/hooks/use-pages";

const SIDEBAR_WIDTH = 280;

const platform = detectPlatform();
const ModIcon = platform === "mac" ? CommandIcon : ControlIcon;

const NAV_ROUTES = [
  { href: "/home", icon: HouseSimpleIcon, label: "home", shortcut: "1" },
  { href: "/projects", icon: GlobeSimpleIcon, label: "public", shortcut: "2" },
  { href: "/blogs", icon: ChatCenteredTextIcon, label: "blogs", shortcut: "3" },
] as const;

export const ConsoleLayout = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const [debugSearch, setDebugSearch] = useState("");
  const { sidebarOpen, toggleSidebar: toggleSidebarStore } = useConsoleStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);
  const { data: user } = useAuth();

  const {
    selectedWorkspaceId,
    selectedSpaceId,
    selectedPageId,
    setSelectedWorkspaceId,
    setSelectedSpaceId,
    setSelectedPageId,
  } = useConsoleStore();

  const createPage = useCreatePage();
  const handleCreatePage = useCallback(() => {
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    const slug = `untitled-page-${randomSuffix}`;
    createPage.mutate(
      {
        slugId: slug,
        spaceId: "",
        title: "untitled page",
        workspaceId: selectedWorkspaceId || "",
      },
      {
        onError: (error) => {
          const errMsg = error instanceof Error ? error.message : String(error);
          setFlashToast(`failed to create page: ${errMsg}`);
        },
        onSuccess: (data) => {
          navigate({
            params: { pageid: data.slugId, spaceSlug: "nospace" },
            to: "/s/$spaceSlug/p/$pageid",
          });
        },
      },
    );
  }, [selectedWorkspaceId, createPage, navigate]);

  const { currentWorkspace } = useConsoleBootstrap();

  const isDebugRoute = routerState.location.pathname === "/home/debug";
  const isSettingsRoute = routerState.location.pathname.startsWith("/settings");
  const isSettingsDebugRoute = routerState.location.pathname === "/settings/systems/debug";
  const isSpaceRoute = routerState.location.pathname.startsWith("/s/");
  const isProfileRoute = routerState.location.pathname === "/settings/account/profile";
  const isPreferencesRoute = routerState.location.pathname === "/settings/account/preferences";
  const isWorkspaceRoute = routerState.location.pathname === "/settings/workspace";
  const isMembersRoute = routerState.location.pathname === "/settings/members";
  const isSpacesRoute = routerState.location.pathname === "/settings/spaces";
  const isGroupsRoute = routerState.location.pathname === "/settings/groups";
  const debugSelectedTable =
    ((routerState.location.search as Record<string, unknown> | undefined)?.table as string) ?? null;
  const debugSelectedTab =
    ((routerState.location.search as Record<string, unknown> | undefined)?.tab as
      | "database"
      | "storage"
      | undefined) ?? "database";

  const isSpecialRoute = isDebugRoute || isSettingsRoute || isSpaceRoute;

  const spaceSlug = isSpaceRoute
    ? routerState.location.pathname.replace("/s/", "").split("/")[0]
    : "";
  const { data: currentSpace } = useSpaceBySlug(spaceSlug);

  useLayoutEffect(() => {
    if (mainRef.current) {
      if (isSpecialRoute) {
        gsap.fromTo(
          mainRef.current,
          { opacity: 0, x: 20 },
          { duration: 0.2, ease: "power2.out", opacity: 1, x: 0 },
        );
      } else {
        gsap.set(mainRef.current, { clearProps: "all" });
      }
    }
    if (sidebarContentRef.current) {
      if (isSpecialRoute) {
        gsap.fromTo(
          sidebarContentRef.current,
          { opacity: 0 },
          { duration: 0.2, ease: "power2.out", opacity: 1 },
        );
      } else {
        gsap.set(sidebarContentRef.current, { clearProps: "all" });
      }
    }
  }, [isSpecialRoute]);

  useHotkey("Mod+1", () => {
    window.location.href = "/home";
  });
  useHotkey("Mod+2", () => {
    window.location.href = "/#projects";
  });
  useHotkey("Mod+3", () => {
    window.location.href = "/#blogs";
  });

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const toggleSidebar = useCallback(() => {
    if (animatingRef.current || !sidebarRef.current) {
      return;
    }
    animatingRef.current = true;
    const open = !sidebarOpen;
    toggleSidebarStore();
    gsap.to(sidebarRef.current, {
      duration: 0.25,
      ease: "power2.inOut",
      onComplete: () => {
        animatingRef.current = false;
      },
      opacity: open ? 1 : 0,
      paddingLeft: open ? 16 : 0,
      paddingRight: open ? 16 : 0,
      width: open ? SIDEBAR_WIDTH : 0,
    });
  }, [sidebarOpen, toggleSidebarStore]);

  // Apply initial sidebar state before paint to prevent flash
  useLayoutEffect(() => {
    if (sidebarRef.current) {
      gsap.set(sidebarRef.current, {
        opacity: sidebarOpen ? 1 : 0,
        paddingLeft: sidebarOpen ? 16 : 0,
        paddingRight: sidebarOpen ? 16 : 0,
        visibility: "visible",
        width: sidebarOpen ? SIDEBAR_WIDTH : 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync sidebar state changes (e.g., after Zustand hydration)
  useEffect(() => {
    if (sidebarRef.current && !animatingRef.current) {
      gsap.set(sidebarRef.current, {
        opacity: sidebarOpen ? 1 : 0,
        paddingLeft: sidebarOpen ? 16 : 0,
        paddingRight: sidebarOpen ? 16 : 0,
        visibility: "visible",
        width: sidebarOpen ? SIDEBAR_WIDTH : 0,
      });
    }
  }, [sidebarOpen]);

  const handleDebugBack = useCallback(() => {
    if (mainRef.current) {
      gsap.to(mainRef.current, {
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => navigate({ to: "/home" }),
        opacity: 0,
        x: -20,
      });
    } else {
      navigate({ to: "/home" });
    }
  }, [navigate]);

  const handleSettingsBack = useCallback(() => {
    if (mainRef.current) {
      gsap.to(mainRef.current, {
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => navigate({ to: "/home" }),
        opacity: 0,
        x: -20,
      });
    } else {
      navigate({ to: "/home" });
    }
  }, [navigate]);

  let sidebarContent: React.ReactNode;
  if (isDebugRoute) {
    sidebarContent = (
      <DebugSidebar
        onBack={handleDebugBack}
        onSearchChange={setDebugSearch}
        onSelectTable={(table) =>
          navigate({ search: { tab: "database", table }, to: "/home/debug" })
        }
        onSelectTab={(tab) => navigate({ search: { tab, table: undefined }, to: "/home/debug" })}
        searchQuery={debugSearch}
        selectedTab={debugSelectedTab}
        selectedTable={debugSelectedTable}
      />
    );
  } else if (isSettingsRoute) {
    sidebarContent = (
      <SettingsSidebar
        currentWorkspaceName={currentWorkspace?.name}
        isDebugRoute={isSettingsDebugRoute}
        isGroupsRoute={isGroupsRoute}
        isMembersRoute={isMembersRoute}
        isPreferencesRoute={isPreferencesRoute}
        isProfileRoute={isProfileRoute}
        isSpacesRoute={isSpacesRoute}
        isWorkspaceRoute={isWorkspaceRoute}
        onBack={handleSettingsBack}
        userIsOwner={user?.isOwner}
      />
    );
  } else if (isSpaceRoute && currentSpace) {
    sidebarContent = <SpaceSidebar space={currentSpace} />;
  } else {
    sidebarContent = (
      <div className="min-h-0 w-full flex-1 flex flex-col overflow-y-auto px-4">
        <nav className="mb-3 space-y-0.5">
          {NAV_ROUTES.map((route) => (
            <a
              className={`flex items-center gap-2 px-1 py-1 text-[11px] lowercase ${
                routerState.location.pathname === route.href
                  ? t("bg-white/10 text-text-dark", "bg-black/10 text-text-light")
                  : t(
                      "text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80 rounded",
                      "text-text-light/50 hover:bg-black/3 hover:text-text-light/80 rounded",
                    )
              }`}
              href={route.href}
              key={route.href}
            >
              <route.icon size={12} />
              <span className="flex-1">{route.label}</span>
              <kbd
                className={`ml-auto text-[9px] font-mono px-1 py-0.5 border ${t(
                  "border-border-dark text-text-dark/25 bg-white/3",
                  "border-border-light text-text-light/25 bg-black/3",
                )}`}
              >
                <ModIcon className="inline-block align-middle" size={12} />{" "}
                <span className="text-md font-bold">{route.shortcut}</span>
              </kbd>
            </a>
          ))}
        </nav>
        <nav className="mb-4 space-y-0.5">
          <button
            className={`flex w-full items-center gap-2 px-1 py-1 text-[11px] lowercase rounded ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
            onClick={handleCreatePage}
            type="button"
          >
            <PlusIcon size={12} />
            new page
          </button>
          <button
            className={`flex w-full items-center gap-2 px-1 py-1 text-[11px] lowercase rounded ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
            type="button"
          >
            <ClockCounterClockwiseIcon size={12} />
            recents
            <span
              className={`ml-auto text-[9px] font-mono ${t("text-text-dark/25", "text-text-light/25")}`}
            >
              0
            </span>
          </button>
          <button
            className={`flex w-full items-center gap-2 px-1 py-1 text-[11px] lowercase rounded ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
            type="button"
          >
            <FileTextIcon size={12} />
            drafts
            <span
              className={`ml-auto text-[9px] font-mono ${t("text-text-dark/25", "text-text-light/25")}`}
            >
              0
            </span>
          </button>
          <button
            className={`flex w-full items-center gap-2 px-1 py-1 text-[11px] lowercase rounded ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
            type="button"
          >
            <TrashIcon size={12} />
            deleted
            <span
              className={`ml-auto text-[9px] font-mono ${t("text-text-dark/25", "text-text-light/25")}`}
            >
              0
            </span>
          </button>
        </nav>
        <FileTreeSidebar />
      </div>
    );
  }

  return (
    <ConsoleContext.Provider
      value={{
        selectedPageId,
        selectedSpaceId,
        selectedWorkspaceId,
        setSelectedPageId,
        setSelectedSpaceId,
        setSelectedWorkspaceId,
      }}
    >
      <div
        className={`flex h-screen overflow-hidden flex-col transition-colors duration-500 ease-out ${t("bg-bg-dark", "bg-bg-light")}`}
      >
        <ConsoleNavbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

        <div className="relative flex flex-1 overflow-hidden">
          <aside
            ref={sidebarRef}
            className={`absolute inset-y-0 left-0 z-40 md:relative md:shrink-0 flex flex-col border-r overflow-hidden p-4 transition-colors duration-500 ease-out ${t("border-border-dark", "border-border-light")} ${isDarkMode ? "bg-[#171717]" : "bg-[#e8e8e8]"}`}
            style={{ visibility: "hidden" }}
          >
            <div className="min-h-0 flex-1 flex flex-col" ref={sidebarContentRef}>
              {sidebarContent}
            </div>

            <div className="w-full px-4">
              <SidebarFooter isDebugRoute={isDebugRoute} isSettingsRoute={isSettingsRoute} />
            </div>
          </aside>

          {!sidebarOpen && (
            <FloatingSidebar
              footer={
                <SidebarFooter isDebugRoute={isDebugRoute} isSettingsRoute={isSettingsRoute} />
              }
            >
              {sidebarContent}
            </FloatingSidebar>
          )}

          <main
            className={`min-h-0 flex-1 relative flex flex-col ${isSpaceRoute ? "overflow-hidden" : "overflow-y-auto"}`}
            ref={mainRef}
          >
            <Outlet />
          </main>
        </div>
        <FlashToast isDarkMode={isDarkMode} />
      </div>
    </ConsoleContext.Provider>
  );
};
