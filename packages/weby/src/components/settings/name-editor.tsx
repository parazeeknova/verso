import { CheckIcon } from "@phosphor-icons/react";
import { useState, useCallback } from "react";
import { useUpdateProfile } from "../../hooks/use-profile";
import { useTheme } from "../../hooks/use-theme";

interface NameEditorProps {
  avatarUrl: string;
  name: string;
  onNameChange: (name: string) => void;
}

export const NameEditor = ({ avatarUrl, name, onNameChange }: NameEditorProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const updateProfile = useUpdateProfile();

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    updateProfile.mutate(
      { avatar_url: avatarUrl, name: name.trim() },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        },
      },
    );
  }, [avatarUrl, name, updateProfile]);

  return (
    <div className="mb-6">
      <label
        className={`block text-[10px] uppercase tracking-wider mb-2 ${t("text-text-dark/30", "text-text-light/30")}`}
        htmlFor="profile-name"
      >
        name
      </label>
      <div className="flex items-end gap-3">
        <input
          className={`flex-1 bg-transparent border-b py-2 text-[13px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
          id="profile-name"
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="your name"
          type="text"
          value={name}
        />
        <button
          className={`flex items-center gap-1.5 px-2 py-1.5 text-[11px] lowercase transition-colors ${
            saveSuccess
              ? t("text-green-400", "text-green-600")
              : t(
                  "text-text-dark/50 hover:text-text-dark/80",
                  "text-text-light/50 hover:text-text-light/80",
                )
          }`}
          onClick={handleSave}
          type="button"
        >
          {saveSuccess ? <CheckIcon size={12} /> : null}
          {saveSuccess ? "saved" : "save"}
        </button>
      </div>
    </div>
  );
};
