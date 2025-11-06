// Global setup that runs BEFORE any modules are loaded
// This ensures URL/URLSearchParams mocks are available before jsdom loads whatwg-url

export async function setup() {
  // Set up mocks BEFORE any modules are loaded
  if (typeof globalThis.URL === 'undefined' || !globalThis.URL.prototype) {
    // @ts-expect-error - Mocking URL for test environment
    globalThis.URL = class URL {
      href: string;
      protocol: string = '';
      host: string = '';
      hostname: string = '';
      port: string = '';
      pathname: string = '';
      search: string = '';
      hash: string = '';
      origin: string = '';
      username: string = '';
      password: string = '';
      searchParams: URLSearchParams;

      constructor(input: string, _base?: string) {
        this.href = input;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Mocking URLSearchParams for test environment
        this.searchParams = new globalThis.URLSearchParams();
      }

      toString() {
        return this.href;
      }

      toJSON() {
        return this.href;
      }
    };
  }

  if (
    typeof globalThis.URLSearchParams === 'undefined' ||
    !globalThis.URLSearchParams.prototype
  ) {
    // @ts-expect-error - Mocking URLSearchParams for test environment
    globalThis.URLSearchParams = class URLSearchParams {
      private params: Map<string, string> = new Map();

      constructor(init?: string | string[][] | Record<string, string>) {
        if (init) {
          if (typeof init === 'string') {
            const pairs = init.split('&');
            pairs.forEach(pair => {
              const [key, value] = pair.split('=');
              if (key)
                this.params.set(
                  decodeURIComponent(key),
                  decodeURIComponent(value || '')
                );
            });
          } else if (Array.isArray(init)) {
            init.forEach(([key, value]) => {
              this.params.set(String(key), String(value));
            });
          } else {
            Object.entries(init).forEach(([key, value]) => {
              this.params.set(key, String(value));
            });
          }
        }
      }

      get(name: string) {
        return this.params.get(name) || null;
      }

      getAll(name: string) {
        return Array.from(this.params.entries())
          .filter(([key]) => key === name)
          .map(([, value]) => value);
      }

      has(name: string) {
        return this.params.has(name);
      }

      set(name: string, value: string) {
        this.params.set(name, value);
      }

      append(name: string, value: string) {
        this.params.set(name, value);
      }

      delete(name: string) {
        this.params.delete(name);
      }

      forEach(callback: (value: string, key: string) => void) {
        this.params.forEach((value, key) => callback(value, key));
      }

      keys() {
        return this.params.keys();
      }

      values() {
        return this.params.values();
      }

      entries() {
        return this.params.entries();
      }

      toString() {
        return Array.from(this.params.entries())
          .map(
            ([key, value]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          )
          .join('&');
      }
    };
  }

  // Also set on global for compatibility
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Setting global URL for test environment
  global.URL = globalThis.URL;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Setting global URLSearchParams for test environment
  global.URLSearchParams = globalThis.URLSearchParams;
}

export async function teardown() {
  // Cleanup if needed
}
