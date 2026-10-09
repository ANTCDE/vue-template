import type { TablePermissions } from '@antcde/connect-ts'
import { useApi } from '@antcde/vue-utils'
import { computed, ref, shallowRef, watch } from 'vue'
import { manifest } from '@/manifest'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/** Declared in app-config.json — created when the app is activated in a project. */
export const NOTES_TABLE = 'TEMPLATE_NOTES'
const PAGE_SIZE = 10

export interface Note {
  id: string
  title: string
  body: string | null
  status: 'open' | 'done' | null
  due: string | null
}

/**
 * - `missing`: the project has no such table. The app was never activated here, which is
 *   always the case when running from /developer/<port>.
 */
export type NotesTableState = 'loading' | 'missing' | 'ready'

/** Dynamic-table CRUD for TEMPLATE_NOTES. See docs/capabilities/tables.md. */
export function useNotes() {
  const { comms: { connect, notifications }, i18n: { t } } = injectContext()
  const { projectId, projectReadOnly, permissions } = useGlobalStore()

  // One useApi per verb, so their loading/error state never mixes.
  const lookupApi = useApi(connect.tables.getTables, [])
  const queryApi = useApi(connect.tables.queryTables<Note>, null)
  const createApi = useApi(connect.records.createRecord, null)
  const deleteApi = useApi(connect.records.deleteRecord, null)
  const createTableApi = useApi(connect.tables.createTable, null)

  const state = ref<NotesTableState>('loading')
  const notes = shallowRef<Note[]>([])
  const total = ref(0)
  const page = ref(1)
  // Writes need the table id; the name only works for queries.
  const tableId = ref<string | null>(null)
  const tablePermissions = ref<TablePermissions | null>(null)

  // Project admins can write regardless of table grants; archived projects can't be written at all.
  const canCreate = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || !!tablePermissions.value?.['tables.create']))
  const canDelete = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || !!tablePermissions.value?.['tables.delete']))
  const canCreateTable = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || permissions.hasProjectPermission('tables.configure')))

  // Look the table up by name first. Querying a table that doesn't exist is an API error (and an
  // OS error toast); a missing table is an expected state, so check for it explicitly.
  async function resolveTable(project: string) {
    const tables = await lookupApi.execute(project)
    if (lookupApi.error.value)
      return
    tableId.value = tables.find(table => table.name === NOTES_TABLE)?.id ?? null
    state.value = tableId.value ? 'ready' : 'missing'
  }

  async function load() {
    if (!projectId.value)
      return
    if (!tableId.value)
      await resolveTable(projectId.value)
    if (!tableId.value)
      return
    const result = await queryApi.execute({
      tables: [{
        id: tableId.value,
        as: 'notes', // the response is keyed by this alias
        columns: ['title', 'body', 'status', 'due'],
        sortBy: 'title',
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
      }],
    })
    // useApi does not throw: a failed call resolves to `null`, and the OS already showed a toast.
    const notesTable = result?.notes
    if (!notesTable)
      return
    tablePermissions.value = notesTable.permissions
    notes.value = notesTable.records ?? []
    total.value = notesTable.stats.count
  }

  /**
   * Local development only: create the table from its app-config.json declaration. In production,
   * activation creates it — and adopts a table with the same name, so this one is taken over then.
   */
  async function createTableForDevelopment() {
    const declaration = manifest.tables?.find(table => table.name === NOTES_TABLE)
    if (!projectId.value || !declaration)
      return
    await createTableApi.execute({
      name: declaration.name,
      project: projectId.value,
      columns: declaration.columns.map(column => ({ name: column.name, type: column.type, options: column.options_value })),
    })
    if (createTableApi.error.value)
      return
    notifications.success(t('examples.tables.tableCreated'))
    await load()
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

  // Apps are not reloaded when the user switches project: drop the cached table id and refetch,
  // or writes would land in the previous project's table.
  watch(projectId, () => {
    page.value = 1
    tableId.value = null
    tablePermissions.value = null
    notes.value = []
    total.value = 0
    state.value = 'loading'
    void load()
  }, { immediate: true })
  watch(page, () => void load())

  return {
    state,
    notes,
    total,
    page,
    pageCount: computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE))),
    isLoading: computed(() => lookupApi.isLoading.value || queryApi.isLoading.value),
    creatingTable: createTableApi.isLoading,
    canCreate,
    canDelete,
    canCreateTable,
    create,
    remove,
    createTableForDevelopment,
  }
}
