/**
 * i18n setup using vue-i18n.
 *
 * Translation files in src/lang/translations/*.json are auto-discovered
 * by VueI18nPlugin (configured in the Vite factory). The `messages` import
 * contains all locale files pre-compiled at build time.
 *
 * The locale is automatically synced with the user's ANT-OS language
 * preference via `useAntI18n(comms)` in context.ts.
 */
import messages from '@intlify/unplugin-vue-i18n/messages'
import { createI18n } from 'vue-i18n'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  warnHtmlMessage: false,
  fallbackWarn: false,
  messages,
})
