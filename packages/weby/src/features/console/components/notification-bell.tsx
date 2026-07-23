import { BellIcon, CircleIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { useNotificationStream } from "#/features/console/hooks/use-notification-stream";
import type { NotificationItem } from "#/shared/types";

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
};

const MAX_VISIBLE = 4;

interface NotificationBellProps {
  isDarkMode: boolean;
}

export const NotificationBell = ({ isDarkMode }: NotificationBellProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [notiOpen, setNotiOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  useNotificationStream(!!user);

  const { data: countData } = useQuery({
    enabled: !!user,
    queryFn: ({ signal }) =>
      fetchProtected<{ count: number }>("/api/console/notifications/unread-count", { signal }),
    queryKey: ["notifications", "unread-count"],
    refetchInterval: 10_000,
  });

  const { data: notifications } = useQuery({
    enabled: notiOpen && !!user,
    queryFn: ({ signal }) =>
      fetchProtected<NotificationItem[]>("/api/console/notifications", { signal }),
    queryKey: ["notifications", "list"],
    refetchOnMount: "always",
  });

  const readMutation = useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ status: string }>(`/api/console/notifications/${id}/read`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: () =>
      fetchProtected<{ count: number }>("/api/console/notifications/dismiss-all", {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ status: string }>(`/api/console/notifications/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!notiOpen) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
    const handleClick = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
        setShowAll(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notiOpen, queryClient]);

  const unreadCount = countData?.count ?? 0;
  const allNotifs = notifications ?? [];
  const visible = showAll ? allNotifs : allNotifs.slice(0, MAX_VISIBLE);

  return (
    <div className="relative" ref={notiRef}>
      <button
        className={`relative flex items-center gap-1 lowercase ${t("text-text-dark/50 hover:text-text-dark/80", "text-text-light/50 hover:text-text-light/80")}`}
        onClick={() => setNotiOpen((o) => !o)}
        type="button"
      >
        <BellIcon size={12} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-1 text-[8px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {notiOpen && (
        <div
          className={`absolute right-0 top-full z-50 mt-1 w-72 border shadow-xl ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
        >
          <div className="py-1">
            <div
              className={`flex items-center justify-between border-b px-3 pb-1.5 pt-1.5 ${t("border-border-dark", "border-border-light")}`}
            >
              <span
                className={`text-[12px] lowercase ${t("text-text-dark/70", "text-text-light/70")}`}
              >
                notifications
              </span>
              {unreadCount > 0 && (
                <button
                  className={`text-[10px] lowercase ${t("text-text-dark/30 hover:text-text-dark/60", "text-text-light/30 hover:text-text-light/60")} disabled:opacity-30`}
                  disabled={dismissAllMutation.isPending}
                  onClick={() => dismissAllMutation.mutate()}
                  type="button"
                >
                  clear all
                </button>
              )}
            </div>
            {visible.length > 0 ? (
              <>
                {visible.map((n: NotificationItem) => (
                  <button
                    className={`group flex w-full items-start gap-2.5 px-3 py-2 text-left text-[11px] leading-tight ${n.readAt ? t("text-text-dark/40", "text-text-light/40") : t("text-text-dark/70 hover:bg-white/5", "text-text-light/70 hover:bg-black/3")}`}
                    key={n.id}
                    onClick={() => {
                      if (!n.readAt) {
                        readMutation.mutate(n.id);
                      }
                    }}
                    type="button"
                  >
                    {n.actorAvatarUrl ? (
                      <img
                        alt=""
                        className="mt-0.5 h-4 w-4 shrink-0 overflow-hidden rounded-full object-cover"
                        src={n.actorAvatarUrl}
                      />
                    ) : (
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-medium ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
                      >
                        {(n.actorName ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-medium">{n.title}</span>
                        <div className="flex items-center gap-1">
                          {!n.readAt && (
                            <CircleIcon
                              className={`shrink-0 ${t("text-text-dark/70", "text-text-light/70")}`}
                              size={6}
                              weight="fill"
                            />
                          )}
                          <XIcon
                            className={`hidden shrink-0 rounded p-px group-hover:block ${t("text-text-dark/20 hover:text-text-dark/60", "text-text-light/20 hover:text-text-light/60")}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissMutation.mutate(n.id);
                            }}
                            size={12}
                          />
                        </div>
                      </div>
                      <span
                        className={`mt-px block ${t("text-text-dark/50", "text-text-light/50")}`}
                      >
                        {n.body}
                      </span>
                      <span
                        className={`mt-0.5 block text-[10px] ${t("text-text-dark/25", "text-text-light/25")}`}
                      >
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                  </button>
                ))}
                {allNotifs.length > MAX_VISIBLE && !showAll && (
                  <button
                    className={`w-full border-t px-3 py-1.5 text-center text-[10px] lowercase ${t("border-border-dark text-text-dark/30 hover:text-text-dark/60", "border-border-light text-text-light/30 hover:text-text-light/60")}`}
                    onClick={() => setShowAll(true)}
                    type="button"
                  >
                    show {allNotifs.length - MAX_VISIBLE} more
                  </button>
                )}
                {showAll && allNotifs.length > MAX_VISIBLE && (
                  <button
                    className={`w-full border-t px-3 py-1.5 text-center text-[10px] lowercase ${t("border-border-dark text-text-dark/30 hover:text-text-dark/60", "border-border-light text-text-light/30 hover:text-text-light/60")}`}
                    onClick={() => setShowAll(false)}
                    type="button"
                  >
                    show less
                  </button>
                )}
              </>
            ) : (
              <p
                className={`px-3 py-2 text-[11px] ${t("text-text-dark/30", "text-text-light/30")}`}
              >
                {allNotifs.length === 0 && notifications ? "no notifications yet" : "loading..."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
