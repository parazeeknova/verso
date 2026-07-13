import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
