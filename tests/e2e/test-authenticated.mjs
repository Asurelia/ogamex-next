/**
 * Full E2E Test for OGameX Application - With Authentication
 * Tests all game pages after logging in
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = './tests/screenshots/authenticated';

// Test credentials
const TEST_EMAIL = 'rafaillac.sylvain@gmail.com';
const TEST_PASSWORD = 'Aurora-94';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const errors = [];
const warnings = [];
const missingTranslations = new Set();
const uiIssues = [];

async function runTests() {
  console.log('🚀 Starting OGameX Authenticated E2E Tests...\n');
  console.log(`📌 Base URL: ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: false,  // Show browser for debugging
    slowMo: 500       // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  // Collect console errors and missing translations
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (!text.includes('favicon')) { // Ignore favicon errors
        errors.push(`[Console] ${text}`);
      }
    }
    // Detect missing translations
    if (text.includes('MISSING_MESSAGE')) {
      const match = text.match(/MISSING_MESSAGE:\s*([^\s(]+)/);
      if (match) missingTranslations.add(match[1]);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[Page Error] ${error.message}`);
  });

  let screenshotIndex = 1;
  const screenshot = async (name) => {
    const filename = `${String(screenshotIndex++).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${filename}`, fullPage: true });
    console.log(`   📸 Screenshot: ${filename}`);
    return filename;
  };

  try {
    // =====================
    // Test 1: Login
    // =====================
    console.log('\n📄 Test 1: Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot('login-page');

    // Fill login form
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');

    await emailField.fill(TEST_EMAIL);
    await passwordField.fill(TEST_PASSWORD);
    await screenshot('login-filled');

    // Submit
    await page.locator('button[type="submit"]').click();
    console.log('   → Submitted login form');

    // Wait for navigation
    await page.waitForTimeout(3000);
    await screenshot('login-result');

    const afterLoginUrl = page.url();
    console.log(`   → After login URL: ${afterLoginUrl}`);

    if (afterLoginUrl.includes('/game')) {
      console.log('   ✓ Login successful!');
    } else {
      console.log('   ⚠ Login may have failed - checking for errors');
      const errorText = await page.locator('.text-red-500, .text-destructive, [role="alert"]').allTextContents();
      if (errorText.length > 0) {
        errors.push(`[Login] ${errorText.join(', ')}`);
      }
    }

    // =====================
    // Test Game Pages
    // =====================
    const gamePages = [
      { name: 'Overview', path: '/game/overview', checks: ['planet', 'resources', '3D'] },
      { name: 'Resources', path: '/game/resources', checks: ['metal', 'crystal', 'deuterium'] },
      { name: 'Facilities', path: '/game/facilities', checks: ['robotics', 'shipyard'] },
      { name: 'Research', path: '/game/research', checks: ['technology', 'research'] },
      { name: 'Shipyard', path: '/game/shipyard', checks: ['ship', 'build'] },
      { name: 'Defense', path: '/game/defense', checks: ['defense', 'launcher'] },
      { name: 'Fleet', path: '/game/fleet', checks: ['fleet', 'mission'] },
      { name: 'Galaxy', path: '/game/galaxy', checks: ['galaxy', 'system'] },
      { name: 'Alliance', path: '/game/alliance', checks: ['alliance'] },
      { name: 'Highscore', path: '/game/highscore', checks: ['rank', 'score'] },
      { name: 'Messages', path: '/game/messages', checks: ['message'] },
    ];

    for (const gamePage of gamePages) {
      console.log(`\n📄 Test: ${gamePage.name} page...`);

      try {
        await page.goto(`${BASE_URL}${gamePage.path}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await screenshot(gamePage.name.toLowerCase());

        const currentUrl = page.url();

        // Check if redirected to login
        if (currentUrl.includes('/login')) {
          warnings.push(`[${gamePage.name}] Redirected to login - session may have expired`);
          console.log(`   ⚠ Redirected to login`);
          continue;
        }

        // Check for missing translations on page
        const pageContent = await page.content();
        const missingOnPage = (pageContent.match(/MISSING_MESSAGE/g) || []).length;
        if (missingOnPage > 0) {
          console.log(`   ⚠ Missing ${missingOnPage} translations on page`);

          // Extract missing keys from visible text
          const visibleMissing = await page.locator('text=/MISSING_MESSAGE/').allTextContents();
          visibleMissing.forEach(t => {
            const match = t.match(/MISSING_MESSAGE:\s*([^\s(]+)/);
            if (match) missingTranslations.add(match[1]);
          });
        }

        // Check for JavaScript errors in the page
        const jsErrors = await page.evaluate(() => {
          return window.__NEXT_DATA__?.err || null;
        });
        if (jsErrors) {
          errors.push(`[${gamePage.name}] JS Error: ${JSON.stringify(jsErrors)}`);
        }

        // Check for visible error messages
        const errorElements = await page.locator('.error, [role="alert"], .text-destructive').allTextContents();
        if (errorElements.length > 0 && errorElements.some(e => e.trim())) {
          const errorMsg = errorElements.filter(e => e.trim()).join(', ');
          if (errorMsg) {
            warnings.push(`[${gamePage.name}] Error displayed: ${errorMsg}`);
            console.log(`   ⚠ Error on page: ${errorMsg}`);
          }
        }

        // Check UI elements
        const hasMainContent = await page.locator('main, [role="main"], .main-content').count();
        const hasNavigation = await page.locator('nav, .navigation, .sidebar').count();

        if (hasMainContent === 0) {
          uiIssues.push(`[${gamePage.name}] No main content area found`);
        }

        console.log(`   ✓ ${gamePage.name} loaded`);

        // Special checks for Overview page (3D interface)
        if (gamePage.name === 'Overview') {
          const has3DToggle = await page.locator('button:has-text("3D"), button:has-text("2D")').count();
          const hasCanvas = await page.locator('canvas').count();

          if (has3DToggle > 0) {
            console.log('   ✓ 3D toggle button found');

            // Try clicking 3D toggle
            try {
              await page.locator('button:has-text("3D")').first().click();
              await page.waitForTimeout(2000);
              await screenshot('overview-3d');
              console.log('   ✓ 3D view activated');
            } catch (e) {
              console.log('   ℹ Could not toggle 3D view');
            }
          }

          if (hasCanvas > 0) {
            console.log(`   ✓ Found ${hasCanvas} canvas element(s) - 3D rendering active`);
          }
        }

      } catch (err) {
        errors.push(`[${gamePage.name}] Failed to load: ${err.message}`);
        console.log(`   ✗ Failed: ${err.message}`);
      }
    }

  } catch (error) {
    errors.push(`[Fatal] ${error.message}`);
    console.error('Fatal error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n\n⏳ Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }

  // =====================
  // Summary
  // =====================
  console.log('\n\n========================================');
  console.log('           TEST SUMMARY');
  console.log('========================================\n');

  if (errors.length === 0) {
    console.log('✅ No critical errors detected!\n');
  } else {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }

  if (missingTranslations.size > 0) {
    console.log(`\n🌐 Missing ${missingTranslations.size} translation key(s):`);
    [...missingTranslations].forEach(key => {
      console.log(`   - ${key}`);
    });
  }

  if (uiIssues.length > 0) {
    console.log(`\n🎨 UI Issues (${uiIssues.length}):`);
    uiIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  console.log(`\n📸 ${screenshotIndex - 1} screenshots saved to: ${SCREENSHOTS_DIR}/`);
  console.log('========================================\n');

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    errors,
    missingTranslations: [...missingTranslations],
    uiIssues,
    warnings,
    screenshotCount: screenshotIndex - 1,
  };
  fs.writeFileSync(`${SCREENSHOTS_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log('📋 Detailed report saved to: tests/screenshots/authenticated/report.json');
}

runTests().catch(console.error);
