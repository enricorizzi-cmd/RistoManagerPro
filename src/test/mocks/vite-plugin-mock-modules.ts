// Vite plugin to intercept and replace problematic modules
import type { Plugin } from 'vite';
import path from 'path';

export function mockModulesPlugin(): Plugin {
  return {
    name: 'mock-modules',
    enforce: 'pre',
    resolveId(id) {
      // Intercept require calls for problematic modules
      if (id === 'whatwg-url' || id.includes('whatwg-url')) {
        return path.resolve(__dirname, 'whatwg-url-mock.js');
      }
      if (id === 'webidl-conversions' || id.includes('webidl-conversions')) {
        return path.resolve(__dirname, 'webidl-conversions-mock.js');
      }
      return null;
    },
  };
}
