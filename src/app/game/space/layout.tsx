/**
 * Space Game Layout
 *
 * Minimal wrapper for the real-time game page.
 */

export default function SpaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {children}
    </div>
  )
}
