'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        setError('Username is already taken')
        setLoading(false)
        return
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // User profile and initial planet will be created by database trigger
        router.push('/game/overview')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen space-background flex items-center justify-center px-4">
      <div className="ogame-panel w-full max-w-md">
        <div className="ogame-panel-header">
          {t('registerTitle')}
        </div>
        <div className="ogame-panel-content">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-sm text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-ogame-text-header text-sm mb-1">
                {t('commanderName')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ogame-input w-full"
                placeholder={t('commanderNamePlaceholder')}
                required
                disabled={loading}
                minLength={3}
                maxLength={20}
              />
              <p className="text-ogame-text-muted text-xs mt-1">
                {t('usernameRequirements')}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-ogame-text-header text-sm mb-1">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ogame-input w-full"
                placeholder="commander@galaxy.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-ogame-text-header text-sm mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ogame-input w-full"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-ogame-text-header text-sm mb-1">
                {t('confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="ogame-input w-full"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="ogame-button-primary w-full"
              disabled={loading}
            >
              {loading ? t('creatingEmpire') : t('startJourney')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ogame-text-muted text-sm">
              {t('hasAccount')}{' '}
              <Link href="/login" className="ogame-link">
                {t('loginHere')}
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-ogame-text-muted text-sm hover:text-ogame-accent">
              ← {tCommon('back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
