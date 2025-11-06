// Mock replacement for whatwg-url
// This file is used as an alias replacement in vitest.config.ts
// Must be standalone CommonJS module (no ES6 imports)

// Ensure URL and URLSearchParams are available globally
if (typeof globalThis.URL === 'undefined') {
  globalThis.URL = class URL {
    constructor(input, _base) {
      this.href = String(input);
      this.protocol = '';
      this.host = '';
      this.hostname = '';
      this.port = '';
      this.pathname = '';
      this.search = '';
      this.hash = '';
      this.origin = '';
      this.username = '';
      this.password = '';
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

if (typeof globalThis.URLSearchParams === 'undefined') {
  globalThis.URLSearchParams = class URLSearchParams {
    constructor(init) {
      this.params = new Map();
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
        } else if (init && typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.params.set(key, String(value));
          });
        }
      }
    }
    get(name) {
      return this.params.get(name) || null;
    }
    getAll(name) {
      return Array.from(this.params.entries())
        .filter(([key]) => key === name)
        .map(([, value]) => value);
    }
    has(name) {
      return this.params.has(name);
    }
    set(name, value) {
      this.params.set(name, value);
    }
    append(name, value) {
      this.params.set(name, value);
    }
    delete(name) {
      this.params.delete(name);
    }
    forEach(callback) {
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

// Export URL and URLSearchParams classes
module.exports = {
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
};
