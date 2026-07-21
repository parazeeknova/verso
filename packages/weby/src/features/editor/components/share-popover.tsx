import {
  GlobeIcon,
  GlobeXIcon,
  CopyIcon,
  CheckIcon,
  ArrowSquareOutIcon,
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
      className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center transition-colors duration-150 focus:outline-none ${
        checked ? "bg-accent" : inactiveBg
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-2.5 w-2.5 transform shadow-sm transition duration-150 ${thumbBg} ${
          checked ? "translate-x-3" : "translate-x-0.5"
        }`}
      />
    </button>
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

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicUrl = share?.shareToken ? `${origin}/share/${share.shareToken}` : "";
  const shortUrl = share?.shortCode ? `${origin}/sh/${share.shortCode}` : "";

  const isSharedActive = share?.isEnabled;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        aria-label="Share page settings"
        className={`p-0.5 transition-colors cursor-pointer ${
          isSharedActive
            ? "text-accent hover:text-accent/80"
            : t(
                "text-text-dark/40 hover:text-text-dark",
                "text-text-light/40 hover:text-text-light",
              )
        }`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {isSharedActive ? <GlobeIcon size={14} /> : <GlobeXIcon size={14} />}
      </button>

      {open && (
        <div
          className={`absolute top-full right-0 mt-1 border text-[11px] p-2 w-64 flex flex-col gap-2 z-50 shadow-lg ${t(
            "border-border-dark bg-bg-dark text-text-dark/70",
            "border-border-light bg-bg-light text-text-light/70",
          )}`}
        >
          {isPending ? (
            <div className="text-[10px] lowercase opacity-40">loading...</div>
          ) : (
            <>
              {/* Share to web toggle */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold lowercase text-text-light dark:text-text-dark text-[11px]">
                    share to web
                  </div>
                  <div className="text-[9px] opacity-40 lowercase">
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
                  {/* Public link */}
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[9px] font-medium lowercase opacity-45">public link</div>
                    <div
                      className={`flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                        "border-border-dark bg-black/20",
                        "border-border-light bg-white",
                      )}`}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis">{publicUrl}</span>
                      <div className="flex items-center gap-1 shrink-0 pl-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(publicUrl, setCopied)}
                          className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                          title="copy link"
                        >
                          {copied ? (
                            <CheckIcon className="size-2.5 text-accent" />
                          ) : (
                            <CopyIcon className="size-2.5" />
                          )}
                        </button>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-100 opacity-60 transition-opacity"
                          title="open in new tab"
                        >
                          <ArrowSquareOutIcon className="size-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Short link */}
                  <div className="flex flex-col gap-0.5">
                    {share.shortCode ? (
                      <>
                        <div className="text-[9px] font-medium lowercase opacity-45">
                          short link
                        </div>
                        <div
                          className={`flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                            "border-border-dark bg-black/20",
                            "border-border-light bg-white",
                          )}`}
                        >
                          <span className="flex-1 overflow-hidden text-ellipsis">{shortUrl}</span>
                          <div className="flex items-center gap-1 shrink-0 pl-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(shortUrl, setShortCopied)}
                              className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                              title="copy link"
                            >
                              {shortCopied ? (
                                <CheckIcon className="size-2.5 text-accent" />
                              ) : (
                                <CopyIcon className="size-2.5" />
                              )}
                            </button>
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:opacity-100 opacity-60 transition-opacity"
                              title="open in new tab"
                            >
                              <ArrowSquareOutIcon className="size-2.5" />
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleShorten}
                        disabled={shortenShare.isPending}
                        className={`w-full py-0.5 text-center text-[10px] border lowercase font-medium cursor-pointer transition-colors ${t(
                          "border-border-dark hover:bg-white/5 text-text-dark/80",
                          "border-border-light hover:bg-black/5 text-text-light/80",
                        )}`}
                      >
                        {shortenShare.isPending ? "shortening..." : "shorten link"}
                      </button>
                    )}
                  </div>

                  {/* Search engine indexing */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold lowercase text-text-light dark:text-text-dark text-[11px]">
                        search indexing
                      </div>
                      <div className="text-[9px] opacity-40 lowercase">
                        allow engines to index page
                      </div>
                    </div>
                    <SquareSwitch
                      checked={share.searchIndexing}
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
