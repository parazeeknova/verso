export const isDesktopApp = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const win = window as unknown as Record<string, unknown>;
  if (win.__electrobun || win.versoDesktop) {
    return true;
  }
  if (
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Electrobun") || navigator.userAgent.includes("verso-desktop"))
  ) {
    return true;
  }
  if (
    window.location.search.includes("desktop=1") ||
    window.location.pathname.startsWith("/desktop")
  ) {
    return true;
  }
  return false;
};
