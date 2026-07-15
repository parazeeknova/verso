import { vi } from "vitest";

export interface MockXHRConfig {
  mockResponse: unknown;
  shouldSucceed: boolean;
  // When provided and shouldSucceed is false, the mock invokes onload with this
  // status instead of triggering onerror (used to cover the HTTP-status failure path).
  failStatusCode?: number;
}

// Builds a mock XMLHttpRequest constructor that resolves/rejects synchronously-ish
// based on the given config. The caller keeps a reference to `config` so it can
// mutate `shouldSucceed`/`failStatusCode` between tests.
export const createMockXHRClass = (config: MockXHRConfig): typeof XMLHttpRequest => {
  class MockXMLHttpRequest {
    open = vi.fn();
    status = 0;
    responseText = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    upload = {
      addEventListener: vi.fn().mockImplementation(
        (
          event: string,
          // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
          cb: (e: { lengthComputable: boolean; loaded: number; total: number }) => void,
        ) => {
          // Simulate progress callback immediately
          if (event === "progress") {
            // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
            cb({ lengthComputable: true, loaded: 50, total: 100 });
          }
        },
      ),
    };

    send = vi.fn().mockImplementation(() => {
      if (config.shouldSucceed) {
        this.status = 200;
        this.responseText = JSON.stringify(config.mockResponse);
        this.onload?.();
      } else if (typeof config.failStatusCode === "number") {
        this.status = config.failStatusCode;
        this.onload?.();
      } else {
        this.status = 500;
        this.onerror?.();
      }
    });

    // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
    addEventListener = vi.fn().mockImplementation((event: string, cb: () => void) => {
      if (event === "load") {
        // eslint-disable-next-line eslint-plugin-unicorn/prefer-add-event-listener
        this.onload = cb;
      }
      if (event === "error") {
        // eslint-disable-next-line eslint-plugin-unicorn/prefer-add-event-listener
        this.onerror = cb;
      }
    });
  }

  return MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
};
