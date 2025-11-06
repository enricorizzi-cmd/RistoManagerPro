// Mock implementations of URL and URLSearchParams
// These are used to replace whatwg-url and webidl-conversions

export class URLMock {
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
  searchParams: URLSearchParamsMock;

  constructor(input: string, _base?: string) {
    this.href = input;
    this.searchParams = new URLSearchParamsMock();
  }

  toString() {
    return this.href;
  }

  toJSON() {
    return this.href;
  }
}

export class URLSearchParamsMock {
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
}
