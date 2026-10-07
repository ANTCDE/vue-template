import type { TablePermissions } from '@antcde/connect-ts'
import { useApi } from '@antcde/vue-utils'
import { computed, ref, shallowRef, watch } from 'vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/** Declared in app-config.json — the table is created when the app is activated in a project. */
export const NOTES_TABLE = 'TEMPLATE_NOTES'
const PAGE_SIZE = 10

export interface Note {
  id: string
  title: string
  body: string | null
  status: 'open' | 'done' | null
  due: string | null
}

/** Dynamic-table CRUD for TEMPLATE_NOTES. See docs/capabilities/tables.md. */
export function useNotes() {
  const { comms: { connect, notifications }, i18n: { t } } = injectContext()
  const { projectId, projectReadOnly, permissions } = useGlobalStore()

  // One useApi per verb, so their loading/error state never mixes.
  const queryApi = useApi(connect.tables.queryTables<Note>, null)
  const createApi = useApi(connect.records.createRecord, null)
  const deleteApi = useApi(connect.records.deleteRecord, null)

  const notes = shallowRef<Note[]>([])
  const total = ref(0)
  const page = ref(1)
  // The table id comes back with every query; writes need it, the name is not enough.
  const tableId = ref<string | null>(null)
  const tablePermissions = ref<TablePermissions | null>(null)

  // Project admins can write regardless of table grants; archived projects can't be written at all.
  const canCreate = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || !!tablePermissions.value?.['tables.create']))
  const canDelete = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || !!tablePermissions.value?.['tables.delete']))

  async function load() {
    if (!projectId.value)
      return
    const result = await queryApi.execute({
      tables: [{
        name: NOTES_TABLE,
        project: projectId.value,
        as: 'notes', // the response is keyed by this alias
        columns: ['title', 'body', 'status', 'due'],
        sortBy: 'title',
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
      }],
    })
    // useApi does not throw: a failed call resolves to the initial value (null). The OS already
    // showed an error toast, so there is nothing to add here.
    const notesTable = result?.notes
    if (!notesTable)
      return
    tableId.value = notesTable.id
    tablePermissions.value = notesTable.permissions
    notes.value = notesTable.records ?? []
    total.value = notesTable.stats.count
  }

  async function create(title: string) {
    if (!tableId.value)
      return
    await createApi.execute(tableId.value, { record: { title, status: 'open' } })
    if (createApi.error.value)
      return
    notifications.success(t('examples.tables.created'))
    await load()
  }

  async function remove(note: Note) {
    if (!tableId.value || !projectId.value)
      return
    await deleteApi.execute({ project: projectId.value, table: tableId.value, records: [note.id] })
    if (!deleteApi.error.value)
      await load()
  }

  // Apps are not reloaded when the user switches project — reset and refetch on every change.
  watch(projectId, () => {
    page.value = 1
    tableId.value = null
    notes.value = []
    void load()
  }, { immediate: true })
  watch(page, () => void load())

  return {
    notes,
    total,
    page,
    pageCount: computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE))),
    isLoading: queryApi.isLoading,
    canCreate,
    canDelete,
    create,
    remove,
    reload: load,
  }
}
