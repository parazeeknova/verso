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

  // Store volatile parameters in refs so interval does not reset on re-renders
  const paramsRef = useRef({ enabled, pageId, shareToken, user });
  useEffect(() => {
    paramsRef.current = { enabled, pageId, shareToken, user };
  }, [enabled, pageId, shareToken, user]);

  const sendHeartbeat = useRef<(() => Promise<void>) | null>(null);

  sendHeartbeat.current = async () => {
    const {
      enabled: isEnabled,
      pageId: pid,
      shareToken: stoken,
      user: currentUser,
    } = paramsRef.current;

    if (!isEnabled || (!pid && !stoken) || !currentUser) {
      return;
    }

    const payload = {
      avatar_url: currentUser.avatar_url,
      clientId,
      color: currentUser.color || "#3b82f6",
      id: currentUser.id || clientId,
      isGuest: currentUser.isGuest ?? false,
      isOwner: currentUser.isOwner ?? false,
      name: currentUser.name || "Anonymous",
    };

    try {
      let endpoint = `/api/console/pages/${pid}/presence`;
      if (stoken) {
        endpoint = `/api/shares/${stoken}/presence`;
      }

      const res = await fetchProtected<{ collaborators: ActiveCollaborator[] }>(endpoint, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (res && Array.isArray(res.collaborators)) {
        // Filter out self by clientId or user id
        const remoteList = res.collaborators.filter(
          (c) => String(c.clientId) !== String(clientId) && String(c.id) !== String(currentUser.id),
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

    // Heartbeat every 10 seconds
    const interval = setInterval(() => {
      void sendHeartbeat.current?.();
    }, 10_000);

    const handleBeforeUnload = () => {
      const { pageId: pid } = paramsRef.current;
      if (pid && clientId) {
        const leaveUrl = `/api/pages/${pid}/presence/leave?clientId=${clientId}`;
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
  }, [pageId, shareToken, enabled, clientId]);

  return { collaborators: restCollaborators };
};
