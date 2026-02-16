import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { StarsBackground } from '@/components/home/StarsBackground'

export default async function HomePage() {
  const t = await getTranslations('home')
  const tAuth = await getTranslations('auth')

  return (
    <div className="min-h-screen space-background relative overflow-hidden">
      {/* Client-side animated stars */}
      <StarsBackground />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-ogame-accent to-yellow-400">
            OGameX
          </h1>
          <p className="text-center text-ogame-text-header mt-2">
            {t('tagline')}
          </p>
        </div>

        {/* Main panel */}
        <div className="ogame-panel w-full max-w-md">
          <div className="ogame-panel-header text-center">
            {t('welcome')}
          </div>
          <div className="ogame-panel-content space-y-6">
            <p className="text-ogame-text-muted text-center">
              {t('description')}
            </p>

            <div className="space-y-3">
              <Link href="/login" className="ogame-button-primary w-full block text-center">
                {tAuth('login')}
              </Link>
              <Link href="/register" className="ogame-button w-full block text-center">
                {t('createAccount')}
              </Link>
            </div>

            <div className="border-t border-ogame-border pt-4">
              <h3 className="text-ogame-text-header text-sm mb-3">{t('features')}:</h3>
              <ul className="text-ogame-text-muted text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  {t('feature1')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  {t('feature2')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  {t('feature3')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  {t('feature4')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ogame-accent">▸</span>
                  {t('feature5')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-ogame-text-muted text-sm">
          <p>{t('footer')}</p>
        </div>
      </div>
    </div>
  )
}
