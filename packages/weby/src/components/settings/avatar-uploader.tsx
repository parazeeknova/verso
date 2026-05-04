import { CameraIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useUpdateProfile } from "../../hooks/use-profile";
import { useTheme } from "../../hooks/use-theme";
import { compressImage } from "../../lib/image-compress";

interface AvatarUploaderProps {
  avatarUrl: string;
  name: string;
  onAvatarChange: (url: string) => void;
}

export const AvatarUploader = ({ avatarUrl, name, onAvatarChange }: AvatarUploaderProps) => {
  const { data: user } = useAuth();
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const [showMenu, setShowMenu] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateProfile();

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      setUploadError("");
      setIsUploading(true);

      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      try {
        const url = await compressImage(file, 400, 400, 0.8);
        onAvatarChange(url);
        updateProfile.mutate(
          { avatar_url: url, name: name.trim() || user?.name || "" },
          {
            onError: (err: Error) => {
              setUploadError(err.message || "failed to upload avatar");
              setIsUploading(false);
            },
            onSuccess: () => {
              setIsUploading(false);
            },
          },
        );
      } catch {
        setUploadError("failed to process image");
        setIsUploading(false);
      }

      setShowMenu(false);
    },
    [name, user?.name, onAvatarChange, updateProfile],
  );

  const handleRemove = useCallback(() => {
    setUploadError("");
    onAvatarChange("");
    updateProfile.mutate({ avatar_url: "", name: name.trim() || user?.name || "" });
    setShowMenu(false);
  }, [name, user?.name, onAvatarChange, updateProfile]);

  const initials = (user?.name || user?.username || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center mb-8 relative">
      <div className="relative">
        <button
          className={`relative w-20 h-20 rounded-full flex items-center justify-center text-lg font-medium overflow-hidden border-2 transition-colors ${
            avatarUrl
              ? t("border-border-dark", "border-border-light")
              : t("border-text-dark/20", "border-text-light/20")
          } ${t("bg-white/5", "bg-black/3")}`}
          onClick={() => setShowMenu((prev) => !prev)}
          type="button"
        >
          {avatarUrl ? (
            <img alt="avatar" className="w-full h-full object-cover" src={avatarUrl} />
          ) : (
            <span className={t("text-text-dark/60", "text-text-light/60")}>{initials}</span>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity ${t("bg-black/40", "bg-white/30")}`}
          >
            {isUploading ? (
              <span className={`text-[10px] lowercase ${t("text-white", "text-black")}`}>
                uploading...
              </span>
            ) : (
              <CameraIcon className={t("text-white", "text-black")} size={20} />
            )}
          </div>
        </button>

        {showMenu && (
          <div
            className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-36 py-1 border z-50 ${t("bg-[#171717] border-border-dark", "bg-[#e8e8e8] border-border-light")}`}
          >
            <button
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] lowercase ${t("text-text-dark/70 hover:bg-white/5 hover:text-text-dark", "text-text-light/70 hover:bg-black/3 hover:text-text-light")}`}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <CameraIcon size={12} />
              upload image
            </button>
            {avatarUrl && (
              <button
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] lowercase ${t("text-red-400/70 hover:bg-white/5 hover:text-red-400", "text-red-500/70 hover:bg-black/3 hover:text-red-500")}`}
                onClick={handleRemove}
                type="button"
              >
                <TrashIcon size={12} />
                remove image
              </button>
            )}
          </div>
        )}
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {uploadError && (
        <p
          className={`mt-2 text-[11px] lowercase flex items-center gap-1 ${t("text-red-400", "text-red-600")}`}
        >
          <WarningIcon size={12} />
          {uploadError}
        </p>
      )}
    </div>
  );
};
