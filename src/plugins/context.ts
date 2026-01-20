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
