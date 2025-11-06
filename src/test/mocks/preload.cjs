// CommonJS preload file that intercepts require() calls
// This MUST be CommonJS (.cjs) because it runs before ES modules are available
// This file is loaded via NODE_OPTIONS before any modules are loaded

const Module = require('module');
const originalRequire = Module.prototype.require;

// Create mock implementations
const createURLMock = () => {
  return class URL {
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
      this.searchParams = createURLSearchParamsMock();
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
};

const createURLSearchParamsMock = () => {
  return class URLSearchParams {
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
};

const URLMock = createURLMock();
const URLSearchParamsMock = createURLSearchParamsMock();

// Set globals FIRST
global.URL = URLMock;
global.URLSearchParams = URLSearchParamsMock;
globalThis.URL = URLMock;
globalThis.URLSearchParams = URLSearchParamsMock;

// Create mock modules
const whatwgUrlMock = {
  URL: URLMock,
  URLSearchParams: URLSearchParamsMock,
};

const webidlConversionsMock = {
  DOMString: value => String(value),
  USVString: value => String(value),
  ByteString: value => String(value),
  boolean: value => Boolean(value),
  long: value => Number(value),
  'unsigned long': value => Number(value),
  'long long': value => Number(value),
  'unsigned long long': value => Number(value),
  double: value => Number(value),
  unrestricted: value => Number(value),
  float: value => Number(value),
  'unrestricted float': value => Number(value),
};

// Intercept require() calls
Module.prototype.require = function (id) {
  // Intercept whatwg-url
  if (id === 'whatwg-url') {
    return whatwgUrlMock;
  }
  // Intercept webidl-conversions
  if (id === 'webidl-conversions') {
    return webidlConversionsMock;
  }
  // Intercept relative paths that resolve to these modules
  if (id.includes('whatwg-url') && !id.includes('node_modules')) {
    return whatwgUrlMock;
  }
  if (id.includes('webidl-conversions') && !id.includes('node_modules')) {
    return webidlConversionsMock;
  }
  // Call original require for everything else
  return originalRequire.apply(this, arguments);
};
