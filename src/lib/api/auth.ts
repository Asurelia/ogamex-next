import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use untyped client for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface AuthenticatedUser {
  id: string
  username: string
}

/**
 * Hash a token using SHA-256
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate API token and return authenticated user
 */
export async function validateApiToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const tokenHash = await hashToken(token)

  // Check hashed token in database
  const { data: tokenData } = await supabase
    .from('api_tokens')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenData) {
    return null
  }

  // Check expiry
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return null
  }

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', tokenData.user_id)
    .single()

  if (!user) {
    return null
  }

  // Update last_used
  await supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  return user
}

/**
 * Middleware wrapper for authenticated API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await validateApiToken(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide a valid Bearer token.' },
        { status: 401 }
      )
    }

    return handler(request, user)
  }
}

/**
 * Get Supabase client for API routes
 */
export function getApiSupabase() {
  return supabase
}

// ============================================================================
// SERVICE/CRON AUTHORIZATION
// ============================================================================

/**
 * Get Supabase client with service role key (admin privileges)
 * Used for cron jobs and internal services
 */
export function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for service client')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * Validate that a request is authorized to run service/cron operations
 * Supports multiple authorization methods:
 * - Cron secret header (x-cron-secret)
 * - Vercel Cron header (x-vercel-cron)
 * - Bearer token matching CRON_SECRET
 * - Development mode with x-dev-mode header
 */
export function isServiceAuthorized(request: NextRequest): boolean {
  // Method 1: Cron secret header (for scheduled jobs)
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return true
  }

  // Method 2: Vercel Cron header (automatic for Vercel cron jobs)
  const vercelCron = request.headers.get('x-vercel-cron')
  if (vercelCron) {
    return true
  }

  // Method 3: Service API key (for internal services)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === process.env.CRON_SECRET) {
      return true
    }
  }

  // Method 4: Webhook secret (for external webhooks)
  const webhookSecret = request.headers.get('x-webhook-secret')
  if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) {
    return true
  }

  // In development, allow without auth for testing
  if (process.env.NODE_ENV === 'development') {
    const allowDevProcessing = request.headers.get('x-dev-mode') === 'true'
    if (allowDevProcessing) {
      return true
    }
  }

  return false
}

/**
 * Middleware wrapper for service/cron routes
 */
export function withServiceAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    if (!isServiceAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Service authentication required.' },
        { status: 401 }
      )
    }
    return handler(request)
  }
}
