/**
 * E2E Tests - Authentication Flows
 * Complete end-to-end testing of authentication using Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Login Flow', () => {
    test('should display login page for unauthenticated users', async ({ page }) => {
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Check login page elements
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    });

    test('should show invite code field on login page', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByLabel(/invite code/i)).toBeVisible();
      await expect(page.getByText(/don't have an invite/i)).toBeVisible();
    });

    test.skip('should complete Google Sign-In flow', async ({ page, context }) => {
      // Note: This requires Google OAuth setup in test environment
      await page.goto('/login');

      // Click Google Sign-In button
      await page.getByRole('button', { name: /sign in with google/i }).click();

      // Handle OAuth popup (mock for testing)
      const popupPromise = context.waitForEvent('page');
      const popup = await popupPromise;

      // In real test, would interact with Google OAuth
      // For now, mock the callback
      await popup.close();

      // Should redirect to home after successful login
      await expect(page).toHaveURL('/');
    });

    test('should display error for invalid invite code', async ({ page }) => {
      await page.goto('/login');

      // Enter invalid invite code
      await page.getByLabel(/invite code/i).fill('INVALID123');

      // Try to sign in (would fail in real scenario)
      await page.getByRole('button', { name: /sign in with google/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid invite code/i)).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/upload');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from results page', async ({ page }) => {
      await page.goto('/results/test-job-123');

      await expect(page).toHaveURL(/\/login/);
    });

    test.skip('should allow authenticated users to access upload page', async ({ page }) => {
      // Mock authentication state
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'test-user-123',
          email: 'test@example.com',
        }));
      });

      await page.goto('/upload');

      await expect(page).toHaveURL('/upload');
      await expect(page.locator('h1')).toContainText('Upload Blueprint');
    });
  });

  test.describe('Upload with Authentication', () => {
    test.skip('should upload blueprint when authenticated', async ({ page }) => {
      // Setup auth
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'test-user-123',
          email: 'test@example.com',
          stsTokenManager: {
            accessToken: 'mock-token',
          },
        }));
      });

      await page.goto('/upload');

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'blueprint.png',
        mimeType: 'image/png',
        buffer: Buffer.from('mock-image-data'),
      });

      // Should show file selected
      await expect(page.getByText(/blueprint.png/i)).toBeVisible();

      // Click upload
      await page.getByRole('button', { name: /upload/i }).click();

      // Should navigate to results
      await expect(page).toHaveURL(/\/results/);
    });

    test('should include auth token in upload request', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'test-user-123',
          email: 'test@example.com',
          stsTokenManager: {
            accessToken: 'mock-token-123',
          },
        }));
      });

      // Intercept upload request
      let authHeaderPresent = false;
      await page.route('**/upload', (route) => {
        const headers = route.request().headers();
        authHeaderPresent = headers['authorization']?.includes('Bearer') || false;
        route.fulfill({ status: 200, body: JSON.stringify({ jobId: 'test-123' }) });
      });

      await page.goto('/upload');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('test'),
      });

      await page.getByRole('button', { name: /upload/i }).click();

      // Verify auth header was sent
      expect(authHeaderPresent).toBe(true);
    });
  });

  test.describe('Admin Dashboard', () => {
    test.skip('should show admin dashboard for admin users', async ({ page }) => {
      // Mock admin authentication
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'admin-123',
          email: 'admin@example.com',
          customClaims: { role: 'admin' },
        }));
      });

      await page.goto('/admin');

      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      await expect(page.getByRole('button', { name: /create invite/i })).toBeVisible();
    });

    test('should redirect non-admin users from admin dashboard', async ({ page }) => {
      // Mock regular user authentication
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'user-123',
          email: 'user@example.com',
          customClaims: { role: 'user' },
        }));
      });

      await page.goto('/admin');

      // Should redirect to home
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/unauthorized/i)).toBeVisible();
    });
  });

  test.describe('Invite Creation and Validation', () => {
    test.skip('should allow admin to create invite', async ({ page }) => {
      // Mock admin auth
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'admin-123',
          email: 'admin@example.com',
          customClaims: { role: 'admin' },
        }));
      });

      await page.goto('/admin');

      // Click create invite
      await page.getByRole('button', { name: /create invite/i }).click();

      // Fill in invite details
      await page.getByLabel(/email/i).fill('newuser@example.com');
      await page.getByLabel(/role/i).selectOption('user');

      // Submit
      await page.getByRole('button', { name: /generate/i }).click();

      // Should show success message with invite code
      await expect(page.getByText(/invite created/i)).toBeVisible();
      await expect(page.getByText(/INVITE/)).toBeVisible();
    });

    test.skip('should validate invite code during registration', async ({ page }) => {
      await page.goto('/login');

      // Enter valid invite code
      await page.getByLabel(/invite code/i).fill('VALID123');

      // Mock invite validation
      await page.route('**/invites/validate', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ valid: true, email: 'newuser@example.com' }),
        });
      });

      await page.getByRole('button', { name: /sign in with google/i }).click();

      // Should proceed with authentication
      // Exact flow depends on implementation
    });
  });

  test.describe('User Menu and Logout', () => {
    test.skip('should display user menu when authenticated', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
        }));
      });

      await page.goto('/');

      // Click user menu
      await page.getByTestId('user-menu-button').click();

      // Should show user info and logout
      await expect(page.getByText('Test User')).toBeVisible();
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
    });

    test.skip('should logout user and redirect to login', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'user-123',
          email: 'user@example.com',
        }));
      });

      await page.goto('/');

      // Open user menu and logout
      await page.getByTestId('user-menu-button').click();
      await page.getByRole('button', { name: /logout/i }).click();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Auth state should be cleared
      const authState = await page.evaluate(() => localStorage.getItem('firebase:authUser'));
      expect(authState).toBeNull();
    });
  });

  test.describe('Unauthorized Access Handling', () => {
    test('should handle 401 responses by redirecting to login', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'user-123',
          email: 'user@example.com',
        }));
      });

      // Mock API returning 401
      await page.route('**/api/**', (route) => {
        route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
      });

      await page.goto('/upload');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByText(/session expired/i)).toBeVisible();
    });

    test('should handle 403 responses with error message', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('firebase:authUser', JSON.stringify({
          uid: 'user-123',
          email: 'user@example.com',
        }));
      });

      // Mock API returning 403
      await page.route('**/api/admin/**', (route) => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Forbidden: Admin access required' })
        });
      });

      await page.goto('/admin');

      await expect(page.getByText(/forbidden/i)).toBeVisible();
    });
  });

  test.describe('Token Refresh', () => {
    test.skip('should refresh expired token automatically', async ({ page }) => {
      let tokenRefreshed = false;

      // Mock token refresh
      await page.route('**/token/refresh', (route) => {
        tokenRefreshed = true;
        route.fulfill({
          status: 200,
          body: JSON.stringify({ token: 'new-token-123' }),
        });
      });

      // Setup with expired token
      await page.addInitScript(() => {
        const expiredAuth = {
          uid: 'user-123',
          email: 'user@example.com',
          stsTokenManager: {
            accessToken: 'expired-token',
            expirationTime: Date.now() - 1000, // Expired
          },
        };
        localStorage.setItem('firebase:authUser', JSON.stringify(expiredAuth));
      });

      // Make authenticated request
      await page.goto('/upload');

      // Token should be refreshed
      await page.waitForTimeout(1000);
      expect(tokenRefreshed).toBe(true);
    });
  });
});
