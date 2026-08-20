import "@testing-library/jest-dom"
import { vi } from "vitest"

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))