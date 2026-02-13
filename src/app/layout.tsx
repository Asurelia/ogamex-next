import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OGameX - Space Strategy Game',
  description: 'A space strategy browser game inspired by OGame',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-ogame-bg text-ogame-text min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
