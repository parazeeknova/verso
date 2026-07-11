import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GitHubCalendar } from "react-github-calendar";
import { Tooltip } from "react-tooltip";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

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

  useEffect(() => {
    const stored = localStorage.getItem("github-activity-collapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

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
      {!isCollapsed && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
      )}
    </div>
  );
};
