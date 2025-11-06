// Mock replacement for whatwg-url
// This file is used as an alias replacement in vitest.config.ts

const { URLMock, URLSearchParamsMock } = require('./url-mock.ts');

module.exports = {
  URL: URLMock,
  URLSearchParams: URLSearchParamsMock,
};
