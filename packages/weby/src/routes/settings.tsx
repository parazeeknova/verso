import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { ConsoleLayout } from "../components/console/console-layout";

const Settings = function Settings() {
  const { data: user, isPending } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const loadingRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.backgroundColor = isDarkMode ? "#111111" : "#eeeeee";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.backgroundColor = "";
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (!isPending && !user) {
      void navigate({ replace: true, to: "/" });
    }
  }, [isPending, user, navigate]);

  useEffect(() => {
    if (done && pathname === "/settings") {
      void navigate({ replace: true, to: "/settings/account/profile" });
    }
  }, [done, pathname, navigate]);

  useEffect(() => {
    if (!isPending && user && !done && loadingRef.current) {
      gsap.to(loadingRef.current, {
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setDone(true),
        opacity: 0,
        scale: 0.97,
      });
    }
    if (isPending) {
      setDone(false);
    }
  }, [isPending, user, done]);

  if (!done) {
    return (
      <div
        ref={loadingRef}
        className={`flex min-h-screen items-center justify-center ${isDarkMode ? "bg-bg-dark" : "bg-bg-light"}`}
      >
        <p className={`text-sm ${isDarkMode ? "text-text-dark/40" : "text-text-light/40"}`}>
          {isPending ? "checking authentication..." : "redirecting..."}
        </p>
      </div>
    );
  }

  return <ConsoleLayout />;
};

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({
    links: [{ href: "/settings", rel: "canonical" }],
    meta: [
      { title: "verso — settings" },
      { content: "noindex, nofollow", name: "robots" },
      { content: "verso — settings", property: "og:title" },
      { content: "website", property: "og:type" },
    ],
  }),
});
