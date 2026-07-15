import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { gsap } from "gsap";

import {
  DotsThreeVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkSimpleIcon,
  ArticleIcon,
  ClockCounterClockwiseIcon,
  ArrowSquareOutIcon,
  FileArrowDownIcon,
  PrinterIcon,
  TrashIcon,
  SquaresFourIcon,
  TextAlignLeftIcon,
  CalendarIcon,
  ClockIcon,
  ArrowsHorizontalIcon,
} from "@phosphor-icons/react";
import { useTheme } from "#/shared/hooks/use-theme";
import { useUserById } from "#/features/console/hooks/use-users";
import { useDeletePage } from "#/features/console/hooks/use-pages";
import { setFlashToast } from "#/features/console/components/flash-toast";

interface EditorMoreMenuProps {
  pageId: string;
  title: string;
  spaceName?: string;
  spaceSlug?: string;
  creatorId?: string;
  createdAt?: string;
  updatedAt?: string;
  textContent?: string;
  fullWidth: boolean;
  onToggleFullWidth: () => void;
  isWatching: boolean;
  watchPending?: boolean;
  onToggleWatch: () => void;
  onDeleteStart?: () => void;
  onDeleteSettled?: () => void;
}

const formatDateTime = (iso?: string) => {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "short",
  });
};

const wordCount = (text?: string) => {
  if (!text) {
    return 0;
  }
  return text.split(/\s+/).filter(Boolean).length;
};

interface DateTooltipProps {
  createdAt?: string;
  updatedAt?: string;
  t: (dark: string, light: string) => string;
}

