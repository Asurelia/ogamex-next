'use client'

import { useEffect, useState } from 'react'

interface Star {
  id: number
  left: number
  top: number
  delay: number
  size: number
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3,
    size: Math.random() * 2 + 1,
  }))
}

export function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(generateStars(100))
  }, [])

  if (stars.length === 0) {
    return null
  }

  return (
    <>
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
    </>
  )
}
