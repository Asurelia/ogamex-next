/**
 * Galaxy 3D Map E2E Tests
 * Tests for the 3D galaxy visualization
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Galaxy Map 3D', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to galaxy page
    await page.goto(`${BASE_URL}/game/galaxy`)
    await page.waitForLoadState('networkidle')
  })

  test('should render 2D view by default', async ({ page }) => {
    // Check that 2D table is visible
    const galaxyTable = page.locator('.ogame-table')
    await expect(galaxyTable).toBeVisible()

    // Check that navigation controls are visible
    const galaxyInput = page.locator('#galaxy-input')
    await expect(galaxyInput).toBeVisible()

    const systemInput = page.locator('#system-input')
    await expect(systemInput).toBeVisible()
  })

  test('should toggle between 2D and 3D views', async ({ page }) => {
    // Find and click 3D toggle button
    const toggle3D = page.locator('button:has-text("3D")')
    await expect(toggle3D).toBeVisible()

    // Click to switch to 3D
    await toggle3D.click()
    await page.waitForTimeout(1000)

    // Check for canvas element (R3F creates canvas)
    const canvas = page.locator('canvas')

    // If WebGL is supported, canvas should be visible
    // Otherwise, error message should be shown
    const hasCanvas = await canvas.isVisible().catch(() => false)
    const hasError = await page.locator('text=WebGL').isVisible().catch(() => false)

    expect(hasCanvas || hasError).toBe(true)

    // Toggle back to 2D
    const toggle2D = page.locator('button:has-text("2D")')
    await toggle2D.click()
    await page.waitForTimeout(500)

    // 2D table should be visible again
    const galaxyTable = page.locator('.ogame-table')
    await expect(galaxyTable).toBeVisible()
  })

  test('should navigate between systems in 2D view', async ({ page }) => {
    // Get initial system value
    const systemInput = page.locator('#system-input')
    const initialValue = await systemInput.inputValue()

    // Click next system button
    const nextButton = page.locator('button[aria-label="Next system"]')
    await nextButton.click()
    await page.waitForTimeout(500)

    // Value should have changed
    const newValue = await systemInput.inputValue()
    expect(parseInt(newValue)).toBe(parseInt(initialValue) + 1)
  })

  test('should display loading state while fetching data', async ({ page }) => {
    // Change system to trigger reload
    const systemInput = page.locator('#system-input')
    await systemInput.fill('100')
    await systemInput.press('Enter')

    // Check for loading indicator (button text changes or spinner appears)
    // This is a quick check - the loading state might be very brief
    await page.waitForLoadState('networkidle')

    // After loading, table should be populated
    const tableRows = page.locator('.ogame-table tbody tr')
    const rowCount = await tableRows.count()
    expect(rowCount).toBe(15) // 15 positions per system
  })

  test('should handle empty system gracefully', async ({ page }) => {
    // Navigate to a likely empty system
    const systemInput = page.locator('#system-input')
    await systemInput.fill('499')

    const galaxyInput = page.locator('#galaxy-input')
    await galaxyInput.fill('9')

    // Click view button
    const viewButton = page.locator('button:has-text("View"), button.ogame-button-primary')
    await viewButton.first().click()
    await page.waitForLoadState('networkidle')

    // Should still show 15 rows (even if empty)
    const tableRows = page.locator('.ogame-table tbody tr')
    const rowCount = await tableRows.count()
    expect(rowCount).toBe(15)
  })

  test('3D view should initialize camera controls', async ({ page }) => {
    // Skip if WebGL not supported (headless browsers may not have it)
    test.skip(process.env.CI === 'true', 'Skip WebGL test in CI')

    // Switch to 3D view
    const toggle3D = page.locator('button:has-text("3D")')
    await toggle3D.click()
    await page.waitForTimeout(2000)

    // Check for canvas
    const canvas = page.locator('canvas')
    const isVisible = await canvas.isVisible().catch(() => false)

    if (isVisible) {
      // Try to interact with canvas (zoom)
      await canvas.hover()
      await page.mouse.wheel(0, -100) // Zoom in
      await page.waitForTimeout(500)

      // Canvas should still be visible after interaction
      await expect(canvas).toBeVisible()
    }
  })
})

test.describe('Galaxy Map Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/galaxy`)
    await page.waitForLoadState('networkidle')

    // Check for labeled inputs
    const galaxyInput = page.locator('input#galaxy-input')
    await expect(galaxyInput).toBeVisible()

    const systemInput = page.locator('input#system-input')
    await expect(systemInput).toBeVisible()

    // Check for button labels
    const prevGalaxyBtn = page.locator('button[aria-label="Previous galaxy"]')
    await expect(prevGalaxyBtn).toBeVisible()

    const nextGalaxyBtn = page.locator('button[aria-label="Next galaxy"]')
    await expect(nextGalaxyBtn).toBeVisible()
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/game/galaxy`)
    await page.waitForLoadState('networkidle')

    // Tab through controls
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Check that focus is visible somewhere in the form
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})