const DateTooltip = ({ createdAt, updatedAt, t }: DateTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={`relative flex items-center gap-1 px-2.5 py-0.5 text-[9px] cursor-default ${t("text-text-dark/30", "text-text-light/30")}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="flex items-center justify-center w-3.5">
        <ClockIcon size={10} />
      </span>
      <span>
        updated:{" "}
        <span className={t("text-text-dark/50", "text-text-light/50")}>
          {formatDateTime(updatedAt)}
        </span>
      </span>
      {isVisible && (
        <div className="pointer-events-none absolute inset-x-0 top-full z-50 mt-1.5 flex justify-start">
          <div
            className={`relative whitespace-nowrap px-2.5 py-1.5 text-[10px] shadow-lg ${t("bg-neutral-800 text-white", "bg-neutral-100 text-black border border-black/10")}`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={10} />
              created: {formatDateTime(createdAt)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <ClockIcon size={10} />
              updated: {formatDateTime(updatedAt)}
            </div>
            <div
              className={`absolute left-3 bottom-full h-1.5 w-1.5 rotate-45 ${t("bg-neutral-800", "bg-neutral-100")}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface CreatorTooltipProps {
  creatorId?: string;
  t: (dark: string, light: string) => string;
}

const CreatorTooltip = ({ creatorId, t }: CreatorTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { data: user } = useUserById(creatorId ?? "");

  const displayName = user?.name || user?.username || "unknown";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative flex items-center gap-1 px-2.5 py-0.5 text-[9px] cursor-default ${t("text-text-dark/30", "text-text-light/30")}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[6px] font-medium ${t("bg-white/10 text-text-dark/60", "bg-black/10 text-text-light/60")}`}
      >
        {user?.avatar_url ? (
          <img
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
            src={user.avatar_url}
          />
        ) : (
          initials
        )}
      </div>
      <span>
        owner: <span className="truncate">{displayName}</span>
      </span>
      {isVisible && user && (
        <div className="pointer-events-none absolute inset-x-0 top-full z-50 mt-1.5 flex justify-start">
          <div
            className={`relative whitespace-nowrap px-2.5 py-1.5 text-[10px] shadow-lg ${t("bg-neutral-800 text-white", "bg-neutral-100 text-black border border-black/10")}`}
          >
            <div className="flex items-center gap-2 pl-4">{user.name || "—"}</div>
            <div className="flex items-center gap-2 mt-0.5 pl-4">@{user.username}</div>
            <div
              className={`absolute left-3 bottom-full h-1.5 w-1.5 rotate-45 ${t("bg-neutral-800", "bg-neutral-100")}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface DisabledMenuItemProps {
  disabled?: boolean;
  danger?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  t: (dark: string, light: string) => string;
}

const DisabledMenuItem = ({
  disabled,
  danger,
  icon,
  label,
  loading,
  onClick,
  t,
}: DisabledMenuItemProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => disabled && !loading && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-2 px-3 py-1 text-[11px] lowercase transition-colors ${(() => {
          if (loading) {
            return t("text-text-dark/30 cursor-wait", "text-text-light/30 cursor-wait");
          }
          if (disabled) {
            return t(
              "text-text-dark/20 cursor-not-allowed",
              "text-text-light/20 cursor-not-allowed",
            );
          }
          if (danger) {
            return t("text-red-400 hover:bg-red-400/10", "text-red-500 hover:bg-red-500/10");
          }
          return t(
            "text-text-dark/60 hover:bg-white/5 hover:text-text-dark",
            "text-text-light/60 hover:bg-black/5 hover:text-text-light",
          );
        })()}`}
        disabled={disabled || loading}
        onClick={onClick}
      >
        <span className="flex items-center justify-center w-4">{icon}</span>
        {label}
      </button>
      {disabled && !loading && showTooltip && (
        <div className="pointer-events-none absolute inset-x-0 top-full z-50 mt-1 flex justify-start">
          <div
            className={`relative whitespace-nowrap px-2 py-1 text-[10px] shadow-lg ${t("bg-neutral-800 text-white", "bg-neutral-100 text-black border border-black/10")}`}
          >
            coming soon
            <div
              className={`absolute left-3 bottom-full h-1.5 w-1.5 rotate-45 ${t("bg-neutral-800", "bg-neutral-100")}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const EditorMoreMenu = ({
  pageId: _pageId,
  title,
  spaceName,
  spaceSlug,
  creatorId,
  createdAt,
  updatedAt,
  textContent,
  fullWidth,
  onToggleFullWidth,
  isWatching,
  watchPending,
  onToggleWatch,
  onDeleteStart,
  onDeleteSettled,
}: EditorMoreMenuProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const navigate = useNavigate();
  const deletePage = useDeletePage();

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    [],
  );

  const copyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast(`copied url for ${title} in ${spaceName ?? "space"}`);
    } catch (error) {
      console.error("failed to copy link:", error);
      showToast("failed to copy link");
    }
  }, [title, spaceName, showToast]);

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDeleteStart?.();
      deletePage.mutate(_pageId, {
        onError: () => {
          onDeleteSettled?.();
        },
        onSettled: () => {
          onDeleteSettled?.();
        },
        onSuccess: () => {
          setFlashToast(`deleted ${title}`);
          if (spaceSlug && spaceSlug !== "nospace") {
            navigate({ to: `/s/${spaceSlug}` });
            return;
          }
          navigate({ to: "/home" });
        },
      });
      setShowDeleteConfirm(false);
      setOpen(false);
    } else {
      setShowDeleteConfirm(true);
    }
  }, [
    showDeleteConfirm,
    _pageId,
    spaceSlug,
    deletePage,
    navigate,
    title,
    onDeleteStart,
    onDeleteSettled,
  ]);

  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
    }
  }, [open]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 192;
    // fallback height
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 300;
    let left = rect.right - 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - 6;
    }
    setPos({ left, top });
  }, []);

  const closeMenu = useCallback(() => {
    if (menuRef.current) {
      gsap.to(menuRef.current, {
        duration: 0.12,
        ease: "power2.in",
        onComplete: () => setOpen(false),
        opacity: 0,
        scale: 0.95,
        y: -4,
      });
    } else {
      setOpen(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      closeMenu();
    } else {
      setOpen(true);
      setTimeout(updatePosition, 0);
    }
  }, [open, updatePosition, closeMenu]);

  useEffect(() => {
    if (open && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, scale: 0.95, y: -4 },
        { duration: 0.15, ease: "power2.out", opacity: 1, scale: 1, y: 0 },
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      const { target } = e;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, closeMenu]);

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick?: () => void,
    danger?: boolean,
    disabled?: boolean,
    loading?: boolean,
  ) => (
    <DisabledMenuItem
      disabled={disabled}
      danger={danger}
      icon={icon}
      label={label}
      loading={loading}
      onClick={() => {
        if (disabled) {
          return;
        }
        closeMenu();
        onClick?.();
      }}
      t={t}
    />
  );

  const statItem = (icon: React.ReactNode, label: string, value: string) => (
    <div
      className={`flex items-center gap-1 px-2.5 py-0.5 text-[9px] ${t("text-text-dark/30", "text-text-light/30")}`}
    >
      <span className="flex items-center justify-center w-3.5">{icon}</span>
      <span>
        {label}: <span className={t("text-text-dark/50", "text-text-light/50")}>{value}</span>
      </span>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`p-0.5 ${t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
        onClick={toggle}
      >
        <DotsThreeVerticalIcon size={14} />
      </button>
      {open &&
        createPortal(
          <>
            <div ref={menuRef} className="fixed z-9999" style={{ left: pos.left, top: pos.top }}>
              <div
                className={`w-48 border py-1 ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
              >
                <div className="py-0.5">
                  {menuItem(<LinkSimpleIcon size={12} />, "copy link", copyLink)}
                  {menuItem(<ArticleIcon size={12} />, "copy as markdown", undefined, false, true)}
                </div>
                <div
                  className={`mx-3 my-0.5 border-t ${t("border-border-dark", "border-border-light")}`}
                />
                <div className="py-0.5">
                  {menuItem(
                    isWatching ? <EyeSlashIcon size={12} /> : <EyeIcon size={12} />,
                    isWatching ? "stop watching" : "watch page",
                    onToggleWatch,
                    false,
                    false,
                    watchPending,
                  )}
                  <button
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1 text-[11px] lowercase transition-colors ${t("text-text-dark/60 hover:bg-white/5 hover:text-text-dark", "text-text-light/60 hover:bg-black/5 hover:text-text-light")}`}
                    onClick={onToggleFullWidth}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-4">
                        <ArrowsHorizontalIcon size={12} />
                      </span>
                      full width
                    </div>
                    <div
                      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${fullWidth ? t("bg-white/20", "bg-black/20") : t("bg-white/10", "bg-black/10")}`}
                    >
                      <div
                        className={`absolute top-0.5 h-3 w-3 rounded-full transition-transform ${fullWidth ? t("translate-x-3.5 bg-white/60", "translate-x-3.5 bg-black/40") : t("translate-x-0.5 bg-white/30", "translate-x-0.5 bg-black/20")}`}
                      />
                    </div>
                  </button>
                </div>
                <div
                  className={`mx-3 my-0.5 border-t ${t("border-border-dark", "border-border-light")}`}
                />
                <div className="py-0.5">
                  {menuItem(<ClockCounterClockwiseIcon size={12} />, "page history")}
                  {menuItem(<ArrowSquareOutIcon size={12} />, "move")}
                  {menuItem(<FileArrowDownIcon size={12} />, "export")}
                  {menuItem(<PrinterIcon size={12} />, "print pdf")}
                </div>
                <div
                  className={`mx-3 my-1 border-t ${t("border-border-dark", "border-border-light")}`}
                />
                <div className="py-0.5">
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-1 text-[11px] lowercase transition-colors ${showDeleteConfirm ? "text-red-400 bg-red-400/10" : t("text-red-400/60 hover:bg-red-400/10", "text-red-500/60 hover:bg-red-500/10")}`}
                    onClick={handleDelete}
                    type="button"
                  >
                    <span className="flex items-center justify-center w-4">
                      <TrashIcon size={12} />
                    </span>
                    {showDeleteConfirm ? "confirm?" : "delete"}
                  </button>
                </div>
                <div
                  className={`mx-3 my-0.5 border-t ${t("border-border-dark", "border-border-light")}`}
                />
                <div className="py-0.5">
                  {creatorId && <CreatorTooltip creatorId={creatorId} t={t} />}
                  {statItem(<SquaresFourIcon size={10} />, "space", spaceName ?? "—")}
                  {statItem(
                    <TextAlignLeftIcon size={10} />,
                    "words",
                    String(wordCount(textContent)),
                  )}
                  <DateTooltip createdAt={createdAt} updatedAt={updatedAt} t={t} />
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
      {toast &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 z-10000 -translate-x-1/2">
            <div
              className={`px-3 py-1.5 text-[11px] lowercase shadow-lg ${t("bg-neutral-800 text-white", "bg-neutral-100 text-black border border-black/10")}`}
            >
              {toast}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
