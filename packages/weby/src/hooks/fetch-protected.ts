let refreshPromise: Promise<boolean> | null = null;

const refreshTokens = (): Promise<boolean> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const fetchProtected = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let res = await fetch(url, { ...init, credentials: "include" });
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await fetch(url, { ...init, credentials: "include" });
    }
  }

  if (!res.ok) {
    let errorMessage = `request failed (${res.status})`;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const errBody = (await res.json()) as { error?: string };
        if (errBody.error) {
          errorMessage = errBody.error;
        }
      } catch {
        // Ignore JSON parse errors for error bodies
      }
    }
    throw new Error(errorMessage);
  }

  const text = await res.text();
  if (!text.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // eslint-disable-next-line no-console
    console.error("[fetchProtected] non-JSON response:", {
      status: res.status,
      text: text.slice(0, 500),
      url,
    });
    throw new Error("unexpected response from server");
  }
};
