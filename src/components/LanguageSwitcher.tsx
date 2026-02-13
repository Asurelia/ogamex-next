'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { locales, type Locale } from '@/i18n/config'

const languageNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
}

const languageFlags: Record<Locale, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleChange = (newLocale: Locale) => {
    startTransition(() => {
      // Set cookie and reload
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
      window.location.reload()
    })
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          disabled={isPending || loc === locale}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            loc === locale
              ? 'bg-ogame-accent text-black font-semibold'
              : 'text-ogame-text-muted hover:text-ogame-text hover:bg-ogame-border/50'
          } ${isPending ? 'opacity-50' : ''}`}
          title={languageNames[loc]}
        >
          {languageFlags[loc]}
        </button>
      ))}
    </div>
  )
}
