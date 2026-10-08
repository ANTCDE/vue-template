import type { DmsFile, DmsUploadHandle } from '@antcde/connect-ts'
import { useApi } from '@antcde/vue-utils'
import { useDebounceFn } from '@vueuse/core'
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/** The project's DMS root: list, upload, preview. See docs/capabilities/files-dms.md. */
export function useProjectFiles() {
  const { comms, i18n: { t } } = injectContext()
  const { connect, context, signal, notifications } = comms
  const { licenseId, projectId, projectReadOnly, permissions } = useGlobalStore()

  const listApi = useApi(connect.dms.getProjectFiles, null)

  const files = shallowRef<DmsFile[]>([])
  const uploading = ref(false)
  const progress = ref(0)
  // 'host': the OS did the transfer. 'local': an older OS without it, so this frame did.
  const lastMode = ref<'host' | 'local' | null>(null)
  let current: DmsUploadHandle | null = null

  // The OS label bar filters every app that opts in. Only apply it when the user
  // chose to filter files.
  const labelFilter = computed(() => {
    const selected = context.value.selectedLabels
    if (!selected?.labels.length || !selected.resources.includes('dms_files'))
      return {}
    return { label_ids: selected.labels, label_operator: selected.operator }
  })

  // Root upload right: project or license admin (isProjectAdmin covers both), or a `dms.upload`
  // grant. `user_permissions` alone is not enough: it holds role grants only, not admin rights.
  // Inside a folder, use that folder's own `permissions` instead.
  const canUpload = computed(() => !projectReadOnly.value
    && (permissions.isProjectAdmin.value || !!context.value.project?.user_permissions?.['dms.upload']))

  async function load() {
    if (!projectId.value)
      return
    const result = await listApi.execute(projectId.value, { per_page: 25, sort_by: 'updated_at', sort_dir: 'desc', ...labelFilter.value })
    files.value = (result?.data ?? []).filter(file => !file.is_folder)
  }

  // The OS performs the transfer (upload URLs → PUT → finish) from its own origin, so this works
  // from /developer/<port> and self-hosted apps too. See docs/capabilities/files-dms.md.
  async function upload(selected: File[]) {
    if (!projectId.value || selected.length === 0)
      return
    uploading.value = true
    progress.value = 0
    const total = selected.reduce((sum, file) => sum + file.size, 0)
    const loaded = new Map<number, number>()
    try {
      current = comms.uploadDmsFiles(selected, {
        scope: 'project',
        folderToken: null, // project root
        duplicateAction: 'keep_both', // rename instead of overwriting
        onProgress: (event) => {
          loaded.set(event.index, event.loaded)
          progress.value = total ? Math.round([...loaded.values()].reduce((a, b) => a + b, 0) / total * 100) : 100
        },
      })
      lastMode.value = await current.mode
      // One result per file: a failed file doesn't fail the batch.
      const results = await current.done
      const done = results.filter(result => result.status === 'done')
      const failed = results.filter(result => result.status === 'error')
      if (done.length)
        notifications.success(t('examples.files.uploaded', { count: done.length }))
      if (failed.length)
        notifications.error(t('examples.files.uploadFailedSome', { names: failed.map(result => result.filename).join(', ') }))
    }
    catch {
      // Nothing could start: no project in context, or the project is archived.
      notifications.error(t('examples.files.uploadFailed'))
    }
    finally {
      current = null
      uploading.value = false
      await load()
    }
  }

  function cancelUpload() {
    current?.cancel()
  }

  // Never download and render files yourself: hand the token to the OS preview window.
  function preview(file: DmsFile) {
    signal({
      openFilePreview: {
        fileToken: file.token,
        fileName: file.extension ? `${file.name}.${file.extension}` : file.name,
        fileExtension: file.extension ?? undefined,
        fileSize: file.size ?? undefined,
        projectId: file.project_id ?? undefined,
        licenseId: licenseId.value ?? undefined,
      },
    })
  }

  // Other users' uploads, renames and deletes arrive as dmsFile signals.
  // The OS pushes these to every app without a subscription. Debounced: one bulk action
  // can produce many events.
  const refresh = useDebounceFn(load, 300)
  const stop = signal.receive((s) => {
    if (s.dmsFile || s.dmsFileBatch)
      void refresh()
  })
  onScopeDispose(() => stop())

  // Compare the filter by value: the computed returns a new object on every context change.
  const labelFilterKey = computed(() => JSON.stringify(labelFilter.value))
  watch([projectId, labelFilterKey], () => void load(), { immediate: true })

  return {
    files,
    isLoading: listApi.isLoading,
    uploading,
    progress,
    lastMode,
    cancelUpload,
    canUpload,
    upload,
    preview,
  }
}
