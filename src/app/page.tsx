'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Generate random stars for background
function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3,
    size: Math.random() * 2 + 1,
  }))
}

export default function HomePage() {
  const [stars, setStars] = useState<ReturnType<typeof generateStars>>([])

  useEffect(() => {
    setStars(generateStars(100))
  }, [])

  return (
    <div className="min-h-screen space-background relative overflow-hidden">
      {/* Animated stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-ogame-accent to-yellow-400">
            OGameX
          </h1>
          <p className="text-center text-ogame-text-header mt-2">
            Conquer the Universe
          </p>
        </div>

        {/* Main panel */}
        <div className="ogame-panel w-full max-w-md">
          <div className="ogame-panel-header text-center">
            Welcome Commander
          </div>
          <div className="ogame-panel-content space-y-6">
            <p className="text-ogame-text-muted text-center">
              Build your empire, research technologies, command your fleet,
              and dominate the galaxy in this strategic space game.
            </p>

            <div className="space-y-3">
              <Link href="/login" className="ogame-button-primary w-full block text-center">
                Login
              </Link>
              <Link href="/register" className="ogame-button w-full block text-center">
                Create Account
              </Link>
            </div>

            <div className="border-t border-ogame-border pt-4">
              <h3 className="text-ogame-text-header text-sm mb-3">Features:</h3>
              <ul className="text-ogame-text-muted text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  Build and upgrade resource mines
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  Research powerful technologies
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  Build massive fleets of starships
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  Explore and colonize new planets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  Battle other players for resources
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-ogame-text-muted text-sm">
          <p>Inspired by OGame • Built with Next.js & Supabase</p>
        </div>
      </div>
    </div>
  )
}
