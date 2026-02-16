/**
 * Admin Fleet Management E2E Tests
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// These tests require admin authentication
// In a real scenario, you would set up authentication before tests

test.describe('Admin Fleet Management', () => {
  test.skip(true, 'Requires admin authentication setup')

  test.beforeEach(async ({ page }) => {
    // TODO: Add admin authentication
    await page.goto(`${BASE_URL}/admin/fleets`)
    await page.waitForLoadState('networkidle')
  })

  test('should display fleet list', async ({ page }) => {
    // Check for page title
    const title = page.locator('h1:has-text("Fleet Management")')
    await expect(title).toBeVisible()

    // Check for filter controls
    const statusFilter = page.locator('select:has(option:has-text("All"))')
    await expect(statusFilter).toBeVisible()

    const missionFilter = page.locator('select:has(option:has-text("All Types"))')
    await expect(missionFilter).toBeVisible()
  })

  test('should filter fleets by status', async ({ page }) => {
    // Select "In Flight" status
    const statusFilter = page.locator('select').first()
    await statusFilter.selectOption('active')

    await page.waitForLoadState('networkidle')

    // Check that URL params updated
    await expect(page).toHaveURL(/status=active/)
  })

  test('should filter fleets by mission type', async ({ page }) => {
    // Select "Attack" mission type
    const missionFilter = page.locator('select').nth(1)
    await missionFilter.selectOption('attack')

    await page.waitForLoadState('networkidle')

    // Check that URL params updated
    await expect(page).toHaveURL(/mission_type=attack/)
  })

  test('should open delete confirmation dialog', async ({ page }) => {
    // Find a delete button (if any fleets exist)
    const deleteButton = page.locator('button[title="Delete"]').first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Check for confirmation dialog
      const dialog = page.locator('text=Cancel Fleet Mission')
      await expect(dialog).toBeVisible()

      // Check for reason input
      const reasonInput = page.locator('textarea[placeholder*="reason"]')
      await expect(reasonInput).toBeVisible()

      // Close dialog
      const cancelButton = page.locator('button:has-text("Cancel")')
      await cancelButton.click()

      // Dialog should be closed
      await expect(dialog).not.toBeVisible()
    }
  })

  test('should select multiple fleets for bulk action', async ({ page }) => {
    // Find checkboxes
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()

    if (count > 1) {
      // Select first two (skip header checkbox)
      await checkboxes.nth(1).check()
      await checkboxes.nth(2).check()

      // Check for bulk action button
      const bulkButton = page.locator('button:has-text("Cancel") button:has-text("Fleet")')
      await expect(bulkButton).toBeVisible()
    }
  })

  test('should validate reason before delete', async ({ page }) => {
    const deleteButton = page.locator('button[title="Delete"]').first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Try to confirm without reason
      const confirmButton = page.locator('button:has-text("Cancel Mission")')

      // Button should be disabled without reason
      await expect(confirmButton).toBeDisabled()

      // Enter short reason (less than 3 chars)
      const reasonInput = page.locator('textarea')
      await reasonInput.fill('ab')

      // Button should still be disabled
      await expect(confirmButton).toBeDisabled()

      // Enter valid reason
      await reasonInput.fill('Test deletion reason')

      // Button should now be enabled
      await expect(confirmButton).toBeEnabled()
    }
  })
})

test.describe('Admin Fleet API Validation', () => {
  test('should reject invalid fleet filter params', async ({ request }) => {
    // Test with invalid status
    const response = await request.get(`${BASE_URL}/api/admin/fleets?status=invalid`)

    // Should return 400 for validation error
    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Validation')
  })

  test('should reject delete without reason', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/admin/fleets`, {
      data: {
        ids: ['00000000-0000-0000-0000-000000000000'],
        // Missing reason
      }
    })

    // Should return 400 for validation error
    expect(response.status()).toBe(400)
  })

  test('should reject delete with short reason', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/admin/fleets`, {
      data: {
        ids: ['00000000-0000-0000-0000-000000000000'],
        reason: 'ab' // Too short
      }
    })

    // Should return 400 for validation error
    expect(response.status()).toBe(400)
  })

  test('should reject unauthorized access', async ({ request }) => {
    // Without auth, should return 401
    const response = await request.get(`${BASE_URL}/api/admin/fleets`)

    // Either 401 (unauthorized) or 403 (forbidden)
    expect([401, 403]).toContain(response.status())
  })
})
