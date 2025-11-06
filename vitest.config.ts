import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Replace problematic modules with mocks BEFORE they're loaded
      'whatwg-url': path.resolve(
        __dirname,
        'src/test/mocks/whatwg-url-mock.js'
      ),
      'webidl-conversions': path.resolve(
        __dirname,
        'src/test/mocks/webidl-conversions-mock.js'
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'components/**',
        'contexts/**',
        'services/**',
        'utils/**',
        'types.ts',
        'App.tsx',
        'index.tsx',
      ],
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    server: {
      deps: {
        inline: ['whatwg-url', 'webidl-conversions'],
      },
    },
  },
});
