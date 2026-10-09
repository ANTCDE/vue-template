import type { TriggerableType } from '@antcde/connect-ts'
import { usePermissions } from '@antcde/vue-utils'
import { createGlobalState } from '@vueuse/core'
import { computed } from 'vue'
import { injectContext } from '@/plugins/context'

/**
 * Read-only state derived from the host context. The OS owns license/project/task —
 * read them here, never fetch them. See docs/concepts.md.
 */
export const useGlobalStore = createGlobalState(() => {
  const { comms: { context } } = injectContext()

  const userId = computed(() => context.value.user?.id ?? null)
  const licenseId = computed(() => context.value.license?.id ?? null)
  const projectId = computed(() => context.value.project?.id ?? null)

  // Archived projects stay selectable but the API refuses writes — disable write UI up front.
  const projectReadOnly = computed(() => context.value.projectReadOnly === true)

  // Most resources live at either level; a selected project wins over the license.
  const scope = computed<{ type: TriggerableType, id: string } | null>(() => {
    if (projectId.value)
      return { type: 'projects', id: projectId.value }
    if (licenseId.value)
      return { type: 'licenses', id: licenseId.value }
    return null
  })

  const permissions = usePermissions(context)

  return { userId, licenseId, projectId, projectReadOnly, scope, permissions }
})
