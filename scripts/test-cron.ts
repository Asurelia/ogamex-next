/**
 * Test script for cron job endpoints
 *
 * Usage:
 *   npx ts-node scripts/test-cron.ts
 *   # or with bun
 *   bun run scripts/test-cron.ts
 *
 * Environment:
 *   - Requires the dev server to be running on localhost:3000
 *   - Uses x-dev-mode header for local testing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''

interface CronTestResult {
  endpoint: string
  success: boolean
  status: number
  data: unknown
  duration_ms: number
  error?: string
}

async function testEndpoint(
  name: string,
  path: string,
  options: { dryRun?: boolean } = {}
): Promise<CronTestResult> {
  const url = new URL(path, BASE_URL)
  if (options.dryRun) {
    url.searchParams.set('dry_run', 'true')
  }

  const startTime = Date.now()

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET
          ? { 'x-cron-secret': CRON_SECRET }
          : { 'x-dev-mode': 'true' }),
      },
    })

    const data = await response.json()
    const duration = Date.now() - startTime

    return {
      endpoint: name,
      success: response.ok,
      status: response.status,
      data,
      duration_ms: duration,
    }
  } catch (error) {
    return {
      endpoint: name,
      success: false,
      status: 0,
      data: null,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function testGetStatus(name: string, path: string): Promise<CronTestResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET
          ? { 'x-cron-secret': CRON_SECRET }
          : { 'x-dev-mode': 'true' }),
      },
    })

    const data = await response.json()
    const duration = Date.now() - startTime

    return {
      endpoint: name,
      success: response.ok,
      status: response.status,
      data,
      duration_ms: duration,
    }
  } catch (error) {
    return {
      endpoint: name,
      success: false,
      status: 0,
      data: null,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function printResult(result: CronTestResult): void {
  const statusIcon = result.success ? '[OK]' : '[FAIL]'
  const statusColor = result.success ? '\x1b[32m' : '\x1b[31m'
  const resetColor = '\x1b[0m'

  console.log(`\n${statusColor}${statusIcon}${resetColor} ${result.endpoint}`)
  console.log(`   Status: ${result.status}`)
  console.log(`   Duration: ${result.duration_ms}ms`)

  if (result.error) {
    console.log(`   Error: ${result.error}`)
  } else {
    console.log(`   Response:`)
    console.log(`   ${JSON.stringify(result.data, null, 2).replace(/\n/g, '\n   ')}`)
  }
}

async function runTests(): Promise<void> {
  console.log('='.repeat(60))
  console.log('OGameX Cron Job Test Suite')
  console.log('='.repeat(60))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Using auth: ${CRON_SECRET ? 'CRON_SECRET' : 'x-dev-mode'}`)
  console.log('='.repeat(60))

  const results: CronTestResult[] = []

  // Test 1: Resource Production Status
  console.log('\n--- Testing Resource Production ---')
  results.push(await testGetStatus('Resource Production Status', '/api/v1/resources/production'))

  // Test 2: Resource Production Dry Run
  results.push(await testEndpoint('Resource Production (Dry Run)', '/api/v1/resources/production', { dryRun: true }))

  // Test 3: Resource Production Execute
  results.push(await testEndpoint('Resource Production Execute', '/api/v1/resources/production'))

  // Test 4: Mission Processing Status
  console.log('\n--- Testing Mission Processing ---')
  results.push(await testGetStatus('Mission Processing Status', '/api/v1/missions/process'))

  // Test 5: Mission Processing Dry Run
  results.push(await testEndpoint('Mission Processing (Dry Run)', '/api/v1/missions/process', { dryRun: true }))

  // Test 6: Mission Processing Execute
  results.push(await testEndpoint('Mission Processing Execute', '/api/v1/missions/process'))

  // Print all results
  console.log('\n' + '='.repeat(60))
  console.log('Test Results')
  console.log('='.repeat(60))

  results.forEach(printResult)

  // Summary
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0)

  console.log('\n' + '='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Passed: ${passed}/${results.length}`)
  console.log(`Failed: ${failed}/${results.length}`)
  console.log(`Total Duration: ${totalDuration}ms`)

  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
