import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'

// Pre-import messages to avoid dynamic import issues in production
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'

const messages: Record<Locale, typeof en> = {
  en,
  fr
}

export default getRequestConfig(async () => {
  // Get locale from cookie, fallback to default
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value

  // Validate locale
  const locale: Locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale

  return {
    locale,
    messages: messages[locale]
  }
})
