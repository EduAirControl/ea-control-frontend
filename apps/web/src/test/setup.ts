import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Storage funcional (no spies): los tests leen y escriben valores reales y
// `vi.resetAllMocks()` no debe dejar los métodos sin implementación.
function createStorage(): Storage {
  let data: Record<string, string> = {}
  return {
    getItem: (key: string) =>
      Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
    setItem: (key: string, value: string) => {
      data[key] = String(value)
    },
    removeItem: (key: string) => {
      delete data[key]
    },
    clear: () => {
      data = {}
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
    get length() {
      return Object.keys(data).length
    },
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createStorage(),
  configurable: true,
  writable: true,
})

Object.defineProperty(window, 'sessionStorage', {
  value: createStorage(),
  configurable: true,
  writable: true,
})

// `pathname` hace falta para PUBLIC_PATHS de AuthContext/apiClient y `assign`
// debe cambiar `href` para poder asertar el redirect tras logout.
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost/',
    pathname: '/dashboard',
    origin: 'http://localhost',
    assign: (url: string) => {
      window.location.href = url
    },
    replace: (url: string) => {
      window.location.href = url
    },
  },
  configurable: true,
  writable: true,
})

// Mock fetch
global.fetch = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
