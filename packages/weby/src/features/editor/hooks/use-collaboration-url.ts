import { useMemo } from "react";

export const useCollaborationUrl = (): string =>
  useMemo(() => {
    if (typeof window === "undefined") {
      return "ws://localhost:7000/ws/collab";
    }

    const { host: windowHost, hostname, protocol: windowProtocol } = window.location;
    const isSecure = windowProtocol === "https:";
    let protocol = isSecure ? "wss:" : "ws:";
    let host = windowHost;

    if (host.includes(":3000")) {
      host = host.replace(":3000", ":7000");
    } else if (
      windowProtocol.startsWith("electrobun") ||
      windowProtocol.startsWith("file") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      // In Electrobun desktop app or local development environment
      host = "localhost:7000";
      protocol = "ws:";
    }

    return `${protocol}//${host}/ws/collab`;
  }, []);
