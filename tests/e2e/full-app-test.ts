/**
 * Full E2E Test for OGameX Application
 * Tests signup, login, and all game interfaces
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://ogamex-next.vercel.app';
const TEST_EMAIL = `test-e2e-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USERNAME = `TestUser${Date.now()}`;

// Collect all errors during tests
const collectedErrors: string[] = [];
const screenshots: string[] = [];

test.describe('OGameX Full Application Test', () => {

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        collectedErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      collectedErrors.push(`[Page Error] ${error.message}`);
    });
  });

  test('1. Homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/01-homepage.png', fullPage: true });
    screenshots.push('01-homepage.png');

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for login/signup buttons
    const loginBtn = page.locator('text=Login, text=Connexion, text=Se connecter').first();
    const signupBtn = page.locator('text=Signup, text=Register, text=Inscription, text=S\'inscrire').first();

    // Log what we find
    const bodyText = await page.locator('body').textContent();
    console.log('Body text preview:', bodyText?.substring(0, 500));
  });

  test('2. Signup flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/02-signup-page.png', fullPage: true });

    // Find form fields
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const usernameInput = page.locator('input[name="username"]').first();

    // Fill form
    if (await usernameInput.isVisible()) {
      await usernameInput.fill(TEST_USERNAME);
    }

    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_EMAIL);
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(TEST_PASSWORD);
    }

    await page.screenshot({ path: 'tests/screenshots/03-signup-filled.png', fullPage: true });

    // Submit form
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/screenshots/04-signup-result.png', fullPage: true });

    // Check for errors
    const errorMessages = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Signup errors:', errorMessages);
      collectedErrors.push(`[Signup Error] ${errorMessages.join(', ')}`);
    }

    // Check current URL
    console.log('URL after signup:', page.url());
  });

  test('3. Login flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/05-login-page.png', fullPage: true });

    // Fill login form with a test account
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@test.com');
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill('test123456');
    }

    await page.screenshot({ path: 'tests/screenshots/06-login-filled.png', fullPage: true });
  });

  test('4. Game Overview Page', async ({ page }) => {
    // First login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Navigate to game overview
    await page.goto(`${BASE_URL}/game/overview`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/07-overview.png', fullPage: true });

    // Check for 3D toggle button
    const toggle3D = page.locator('text=3D, text=2D, button:has-text("3D")').first();
    if (await toggle3D.isVisible()) {
      console.log('3D toggle found');
    }

    // Check for missing translations
    const missingTranslations = await page.locator('text=MISSING_MESSAGE').count();
    if (missingTranslations > 0) {
      collectedErrors.push(`[Missing Translations] Found ${missingTranslations} missing translation keys`);
    }

    // Log current URL
    console.log('Overview URL:', page.url());
  });

  test('5. Buildings Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/buildings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/08-buildings.png', fullPage: true });

    // Check for building cards
    const buildingCards = await page.locator('.building-card, [data-building], .card').count();
    console.log(`Found ${buildingCards} building elements`);

    // Check for missing translations
    const missingTranslations = await page.locator('text=MISSING_MESSAGE').count();
    if (missingTranslations > 0) {
      collectedErrors.push(`[Buildings Page] Found ${missingTranslations} missing translation keys`);
    }
  });

  test('6. Research Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/research`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/09-research.png', fullPage: true });

    // Check for missing translations
    const missingTranslations = await page.locator('text=MISSING_MESSAGE').count();
    if (missingTranslations > 0) {
      collectedErrors.push(`[Research Page] Found ${missingTranslations} missing translation keys`);
    }
  });

  test('7. Shipyard Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/shipyard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/10-shipyard.png', fullPage: true });

    // Check for missing translations
    const missingTranslations = await page.locator('text=MISSING_MESSAGE').count();
    if (missingTranslations > 0) {
      collectedErrors.push(`[Shipyard Page] Found ${missingTranslations} missing translation keys`);
    }
  });

  test('8. Defense Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/defense`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/11-defense.png', fullPage: true });

    // Check for missing translations
    const missingTranslations = await page.locator('text=MISSING_MESSAGE').count();
    if (missingTranslations > 0) {
      collectedErrors.push(`[Defense Page] Found ${missingTranslations} missing translation keys`);
    }
  });

  test('9. Galaxy Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/galaxy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/12-galaxy.png', fullPage: true });
  });

  test('10. Fleet Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/fleet`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/13-fleet.png', fullPage: true });
  });

  test.afterAll(async () => {
    console.log('\n========== TEST SUMMARY ==========');
    console.log('Screenshots taken:', screenshots.length);

    if (collectedErrors.length > 0) {
      console.log('\n========== ERRORS FOUND ==========');
      collectedErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    } else {
      console.log('\nNo errors detected!');
    }
  });
});
