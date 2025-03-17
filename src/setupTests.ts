// src/setupTests.ts
// This file is automatically run before Jest tests
import '@testing-library/jest-dom';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config(); // Let dotenv find the .env file automatically

// Make environment variables available via import.meta.env for test environment
(global as any).import = {
  meta: {
    env: {
      // Spotify credentials
      VITE_SPOTIFY_CLIENT_ID: process.env.VITE_SPOTIFY_CLIENT_ID || 'test-client-id',
      VITE_SPOTIFY_CLIENT_SECRET: process.env.VITE_SPOTIFY_CLIENT_SECRET || 'test-client-secret',
      VITE_SPOTIFY_REDIRECT_URI: process.env.VITE_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/spotify/callback',
      // Other environment variables
      VITE_APP_ENV: process.env.VITE_APP_ENV || 'test'
    }
  }
};

// Mock location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
});

// Mock browser APIs
class LocalStorageMock {
  private store: { [key: string]: string } = {};

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }
}

// Configure global mocks
global.localStorage = new LocalStorageMock() as unknown as Storage;

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args: any[]): void => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('Error:'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Add custom matchers to TypeScript interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

// Export something to make this a module
export {}; 