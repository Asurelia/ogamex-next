/**
 * SceneContainer.tsx
 * 
 * Main entry point for the 3D background scene.
 * Wraps the R3F Canvas and sets up the environment.
 * Designed to sit BEHIND the UI layer.
 */

'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Stars, OrbitControls } from '@react-three/drei'

interface SceneContainerProps {
    children?: React.ReactNode
}

export default function SceneContainer({ children }: SceneContainerProps) {
    return (
        <div className="fixed inset-0 z-0 bg-black">
            <Canvas
                camera={{ position: [0, 5, 10], fov: 60 }}
                dpr={[1, 2]}
                gl={{ antialias: true }}
            >
                <Suspense fallback={null}>
                    {/* Background Environment */}
                    <color attach="background" args={['#050510']} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    {/* Lighting */}
                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#4455ff" />
                    <pointLight position={[-10, -5, -10]} intensity={0.5} color="#ffaa00" />

                    {/* Controls - restricted for background feel */}
                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        enableRotate={true}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                        maxDistance={50}
                        minDistance={5}
                    />

                    {/* Scene Content */}
                    {children}
                </Suspense>
            </Canvas>
        </div>
    )
}
