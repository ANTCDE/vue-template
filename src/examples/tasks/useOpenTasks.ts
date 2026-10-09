import type { Task, TaskStatus } from '@antcde/connect-ts'
import { buildTaskQuery } from '@antcde/connect-ts'
import { useApi } from '@antcde/vue-utils'
import { useDebounceFn } from '@vueuse/core'
import { onScopeDispose, shallowRef, watch } from 'vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/** Open tasks in the current project (or license). See docs/capabilities/tasks-and-workflows.md. */
export function useOpenTasks() {
  const { comms: { connect, signal } } = injectContext()
  const { licenseId, projectId } = useGlobalStore()

  const listApi = useApi(connect.tasks.getV2Tasks<Task>, null)
  const tasks = shallowRef<Task[]>([])

  async function load() {
    if (!licenseId.value)
      return
    // Tasks are always queried through the license; the project is just a filter.
    const query = buildTaskQuery({
      filters: {
        status: { $eq: 'open' },
        ...(projectId.value ? { project: { $eq: projectId.value } } : {}),
      },
      // canUpdate: whether this user may change the task, so the UI can disable what would fail.
      include: 'taskProject,assignedTo,canUpdate',
      per_page: 10,
      page: 1,
    })
    const result = await listApi.execute(licenseId.value, query)
    tasks.value = result?.data ?? []
  }

  /**
   * importTask is an upsert: send `id` to update. Afterwards broadcast the change so the
   * notepad and other open apps merge it without refetching.
   */
  async function setStatus(task: Task, status: TaskStatus) {
    // A fresh useApi per save keeps overlapping saves from sharing one error state.
    const saveApi = useApi(connect.tasks.importTask, null)
    const saved = await saveApi.execute({ id: task.id, status })
    if (saveApi.error.value || !saved)
      return
    signal({ task: { id: task.id, action: 'updated', data: saved } })
    await load()
  }

  // Live updates: one subscription for every task the user can see, not one per task.
  // Bursts of events are debounced into a single refetch.
  const refresh = useDebounceFn(load, 300)
  const stop = signal.with('userProjectTask').receive(() => void refresh())
  onScopeDispose(() => stop())

  watch([licenseId, projectId], () => void load(), { immediate: true })

  return { tasks, isLoading: listApi.isLoading, setStatus, reload: load }
}
