// Import Prisma mock FIRST before anything else
import './setup-prisma';
import '@testing-library/jest-dom';

// Set up test environment
process.env.NODE_ENV = 'test';

// Polyfill fetch for Node environment
if (!globalThis.fetch) {
  const nodeFetch = require('node-fetch');
  globalThis.fetch = nodeFetch;
  globalThis.Request = nodeFetch.Request;
  globalThis.Response = nodeFetch.Response;
  globalThis.Headers = nodeFetch.Headers;
}

// Polyfill for Next.js Web APIs
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream for Node environment
if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth for client components
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// For components that need document
if (typeof document === 'undefined') {
  /**
   * @jest-environment jsdom
   */
}