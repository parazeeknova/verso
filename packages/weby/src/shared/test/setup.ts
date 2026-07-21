import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Polyfill vi.stubGlobal / vi.unstubAllGlobals for bun's native test runner
// which provides a limited vi object without these methods.
const originalGlobals = new Map<string, unknown>();

if (typeof vi.stubGlobal !== "function") {
  vi.stubGlobal = (key: string | number | symbol, value: unknown) => {
    const k = String(key);
    if (!originalGlobals.has(k)) {
      originalGlobals.set(k, (globalThis as Record<string, unknown>)[k]);
    }
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value,
      writable: true,
    });
    return vi;
  };
}

if (typeof vi.unstubAllGlobals !== "function") {
  vi.unstubAllGlobals = () => {
    for (const [key, original] of originalGlobals) {
      if (original === undefined) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.defineProperty(globalThis, key, {
          configurable: true,
          value: original,
          writable: true,
        });
      }
    }
    originalGlobals.clear();
    return vi;
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage (zustand persist middleware requires it)
const localStorageStore = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    clear: () => localStorageStore.clear(),
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    removeItem: (key: string) => {
      localStorageStore.delete(key);
    },
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value);
    },
  },
  writable: true,
});

// Mock fetch globally
Object.defineProperty(globalThis, "fetch", {
  value: vi.fn(),
  writable: true,
});

// Mock IntersectionObserver globally
const MockIntersectionObserver = vi.fn();
MockIntersectionObserver.prototype = {
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
};
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock ResizeObserver globally
const MockResizeObserver = vi.fn();
MockResizeObserver.prototype = {
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
};
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// Mock environment variables
vi.stubEnv("VITE_GITHUB_USERNAME", "testuser");
