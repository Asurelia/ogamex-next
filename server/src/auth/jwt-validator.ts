/**
 * JWT Validator for Supabase Authentication
 *
 * Validates Supabase JWTs on Colyseus room join to authenticate players.
 */

import jwt from 'jsonwebtoken'
import { CONFIG } from '../config'

export interface DecodedToken {
  sub: string       // user_id
  email?: string
  role: string
  aud: string
  iat: number
  exp: number
}

/**
 * Validate a Supabase JWT and extract user info.
 * Throws on invalid/expired tokens.
 */
export function validateSupabaseJWT(token: string): DecodedToken {
  if (!token) {
    throw new Error('No token provided')
  }

  // Remove "Bearer " prefix if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token

  // Dev mode: if no JWT secret configured, decode without verification
  if (!CONFIG.SUPABASE_JWT_SECRET && CONFIG.NODE_ENV === 'development') {
    const decoded = jwt.decode(cleanToken) as DecodedToken | null
    if (decoded?.sub) return decoded
    // Allow raw userId as token in dev mode
    return { sub: cleanToken, role: 'authenticated', aud: 'authenticated', iat: 0, exp: 0 }
  }

  try {
    const decoded = jwt.verify(cleanToken, CONFIG.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as DecodedToken

    if (!decoded.sub) {
      throw new Error('Token missing user ID (sub)')
    }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract user_id from a Supabase JWT without full verification.
 * Used for non-critical operations where speed matters.
 */
export function extractUserId(token: string): string | null {
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token
    const decoded = jwt.decode(cleanToken) as DecodedToken | null
    return decoded?.sub ?? null
  } catch {
    return null
  }
}
