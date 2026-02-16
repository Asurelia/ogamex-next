'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setInfo({
        'User Agent': navigator.userAgent,
        'URL': window.location.href,
        'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
        'Window defined': typeof window !== 'undefined' ? 'Yes' : 'No',
        'Document defined': typeof document !== 'undefined' ? 'Yes' : 'No',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h1>Debug Page</h1>
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <h2>Environment Info:</h2>
      <ul>
        {Object.entries(info).map(([key, value]) => (
          <li key={key}><strong>{key}:</strong> {value}</li>
        ))}
      </ul>
      <h2>Test Results:</h2>
      <p>If you can see this page, basic React is working.</p>
    </div>
  )
}
