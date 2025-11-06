import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../../App';
import { AppProvider } from '../../contexts/AppContext';
import { AuthProvider } from '../../contexts/AuthContext';

describe('App', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Mock localStorage for auth token
    localStorage.setItem('auth_token', 'mock-token');
    // Mock fetch for auth verification
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: '1',
              firstName: 'Test',
              lastName: 'User',
              email: 'test@test.com',
              role: 'admin',
            },
          }),
      })
    ) as any;
  });

  it('renders without crashing', async () => {
    const { container } = render(
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    );

    // Wait for async operations to complete
    await waitFor(() => {
      // App should render (either login page or main app)
      const appContainer = container.querySelector('.flex.h-screen');
      expect(appContainer).toBeTruthy();
    });
  });
});
