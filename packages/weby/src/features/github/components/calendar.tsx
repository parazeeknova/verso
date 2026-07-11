import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GitHubCalendar } from "react-github-calendar";
import { Tooltip } from "react-tooltip";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { gsap } from "gsap";

interface GitHubActivityProps {
  children?: React.ReactNode;
  isDarkMode?: boolean;
  username: string;
}

const useIsNarrow = (): boolean => {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth < 640;
  }, []);

  const getServerSnapshot = useCallback(() => false, []);

  // eslint-disable-next-line promise/prefer-await-to-callbacks -- useSyncExternalStore requires callback pattern
  const subscribe = useCallback((callback: () => void) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- event handler callback required
    const handleResize = () => callback();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const GitHubActivity = ({ username, isDarkMode = true, children }: GitHubActivityProps) => {
  const isNarrow = useIsNarrow();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const prevCollapsed = useRef(isCollapsed);

  useEffect(() => {
    const stored = localStorage.getItem("github-activity-collapsed");
    const element = containerRef.current;
    if (stored === "true") {
      setIsCollapsed(true);
      prevCollapsed.current = true;
      if (element) {
        gsap.set(element, { height: 0, opacity: 0, overflow: "hidden" });
      }
    }
    isFirstRender.current = false;
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || isFirstRender.current) {
      return;
    }

    if (prevCollapsed.current === isCollapsed) {
      return;
    }
    prevCollapsed.current = isCollapsed;

    if (isCollapsed) {
      gsap.to(element, {
        duration: 0.3,
        ease: "power2.inOut",
        height: 0,
        onStart: () => {
          element.style.overflow = "hidden";
        },
        opacity: 0,
      });
    } else {
      gsap.fromTo(
        element,
        { height: 0, opacity: 0 },
        {
          duration: 0.3,
          ease: "power2.inOut",
          height: "auto",
          onComplete: () => {
            element.style.overflow = "";
          },
          onStart: () => {
            element.style.overflow = "hidden";
          },
          opacity: 1,
        },
      );
    }
  }, [isCollapsed]);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("github-activity-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="mt-6 sm:mt-8">
      <h3 className="mb-3">
        <button
          aria-expanded={!isCollapsed}
          className="flex items-center gap-2 text-left focus:outline-none group select-none cursor-pointer"
          onClick={handleToggle}
          type="button"
        >
          <span className="font-medium text-base lowercase">activity overview</span>
          <span className="text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors flex items-center">
            {isCollapsed ? <CaretRightIcon size={16} /> : <CaretDownIcon size={16} />}
          </span>
        </button>
      </h3>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" ref={containerRef}>
        <GitHubCalendar
          blockMargin={isNarrow ? 1 : 3}
          blockRadius={2}
          blockSize={isNarrow ? 5 : 10}
          className="github-calendar-svg"
          colorScheme={isDarkMode ? "dark" : "light"}
          fontSize={isNarrow ? 10 : 12}
          showColorLegend
          showTotalCount
          style={{ color: "inherit", height: "auto", width: "100%" }}
          username={username}
        />
        <Tooltip id="github-calendar-tooltip" />
        {children}
      </div>
    </div>
  );
};
