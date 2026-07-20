import { GlobeIcon, CopyIcon, CheckIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  usePageShare,
  useUpdatePageShare,
  useShortenPageShare,
} from "#/features/console/hooks/use-pages";
import { setFlashToast } from "#/features/console/components/flash-toast";

interface SharePopoverProps {
  pageId: string;
}

const handleCopy = async (text: string, setCopyState: (v: boolean) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopyState(true);
    setTimeout(() => setCopyState(false), 2000);
  } catch (error) {
    console.error("failed to copy:", error);
  }
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
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
            ? "text-green-500 hover:text-green-600"
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
          className={`absolute top-full right-0 mt-1 border text-[11px] p-3 w-72 flex flex-col gap-3.5 z-50 shadow-lg rounded-none ${t(
            "border-border-dark bg-bg-dark text-text-dark/70",
            "border-border-light bg-bg-light text-text-light/70",
          )}`}
        >
          {isPending ? (
            <div className="text-[10px] lowercase opacity-40">loading settings...</div>
          ) : (
            <>
              {/* Share to web toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold lowercase text-text-light dark:text-text-dark">
                    share to web
                  </div>
                  <div className="text-[10px] opacity-40 lowercase mt-0.5">
                    make this page publicly accessible
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={updateShare.isPending}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSharedActive ? "bg-green-500" : t("bg-neutral-800", "bg-neutral-200")
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isSharedActive ? "translate-x-3" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {isSharedActive && (
                <>
                  {/* Public Link display */}
                  <div className="flex flex-col gap-1 border-t pt-2.5 border-neutral-800/10 dark:border-neutral-100/10">
                    <div className="text-[10px] font-medium lowercase opacity-55 mb-0.5">
                      public link
                    </div>
                    <div
                      className={`flex items-center gap-1 border px-2 py-1 rounded-none text-[10px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                        "border-border-dark bg-black/20",
                        "border-border-light bg-white",
                      )}`}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis">{publicUrl}</span>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-neutral-800/10 dark:border-neutral-100/10">
                        <button
                          type="button"
                          onClick={() => handleCopy(publicUrl, setCopied)}
                          className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                          title="copy link"
                        >
                          {copied ? (
                            <CheckIcon className="size-3 text-green-500" />
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

                  {/* Short URL / Shorten Link option */}
                  <div className="flex flex-col gap-1 border-t pt-2.5 border-neutral-800/10 dark:border-neutral-100/10">
                    {share.shortCode ? (
                      <>
                        <div className="text-[10px] font-medium lowercase opacity-55 mb-0.5">
                          short link
                        </div>
                        <div
                          className={`flex items-center gap-1 border px-2 py-1 rounded-none text-[10px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                            "border-border-dark bg-black/20",
                            "border-border-light bg-white",
                          )}`}
                        >
                          <span className="flex-1 overflow-hidden text-ellipsis">{shortUrl}</span>
                          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-neutral-800/10 dark:border-neutral-100/10">
                            <button
                              type="button"
                              onClick={() => handleCopy(shortUrl, setShortCopied)}
                              className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                              title="copy link"
                            >
                              {shortCopied ? (
                                <CheckIcon className="size-3 text-green-500" />
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
                        className={`w-full py-1 text-center border lowercase font-medium cursor-pointer transition-colors ${t(
                          "border-border-dark hover:bg-white/5 text-text-dark/80",
                          "border-border-light hover:bg-black/5 text-text-light/80",
                        )}`}
                      >
                        {shortenShare.isPending ? "shortening..." : "shorten link"}
                      </button>
                    )}
                  </div>

                  {/* Search engine indexing toggle */}
                  <div className="flex items-center justify-between gap-4 border-t pt-2.5 border-neutral-800/10 dark:border-neutral-100/10">
                    <div>
                      <div className="font-semibold lowercase text-text-light dark:text-text-dark">
                        search engine indexing
                      </div>
                      <div className="text-[10px] opacity-40 lowercase mt-0.5">
                        allow search engines to index page
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleIndexing}
                      disabled={updateShare.isPending}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        share.searchIndexing
                          ? "bg-green-500"
                          : t("bg-neutral-800", "bg-neutral-200")
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          share.searchIndexing ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
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
