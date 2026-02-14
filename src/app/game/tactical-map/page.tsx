'use client'

import dynamic from 'next/dynamic'
import { TacticalOverlay } from '@/components/tactical/TacticalOverlay'

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const TacticalMapScene = dynamic(
    () => import('@/components/tactical/TacticalMapScene').then((mod) => mod.TacticalMapScene),
    { ssr: false }
)

export default function TacticalMapPage() {
    return (
        <div className="relative w-full h-[calc(100vh-8rem)] rounded-lg overflow-hidden border border-ogame-border shadow-ogame">
            {/* 3D Scene Layer */}
            <TacticalMapScene />

            {/* UI Overlay Layer */}
            <TacticalOverlay />
        </div>
    )
}
