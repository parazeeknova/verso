import { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useTheme } from "../../hooks/use-theme";
import { AvatarUploader } from "./avatar-uploader";
import { NameEditor } from "./name-editor";
import { PasswordChanger } from "./password-changer";
import { SessionInfo } from "./session-info";
import { TwoFactorSection } from "./two-factor-section";

export const ProfileSettings = () => {
  const { data: user } = useAuth();
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h1
        className={`text-center text-sm font-normal lowercase mb-8 ${t("text-text-dark", "text-text-light")}`}
      >
        my profile
      </h1>

      <AvatarUploader avatarUrl={avatarUrl} name={name} onAvatarChange={setAvatarUrl} />

      <NameEditor avatarUrl={avatarUrl} name={name} onNameChange={setName} />

      <div className="mb-6">
        <label
          className={`block text-[10px] uppercase tracking-wider mb-2 ${t("text-text-dark/30", "text-text-light/30")}`}
          htmlFor="email-display"
        >
          email
        </label>
        <p
          className={`text-[13px] lowercase py-2 border-b ${t("border-border-dark text-text-dark/50", "border-border-light text-text-light/50")}`}
          id="email-display"
        >
          {user?.email ?? "—"}
        </p>
      </div>

      <PasswordChanger />

      <TwoFactorSection />

      <SessionInfo />
    </div>
  );
};
