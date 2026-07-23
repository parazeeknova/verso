import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import type { CollaboratorAwarenessUser } from "../lib/collaboration-presence";

export interface ActiveCollaborator {
  clientId: number | string;
  id?: string;
  isGuest?: boolean;
  name: string;
  avatar_url?: string | null;
  color?: string;
}

interface UsePresenceApiOptions {
  enabled?: boolean;
  shareToken?: string;
}

export const usePresenceApi = (
  pageId?: string,
  user?: CollaboratorAwarenessUser,
  options?: UsePresenceApiOptions,
) => {
  const [restCollaborators, setRestCollaborators] = useState<ActiveCollaborator[]>([]);
  const enabled = options?.enabled ?? true;
  const shareToken = options?.shareToken;

  const clientId = useMemo(() => {
    if (typeof window === "undefined") {
      return `client-${Math.random().toString(36).slice(2, 9)}`;
    }
    const stored = sessionStorage.getItem("verso-presence-client-id");
    if (stored) {
      return stored;
    }
    const newId = `client-${Math.random().toString(36).slice(2, 9)}`;
    try {
      sessionStorage.setItem("verso-presence-client-id", newId);
    } catch {
      // ignore
    }
    return newId;
  }, []);

  const sendHeartbeat = useRef<(() => Promise<void>) | null>(null);

  sendHeartbeat.current = async () => {
    if (!enabled || (!pageId && !shareToken) || !user) {
      return;
    }

    const payload = {
      avatar_url: user.avatar_url,
      clientId,
      color: user.color || "#3b82f6",
      id: user.id || clientId,
      isGuest: user.isGuest ?? false,
      isOwner: user.isOwner ?? false,
      name: user.name || "Anonymous",
    };

    try {
      let endpoint = `/api/console/pages/${pageId}/presence`;
      if (shareToken) {
        endpoint = `/api/shares/${shareToken}/presence`;
      }

      const res = await fetchProtected<{ collaborators: ActiveCollaborator[] }>(endpoint, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (res && Array.isArray(res.collaborators)) {
        // Filter out self by clientId or user id
        const remoteList = res.collaborators.filter(
          (c) => String(c.clientId) !== String(clientId) && String(c.id) !== String(user.id),
        );
        setRestCollaborators(remoteList);
      }
    } catch (error) {
      console.warn("Presence heartbeat failed:", error);
    }
  };

  useEffect(() => {
    if (!enabled || (!pageId && !shareToken)) {
      return;
    }

    // Initial heartbeat
    void sendHeartbeat.current?.();

    // Heartbeat every 3.5 seconds
    const interval = setInterval(() => {
      void sendHeartbeat.current?.();
    }, 3500);

    const handleBeforeUnload = () => {
      if (pageId && clientId) {
        const leaveUrl = `/api/pages/${pageId}/presence/leave?clientId=${clientId}`;
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(leaveUrl);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [pageId, shareToken, enabled, user, clientId]);

  return { collaborators: restCollaborators };
};
