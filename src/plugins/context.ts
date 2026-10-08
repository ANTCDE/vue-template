/**
 * App context — the single integration point with ANT-OS. See docs/shell-integration.md.
 *
 * Usage in any component or composable:
 *   const { comms, i18n, colorMode } = injectContext()
 */
import type { UseAntColorModeReturn, UseAntI18nReturn, UseCommsClient } from '@antcde/vue-utils'
import { useAntColorMode, useAntI18n, useCommsClient, useSingleton } from '@antcde/vue-utils'
import { manifest } from '@/manifest'

export interface Context {
  comms: UseCommsClient
  i18n: UseAntI18nReturn
  colorMode: UseAntColorModeReturn
}

// The name 'appContext' is what the test helpers inject under — keep it.
export const [provideContext, injectContext] = useSingleton<Context>(
  'appContext',
  () => {
    // No `connect` argument: every connect.* call is proxied through the OS, which holds the
    // session. The app never sees a token. See docs/calling-the-api.md.
    const comms = useCommsClient(undefined, undefined, manifest)
    const colorMode = useAntColorMode(comms)
    const i18n = useAntI18n(comms)

    return { comms, colorMode, i18n }
  },
  ({ comms }) => comms.unsubscribe(),
)
