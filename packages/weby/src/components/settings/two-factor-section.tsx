import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useTheme } from "../../hooks/use-theme";

export const TwoFactorSection = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  return (
    <div className="mb-6">
      <span
        className={`block text-[10px] uppercase tracking-wider mb-2 ${t("text-text-dark/30", "text-text-light/30")}`}
      >
        two-factor authentication
      </span>
      <div
        className={`flex items-center justify-between py-3 border-b ${t("border-border-dark", "border-border-light")}`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className={t("text-text-dark/30", "text-text-light/30")} size={14} />
          <span className={`text-[11px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}>
            not enabled
          </span>
        </div>
        <button
          className={`px-2 py-1.5 text-[11px] lowercase transition-colors ${t("text-text-dark/50 hover:text-text-dark/80", "text-text-light/50 hover:text-text-light/80")}`}
          type="button"
        >
          enable
        </button>
      </div>
    </div>
  );
};
