import { DesktopIcon } from "@phosphor-icons/react";
import { useSessionInfo } from "../../hooks/use-session";
import { useRevokeSession } from "../../hooks/use-revoke-session";
import { useTheme } from "../../hooks/use-theme";

const formatLastSeen = (dateStr: string) => {
  if (!dateStr) {
    return "—";
  }
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

const getCurrentDeviceName = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg")) {
    return "edge";
  }
  if (ua.includes("opr") || ua.includes("opera")) {
    return "opera";
  }
  if (ua.includes("firefox")) {
    return "firefox";
  }
  if (ua.includes("safari") && !ua.includes("chrome")) {
    return "safari";
  }
  if (ua.includes("chrome")) {
    return "chrome";
  }
  return "browser";
};

export const SessionInfo = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: session } = useSessionInfo();
  const revokeSession = useRevokeSession();

  const rawDeviceName = session?.device_name || "";
  const deviceName =
    rawDeviceName === "unknown device" || rawDeviceName === ""
      ? getCurrentDeviceName()
      : rawDeviceName;
  const lastSeen = session?.last_seen_at || new Date().toISOString();

  return (
    <div className="mb-6">
      <span
        className={`block text-[10px] uppercase tracking-wider mb-2 ${t("text-text-dark/30", "text-text-light/30")}`}
      >
        active session
      </span>
      <div
        className={`flex items-center justify-between py-3 border-b ${t("border-border-dark", "border-border-light")}`}
      >
        <div className="flex items-center gap-2">
          <DesktopIcon
            className={`shrink-0 ${t("text-text-dark/30", "text-text-light/30")}`}
            size={14}
          />
          <span className={`text-[11px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}>
            {deviceName}
          </span>
          <span className={`text-[10px] ${t("text-text-dark/20", "text-text-light/20")}`}>·</span>
          <span className={`text-[10px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
            this device
          </span>
          <span className={`text-[10px] ${t("text-text-dark/20", "text-text-light/20")}`}>·</span>
          <span className={`text-[10px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
            last active {formatLastSeen(lastSeen)}
          </span>
        </div>
        <button
          className={`text-[11px] lowercase transition-colors ${t("text-text-dark/40 hover:text-red-400", "text-text-light/40 hover:text-red-500")}`}
          onClick={() => revokeSession.mutate()}
          type="button"
        >
          revoke
        </button>
      </div>
    </div>
  );
};
