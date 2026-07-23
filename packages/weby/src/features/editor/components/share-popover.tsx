import {
  GlobeIcon,
  CopyIcon,
  CheckIcon,
  ArrowSquareOutIcon,
  LockIcon,
  PencilSimpleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  usePageShare,
  useUpdatePageShare,
  useShortenPageShare,
} from "#/features/console/hooks/use-pages";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { handleCopy } from "../lib/clipboard";

interface SharePopoverProps {
  pageId: string;
}

interface SquareSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  isDarkMode: boolean;
}

const SquareSwitch = ({ checked, disabled, onChange, isDarkMode }: SquareSwitchProps) => {
  const inactiveBg = isDarkMode ? "bg-neutral-700" : "bg-neutral-300";
  const thumbBg = isDarkMode ? "bg-neutral-200" : "bg-white";
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center transition-colors duration-150 focus:outline-none ${
        checked ? "bg-purple-600 dark:bg-purple-500" : inactiveBg
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3 w-3 transform shadow-sm transition duration-150 ${thumbBg} ${
          checked ? "translate-x-3.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

interface AccessPermissionsProps {
  currentAccessLevel: string;
  disabled?: boolean;
  isDarkMode: boolean;
  onUpdateAccess: (level: string) => void;
}

const AccessPermissionsSection = ({
  currentAccessLevel,
  disabled,
  isDarkMode,
  onUpdateAccess,
}: AccessPermissionsProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const options = [
    {
      desc: "readonly for anyone with link",
      icon: LockIcon,
      id: "read",
      label: "read access",
    },
    {
      desc: "logged-in members with link can edit",
      icon: PencilSimpleIcon,
      id: "edit",
      label: "editor access",
    },
    {
      desc: "anyone with link can edit (guests)",
      icon: UsersIcon,
      id: "public_edit",
      label: "editor access for all",
    },
  ];

  return (
    <div
      className={`flex flex-col gap-2 pt-2 border-t ${t("border-neutral-800", "border-neutral-200")}`}
    >
      <div
        className={`font-semibold lowercase text-xs ${t("text-neutral-300", "text-neutral-700")}`}
      >
        access permissions
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map(({ desc, icon: Icon, id, label }) => {
          const isSelected = currentAccessLevel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onUpdateAccess(id)}
              disabled={disabled}
              className={`flex items-center justify-between px-2.5 py-1.5 border text-xs lowercase transition-all cursor-pointer ${
                isSelected
                  ? t(
                      "border-purple-500/50 bg-purple-500/10 text-purple-300 font-medium",
                      "border-purple-600/50 bg-purple-50 text-purple-700 font-medium",
                    )
                  : t(
                      "border-neutral-800 hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200",
                      "border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900",
                    )
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={13} />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-medium">{label}</span>
                  <span className={`text-[9.5px] ${t("text-neutral-400", "text-neutral-500")}`}>
                    {desc}
                  </span>
                </div>
              </div>
              {isSelected && (
                <CheckIcon size={13} className="text-purple-600 dark:text-purple-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const SharePopover = ({ pageId }: SharePopoverProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: share, isPending } = usePageShare(pageId);
  const updateShare = useUpdatePageShare();
  const shortenShare = useShortenPageShare();

  const [copied, setCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handler);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const handleToggleShare = () => {
    if (!share) {
      return;
    }
    updateShare.mutate(
      {
        isEnabled: !share.isEnabled,
        pageId,
        searchIndexing: share.searchIndexing,
      },
      {
        onSuccess: (data) => {
          setFlashToast(data.isEnabled ? "page shared to web" : "page unshared");
        },
      },
    );
  };

  const handleToggleIndexing = () => {
    if (!share) {
      return;
    }
    updateShare.mutate({
      isEnabled: share.isEnabled,
      pageId,
      searchIndexing: !share.searchIndexing,
    });
  };

  const handleShorten = () => {
    shortenShare.mutate(pageId, {
      onSuccess: () => {
        setFlashToast("short link generated");
      },
    });
  };

  const handleUpdateAccess = (accessLevel: string) => {
    if (!share) {
      return;
    }
    updateShare.mutate(
      {
        accessLevel,
        isEnabled: share.isEnabled,
        pageId,
        searchIndexing: share.searchIndexing,
      },
      {
        onSuccess: () => {
          setFlashToast(`access level set to ${accessLevel.replace("_", " ")}`);
        },
      },
    );
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicUrl = share?.shareToken ? `${origin}/share/${share.shareToken}` : "";
  const shortUrl = share?.shortCode ? `${origin}/sh/${share.shortCode}` : "";

  const isSharedActive = Boolean(share?.isEnabled);
  const currentAccessLevel = share?.accessLevel || "read";

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        aria-label="Share page settings"
        className={`p-0.5 transition-colors cursor-pointer ${
          isSharedActive
            ? "text-purple-600 dark:text-purple-400 font-bold"
            : t(
                "text-text-dark/40 hover:text-text-dark",
                "text-text-light/40 hover:text-text-light",
              )
        }`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <GlobeIcon size={14} />
      </button>

      {open && (
        <div
          className={`absolute top-full right-0 mt-1.5 border text-xs p-3 w-80 flex flex-col gap-3 z-50 shadow-xl ${t(
            "border-neutral-800 bg-neutral-900 text-neutral-200",
            "border-neutral-200 bg-white text-neutral-800",
          )}`}
        >
          {isPending ? (
            <div className="text-xs lowercase opacity-40">loading...</div>
          ) : (
            <>
              {/* Share to web toggle */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div
                    className={`font-semibold lowercase text-xs ${t("text-neutral-200", "text-neutral-800")}`}
                  >
                    share to web
                  </div>
                  <div
                    className={`text-[10px] lowercase ${t("text-neutral-400", "text-neutral-500")}`}
                  >
                    make page publicly accessible
                  </div>
                </div>
                <SquareSwitch
                  checked={!!isSharedActive}
                  disabled={updateShare.isPending}
                  isDarkMode={isDarkMode}
                  onChange={handleToggleShare}
                />
              </div>

              {isSharedActive && (
                <>
                  <AccessPermissionsSection
                    currentAccessLevel={currentAccessLevel}
                    disabled={updateShare.isPending}
                    isDarkMode={isDarkMode}
                    onUpdateAccess={handleUpdateAccess}
                  />

                  {/* Public link */}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`text-[10px] font-medium lowercase ${t("text-neutral-400", "text-neutral-500")}`}
                    >
                      public link
                    </div>
                    <div
                      className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                        "border-neutral-800 bg-neutral-950 text-neutral-300",
                        "border-neutral-200 bg-neutral-100 text-neutral-800",
                      )}`}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis">{publicUrl}</span>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(publicUrl, setCopied)}
                          className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                          title="copy link"
                        >
                          {copied ? (
                            <CheckIcon className="size-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <CopyIcon className="size-3" />
                          )}
                        </button>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-100 opacity-60 transition-opacity"
                          title="open in new tab"
                        >
                          <ArrowSquareOutIcon className="size-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Short link */}
                  <div className="flex flex-col gap-1">
                    {share?.shortCode ? (
                      <>
                        <div
                          className={`text-[10px] font-medium lowercase ${t("text-neutral-400", "text-neutral-500")}`}
                        >
                          short link
                        </div>
                        <div
                          className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                            "border-neutral-800 bg-neutral-950 text-neutral-300",
                            "border-neutral-200 bg-neutral-100 text-neutral-800",
                          )}`}
                        >
                          <span className="flex-1 overflow-hidden text-ellipsis">{shortUrl}</span>
                          <div className="flex items-center gap-1.5 shrink-0 pl-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(shortUrl, setShortCopied)}
                              className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                              title="copy link"
                            >
                              {shortCopied ? (
                                <CheckIcon className="size-3 text-purple-600 dark:text-purple-400" />
                              ) : (
                                <CopyIcon className="size-3" />
                              )}
                            </button>
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:opacity-100 opacity-60 transition-opacity"
                              title="open in new tab"
                            >
                              <ArrowSquareOutIcon className="size-3" />
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleShorten}
                        disabled={shortenShare.isPending}
                        className={`w-full py-1 text-center text-xs border lowercase font-medium cursor-pointer transition-colors ${t(
                          "border-neutral-800 hover:bg-neutral-800/50 text-neutral-300",
                          "border-neutral-200 hover:bg-neutral-100 text-neutral-700",
                        )}`}
                      >
                        {shortenShare.isPending ? "shortening..." : "shorten link"}
                      </button>
                    )}
                  </div>

                  {/* Search engine indexing */}
                  <div
                    className={`flex items-center justify-between gap-2 pt-1.5 border-t ${t("border-neutral-800", "border-neutral-200")}`}
                  >
                    <div>
                      <div
                        className={`font-semibold lowercase text-xs ${t("text-neutral-200", "text-neutral-800")}`}
                      >
                        search indexing
                      </div>
                      <div
                        className={`text-[10px] lowercase ${t("text-neutral-400", "text-neutral-500")}`}
                      >
                        allow engines to index page
                      </div>
                    </div>
                    <SquareSwitch
                      checked={Boolean(share?.searchIndexing)}
                      disabled={updateShare.isPending}
                      isDarkMode={isDarkMode}
                      onChange={handleToggleIndexing}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
