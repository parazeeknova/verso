import { useCallback, useSyncExternalStore } from "react";
import { GitHubCalendar } from "react-github-calendar";
import { Tooltip } from "react-tooltip";

interface GitHubActivityProps {
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

export const GitHubActivity = ({ username, isDarkMode = true }: GitHubActivityProps) => {
  const isNarrow = useIsNarrow();

  return (
    <div className="mt-6 sm:mt-8">
      <h3 className="mb-3 font-medium text-base">activity overview</h3>
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
    </div>
  );
};
