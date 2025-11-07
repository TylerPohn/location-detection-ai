import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Application
 *
 * These tests verify the complete user flow from a browser perspective
 */

test.describe('Application E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/Vite \+ React/);

    // Verify main heading
    await expect(page.locator('h1')).toHaveText('Vite + React');
  });

  test('counter functionality works', async ({ page }) => {
    await page.goto('/');

    // Find the button
    const button = page.locator('button:has-text("count is")');

    // Verify initial state
    await expect(button).toHaveText('count is 0');

    // Click and verify increment
    await button.click();
    await expect(button).toHaveText('count is 1');

    // Click again
    await button.click();
    await expect(button).toHaveText('count is 2');
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify content is still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("count is")')).toBeVisible();
  });

  test('logos are visible and clickable', async ({ page }) => {
    await page.goto('/');

    // Check Vite logo
    const viteLogo = page.locator('img[alt="Vite logo"]');
    await expect(viteLogo).toBeVisible();

    // Check React logo
    const reactLogo = page.locator('img[alt="React logo"]');
    await expect(reactLogo).toBeVisible();

    // Verify links work
    const viteLink = page.locator('a[href="https://vite.dev"]');
    await expect(viteLink).toHaveAttribute('target', '_blank');
  });
});

/**
 * PLACEHOLDER: Blueprint Upload Flow
 *
 * These tests will be enabled once the upload components are implemented
 */
test.describe.skip('Blueprint Upload Flow (Future)', () => {
  test('complete upload and detection flow', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Click get started
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/upload');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/sample-blueprint.png');

    // Wait for preview
    await expect(page.locator('text=sample-blueprint.png')).toBeVisible();

    // Start detection
    await page.click('text=Start Detection');

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();

    // Should redirect to results
    await page.waitForURL('/results/*', { timeout: 30000 });

    // Verify results page
    await expect(page.locator('text=Detection Results')).toBeVisible();
  });

  test('validates file type', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/invalid-file.txt');

    await expect(page.locator('text=Invalid file type')).toBeVisible();
  });

  test('shows upload progress', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/large-blueprint.png');

    await page.click('text=Start Detection');

    // Should show progress indicator
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });
});
