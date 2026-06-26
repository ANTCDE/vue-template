import { createGlobalState } from '@vueuse/core'
import { injectContext } from '@/plugins/context'

export const useGlobalStore = createGlobalState(() => {
  const {comms: {context}} = injectContext()

  // Context-derived state (read-only)
  const licenseId = computed(() => context.value.license?.id)
  const projectId = computed(() => context.value.project?.id)

  return {
    licenseId,
    projectId,
  }
})
