import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use untyped client for API routes to avoid type conflicts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/v1/auth
 * Authenticate and get an API token for AI agents
 *
 * Body: { email: string, password: string }
 * Returns: { token: string, user: User }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // Generate API token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

    // Store token
    await supabase.from('api_tokens').insert({
      user_id: authData.user.id,
      token,
      name: 'API Access',
      expires_at: expiresAt.toISOString(),
    })

    return NextResponse.json({
      token,
      expires_at: expiresAt.toISOString(),
      user: {
        id: user?.id,
        username: user?.username,
        dark_matter: user?.dark_matter,
        character_class: user?.character_class,
      },
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
