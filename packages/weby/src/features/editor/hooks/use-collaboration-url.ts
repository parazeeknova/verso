import { useMemo } from "react";

export const useCollaborationUrl = (): string =>
  useMemo(() => {
    if (typeof window === "undefined") {
      return "ws://localhost:7000/ws/collab";
    }

    const { host: windowHost, protocol: windowProtocol } = window.location;
    const isSecure = windowProtocol === "https:";
    const protocol = isSecure ? "wss:" : "ws:";
    let host = windowHost;

    if (host.includes(":3000")) {
      host = host.replace(":3000", ":7000");
    }

    return `${protocol}//${host}/ws/collab`;
  }, []);
