import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NotificationItem } from "#/shared/types";

const audio = typeof Audio === "undefined" ? null : new Audio("/notification.mp3");

export const useNotificationStream = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let stopped = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      try {
        if (stopped) {
          return;
        }

        clearReconnectTimer();

        const es = new EventSource("/api/console/notifications/stream");
        esRef.current = es;

        es.addEventListener("message", (event: MessageEvent) => {
          try {
            const notif = JSON.parse(event.data) as NotificationItem;

            queryClient.setQueryData<NotificationItem[]>(["notifications", "list"], (old) => [
              notif,
              ...(old ?? []),
            ]);

            queryClient.setQueryData<{ count: number }>(
              ["notifications", "unread-count"],
              (old) => ({
                count: (old?.count ?? 0) + 1,
              }),
            );

            void (async () => {
              try {
                await audio?.play();
              } catch {
                // browser may block autoplay
              }
            })();
          } catch {
            // ignore parse errors
          }
        });

        es.addEventListener("error", () => {
          es.close();
          if (stopped) {
            return;
          }
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            void connect();
          }, 2000);
        });
      } catch {
        if (!stopped) {
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            void connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      stopped = true;
      esRef.current?.close();
      clearReconnectTimer();
    };
  }, [enabled, queryClient]);
};
