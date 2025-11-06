import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Mock URL and URLSearchParams to avoid webidl-conversions errors
global.URL = class URL {
  constructor(
    public href: string,
    public base?: string
  ) {}
  get searchParams() {
    return new URLSearchParams();
  }
} as any;

global.URLSearchParams = class URLSearchParams {
  get() {
    return null;
  }
  has() {
    return false;
  }
  set() {}
  delete() {}
  forEach() {}
  keys() {
    return [];
  }
  values() {
    return [];
  }
  entries() {
    return [];
  }
} as any;

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
