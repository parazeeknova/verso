import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useNotificationStream } from "./use-notification-stream";

class MockEventSource {
  static instances: MockEventSource[] = [];

  listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  close = vi.fn();

  emit(type: string, data: string) {
    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      listener({ data } as MessageEvent);
    }
  }
}

const createMockResponse = (data: unknown, ok = true, status = 200): Response => {
  const body = JSON.stringify(data);
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    ok,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
};

describe("useNotificationStream", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const originalEventSource = globalThis.EventSource;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.resetAllMocks();
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    queryClient.clear();
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("queries auth before opening the stream and updates the notification cache", async () => {
    const mockNotification = {
      actorAvatarUrl: "",
      actorName: "Alice",
      actorUserId: "user-1",
      body: "Body",
      createdAt: "2026-05-15T00:00:00Z",
      entityId: "page-1",
      entityType: "page",
      id: "notif-1",
      metadata: "{}",
      readAt: null,
      recipientUserId: "user-2",
      title: "Title",
      type: "page_updated",
    };

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse({ id: "user-1" }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    renderHook(() => useNotificationStream(true), { wrapper: Wrapper });

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    MockEventSource.instances[0]?.emit("message", JSON.stringify(mockNotification));

    expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/auth/me", { credentials: "include" });
    await waitFor(() => {
      expect(queryClient.getQueryData(["notifications", "list"])).toEqual([mockNotification]);
    });
  });

  it("does not create EventSource or schedule reconnect when disabled", async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    renderHook(() => useNotificationStream(false), { wrapper: Wrapper });

    // Wait a brief period to ensure no async actions occur
    // eslint-disable-next-line promise/avoid-new
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(MockEventSource.instances).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
