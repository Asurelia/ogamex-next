/**
 * SpaceLayout.tsx
 * 
 * The main layout for the game interface (EVE Style).
 * - Layer 0 (Bottom): SceneContainer (3D Space, clickable objects)
 * - Layer 1 (Top): HUD and Windows (UI Overlay)
 * 
 * Uses 'pointer-events-none' on the UI container to let clicks pass through to the 3D scene,
 * while re-enabling 'pointer-events-auto' on interactive UI elements.
 */

'use client'

import React from 'react'
import SceneContainer from '@/components/game/3d/SceneContainer'

interface SpaceLayoutProps {
    children: React.ReactNode // The UI content (windows, HUDs)
    sceneContent?: React.ReactNode // Content to render inside the 3D scene
}

export default function SpaceLayout({ children, sceneContent }: SpaceLayoutProps) {
    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black text-gray-100 font-sans selection:bg-cyan-500/30">

            {/* 3D Background Layer */}
            <SceneContainer>
                {sceneContent}
            </SceneContainer>

            {/* UI Overlay Layer */}
            {/* pointer-events-none ensures clicks on empty space go to the 3D scene */}
            <div className="relative z-10 h-full w-full pointer-events-none flex flex-col justify-between p-4">

                {/* Top Bar (Menu, Status) */}
                <header className="pointer-events-auto flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold tracking-wider text-cyan-400">OGameX</h1>
                        <span className="text-xs text-gray-400">System: Sol</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-mono">
                        <div className="text-green-400">$$ 1,245,000</div>
                        <div className="text-cyan-300">⚛ 540</div>
                    </div>
                </header>

                {/* Main Content Area (Where floating windows live) */}
                {/* Children (pages) should handle their own pointer-events-auto on windows */}
                <main className="flex-1 relative">
                    {children}
                </main>

                {/* Bottom HUD (Ship controls, modules) */}
                <footer className="pointer-events-auto flex justify-center pb-4">
                    <div className="bg-black/60 backdrop-blur-lg border border-white/10 rounded-full px-8 py-4 flex gap-6 shadow-lg shadow-cyan-900/20">
                        {/* EVE-style HUD placeholders */}
                        <div className="h-16 w-16 rounded-full border-2 border-cyan-500/50 relative group cursor-pointer hover:border-cyan-400 transition-colors">
                            <div className="absolute inset-2 rounded-full bg-cyan-900/40 group-hover:bg-cyan-800/60 transition-colors" />
                            <div className="absolute -bottom-6 w-full text-center text-[10px] text-cyan-300">CAPACITOR</div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <button className="h-12 w-12 bg-gray-800/60 rounded border border-gray-600 hover:bg-gray-700 hover:border-gray-400 transition-all text-xs">F1</button>
                            <button className="h-12 w-12 bg-gray-800/60 rounded border border-gray-600 hover:bg-gray-700 hover:border-gray-400 transition-all text-xs">F2</button>
                            <button className="h-12 w-12 bg-gray-800/60 rounded border border-gray-600 hover:bg-gray-700 hover:border-gray-400 transition-all text-xs">F3</button>
                        </div>
                    </div>
                </footer>

            </div>
        </div>
    )
}
