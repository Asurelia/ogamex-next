import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTimeZone } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OGameX - Space Strategy Game',
  description: 'A space strategy browser game inspired by OGame',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#0ea5e9',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const timeZone = await getTimeZone()

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} bg-ogame-bg text-ogame-text min-h-screen`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
