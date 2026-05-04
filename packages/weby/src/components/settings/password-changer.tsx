import { CaretDownIcon, CheckIcon, EyeIcon, EyeSlashIcon, XIcon } from "@phosphor-icons/react";
import { useState, useCallback } from "react";
import { useChangePassword } from "../../hooks/use-profile";
import { useTheme } from "../../hooks/use-theme";

export const PasswordChanger = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const changePassword = useChangePassword();

  const handleSubmit = useCallback(() => {
    setError("");
    if (newPassword.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }
    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onError: (err: Error) => {
          setError(err.message || "failed to change password");
        },
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword("");
          setNewPassword("");
          setShowForm(false);
          setTimeout(() => setSuccess(false), 3000);
        },
      },
    );
  }, [currentPassword, newPassword, changePassword]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          password
        </span>
        {showForm ? (
          <div className="flex items-center gap-2">
            <button
              className={`flex items-center gap-1 text-[11px] lowercase ${t("text-text-dark/50 hover:text-text-dark/80", "text-text-light/50 hover:text-text-light/80")}`}
              onClick={handleSubmit}
              type="button"
            >
              save password
            </button>
            <button
              className={`flex items-center gap-1 text-[11px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              type="button"
            >
              <XIcon size={12} /> cancel
            </button>
          </div>
        ) : (
          <button
            className={`flex items-center gap-1 text-[11px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
            onClick={() => setShowForm(true)}
            type="button"
          >
            <CaretDownIcon size={12} /> change password
          </button>
        )}
      </div>

      {success && (
        <p className={`text-[11px] lowercase mb-2 ${t("text-green-400", "text-green-600")}`}>
          <CheckIcon className="inline mr-1" size={12} />
          password changed successfully
        </p>
      )}

      {showForm && (
        <div className="space-y-3 mt-3">
          <div className="relative">
            <input
              className={`w-full bg-transparent border-b py-2 pr-8 text-[13px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="current password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
            />
            <button
              className={`absolute right-0 top-1/2 -translate-y-1/2 ${t("text-text-dark/30 hover:text-text-dark/60", "text-text-light/30 hover:text-text-light/60")}`}
              onClick={() => setShowCurrent((prev) => !prev)}
              type="button"
            >
              {showCurrent ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          </div>
          <div className="relative">
            <input
              className={`w-full bg-transparent border-b py-2 pr-8 text-[13px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="new password"
              type={showNew ? "text" : "password"}
              value={newPassword}
            />
            <button
              className={`absolute right-0 top-1/2 -translate-y-1/2 ${t("text-text-dark/30 hover:text-text-dark/60", "text-text-light/30 hover:text-text-light/60")}`}
              onClick={() => setShowNew((prev) => !prev)}
              type="button"
            >
              {showNew ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          </div>
          {error && (
            <p className={`text-[11px] lowercase ${t("text-red-400", "text-red-600")}`}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
};
