'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body style={{
        backgroundColor: '#0a0a1a',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.05)',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h1 style={{
            color: '#ff6b6b',
            fontSize: '24px',
            marginBottom: '16px'
          }}>
            Something went wrong!
          </h1>
          <p style={{
            color: '#888',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p style={{
              color: '#666',
              fontSize: '12px',
              marginBottom: '24px',
              fontFamily: 'monospace'
            }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
