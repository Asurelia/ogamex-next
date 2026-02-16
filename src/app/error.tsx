'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md text-center bg-ogame-dark/50 p-8 rounded-lg border border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-4">
          Something went wrong!
        </h2>
        <p className="text-ogame-text-muted mb-6 text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-ogame-text-muted/50 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="ogame-button-primary px-6 py-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
