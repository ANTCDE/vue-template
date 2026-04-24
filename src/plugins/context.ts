/**
 * App context — the central integration point with ANT-OS.
 *
 * Uses `useSingleton` to create a provide/inject pair that gives every
 * component access to:
 * - `comms` — ANT-OS communication (toolbar, notepad, signals, context, connect API)
 * - `i18n` — internationalization (auto-syncs locale with user's ANT-OS language)
 * - `colorMode` — dark/light mode preference (synced with ANT-OS theme)
 *
 * Usage in components:
 *   const { comms, i18n, colorMode } = injectContext()
 *   const { toolbar, notepad, context, connect, notifications, signal } = comms
 */
import type { UseAntColorModeReturn, UseAntI18nReturn, UseCommsClient } from '@antcde/vue-utils'
import { useAntColorMode, useAntI18n, useCommsClient, useSingleton } from '@antcde/vue-utils'

export interface Context {
  comms: UseCommsClient
  i18n: UseAntI18nReturn
  colorMode: UseAntColorModeReturn
}

export const [provideContext, injectContext] = useSingleton<Context>(
  'appContext',
  () => {
    const comms = useCommsClient()
    const colorMode = useAntColorMode(comms)
    const i18n = useAntI18n(comms)

    return { comms, colorMode, i18n }
  },
  ({ comms }) => comms.unsubscribe(),
)
