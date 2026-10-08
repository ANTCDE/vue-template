import type { DmsFile } from '@antcde/connect-ts'
import { useApi } from '@antcde/vue-utils'
import { useDebounceFn } from '@vueuse/core'
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/** The project's DMS root: list, upload, preview. See docs/capabilities/files-dms.md. */
export function useProjectFiles() {
  const { comms: { connect, context, signal, notifications }, i18n: { t } } = injectContext()
  const { licenseId, projectId, projectReadOnly, permissions } = useGlobalStore()

  const listApi = useApi(connect.dms.getProjectFiles, null)
  const urlsApi = useApi(connect.dms.getUploadUrls, null)
  const finishApi = useApi(connect.dms.uploadFilesFinish, [])

  const files = shallowRef<DmsFile[]>([])
  const uploading = ref(false)

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

  /**
   * Files can't cross the iframe boundary (arguments are cloned as JSON), so uploads go
   * straight to storage: ask for presigned URLs, PUT the bytes, then tell DMS they arrived.
   */
  async function upload(selected: File[]) {
    if (!projectId.value || selected.length === 0)
      return
    uploading.value = true
    try {
      const urls = await urlsApi.execute(projectId.value, selected.map(file => file.name))
      if (!urls)
        return
      await Promise.all(urls.data.map(async (target) => {
        const file = selected.find(candidate => candidate.name === target.filename)
        if (!file)
          return
        // Forward exactly the headers the URL was signed with (SigV4 signs only `host`), minus Host,
        // which the browser sets. Add none of your own: unsigned x-amz-* headers get a 403.
        const headers = Object.fromEntries(Object.entries(target.config.headers)
          .filter(([name]) => name.toLowerCase() !== 'host')
          .map(([name, values]) => [name, values.join(',')]))
        const response = await fetch(target.config.url, { method: 'PUT', headers, body: file })
        if (!response.ok)
          throw new Error(`Upload of ${file.name} failed (${response.status})`)
      }))
      // `null` folder token = project root. 'keep_both' renames instead of overwriting.
      await finishApi.execute(null, projectId.value, urls.data.map(({ key, filename }) => ({ key, filename })), 'keep_both')
      if (!finishApi.error.value)
        notifications.success(t('examples.files.uploaded', { count: selected.length }))
    }
    catch (error) {
      // The storage PUT is not an ANT API call, so the OS shows no toast for it — we must.
      // A TypeError means the PUT never got a response: the S3 bucket's CORS doesn't allow this
      // app's origin (a local dev server or a self-hosted app). See
      // docs/capabilities/files-dms.md#uploading-from-your-own-origin.
      notifications.error(t(error instanceof TypeError ? 'examples.files.storageBlocked' : 'examples.files.uploadFailed', { origin: window.location.origin }))
    }
    finally {
      uploading.value = false
      await load()
    }
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
    canUpload,
    upload,
    preview,
  }
}
