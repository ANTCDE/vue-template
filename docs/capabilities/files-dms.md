# Files (DMS)

> **TL;DR** Files and folders live in the document management system (DMS), in a project or at license level.
> Every item is addressed by its **token**. Upload with presigned URLs, and preview by handing the token to the
> OS with the `openFilePreview` signal. Never stream file bytes through `connect`.
> **Use when** your app shows, uploads, attaches or organises documents, photos or drawings.

## Concepts

- **`DmsFile`** describes both files and folders.
  - Folders have `is_folder: true`.
  - External links (SharePoint and similar) have `source_type !== 'ant'` and a `source_url`.
  - Each item carries `token`, `name`, `extension`, `size`, `owner`, `labels` and `permissions`.
- **Two scopes, twin methods.** Every project method has a license counterpart with `License` in its name:
  - `getProjectFiles` ↔ `getLicenseFiles`
  - `getUploadUrls` ↔ `getLicenseUploadUrls`
  - `uploadFilesFinish` ↔ `uploadLicenseFilesFinish`
  - …and so on for the rest.

  Choose the pair once, based on whether a project is selected.
- **Permissions.**
  - Every file has `permissions['dms.read' | 'dms.upload' | 'dms.delete' | 'dms.configure']`.
  - At the root there is no item to read permissions from. Upload is allowed for project or license
    admins (`usePermissions(context).isProjectAdmin`), or with the `dms.upload` grant in
    `context.project.user_permissions`. At license level it's `isLicenseAdmin` or
    `context.license.user_permissions['dms.license.upload']`. **Don't check `user_permissions`
    alone**: it holds role grants only, so admins without a role see `false` there.
  - A folder's permissions apply **inside** that folder. To rename or move a folder, check the permissions of its
    **parent**.
- **Why presigned uploads.** `connect` calls cross the iframe boundary as cloned JSON, so `File`, `Blob` and
  `FormData` can't be passed. The browser PUTs the bytes straight to storage, and DMS is told afterwards.

## Rules

- List with `getProjectFiles(projectId, params)` for the root, or `getFilesByToken(folderToken, projectId, params)`
  for a folder. The response has `data`, `file` (the current folder), `breadcrumbs` and `meta`, so paginate with
  `per_page` and `page`.
- Apply the OS label filter only when `context.selectedLabels.resources` includes `'dms_files'`.
- Upload in this order: `checkDuplicateNames` → `getUploadUrls` → `PUT` each file → `uploadFilesFinish`.
  - Drop the `host` header from the presigned headers. The browser refuses to set it.
  - The storage PUT is not an ANT call, so the OS shows no toast when it fails. Report that failure yourself.
- Preview through the OS: `signal({ openFilePreview: { fileToken, fileName, … } })`.
  - Put the extension back on the name (`name.ext`), or the viewer can't tell the file type.
- Before deleting, call `getFileUsages(token, projectId)` and warn the user if tasks or table cells reference
  the file.
- Gate upload and delete UI on the permissions above **and** on `context.projectReadOnly`.

## Canonical pattern

The full implementation (list, upload, preview, live refresh) is `src/examples/files/useProjectFiles.ts`.
The upload core:

```ts
const urlsApi = useApi(connect.dms.getUploadUrls, null)
const finishApi = useApi(connect.dms.uploadFilesFinish, [])

const urls = await urlsApi.execute(projectId, files.map(f => f.name))
if (!urls)
  return // the OS already showed the error
await Promise.all(urls.data.map(async ({ filename, config }) => {
  const file = files.find(f => f.name === filename)
  if (!file)
    return
  const headers = Object.fromEntries(Object.entries(config.headers)
    .filter(([name]) => name.toLowerCase() !== 'host')
    .map(([name, values]) => [name, values.join(',')]))
  const res = await fetch(config.url, { method: 'PUT', headers, body: file })
  if (!res.ok)
    throw new Error(`Upload failed: ${res.status}`)
}))
// folderToken null = root. Duplicate action: 'replace' | 'keep_both' | 'skip'
await finishApi.execute(folderToken, projectId, urls.data.map(({ key, filename }) => ({ key, filename })), 'keep_both')
```

To detect name clashes up front, call `checkDuplicateNames(projectId, names, parentToken)`. It returns
`{ duplicates: { [name]: { token, name, extension, updated_at } } }`, which you can use to ask the user whether to
replace, keep both, or skip.

To preview a file:

```ts
signal({ openFilePreview: {
  fileToken: file.token,
  fileName: file.extension ? `${file.name}.${file.extension}` : file.name,
  fileExtension: file.extension ?? undefined,
  projectId: file.project_id ?? undefined,
  licenseId: file.license_id,
  siblings: others.map(o => ({ fileToken: o.token, fileName: `${o.name}.${o.extension}` })), // extra tabs
} })
```

Other preview options:
- `fullscreen: true` opens the viewer edge to edge.
- Content that isn't in DMS can be previewed by passing `contentUrl` (a `data:` or blob URL) together with a
  synthetic token.
- `closeFilePreview: { fileToken }` dismisses a preview.

## More operations

| Call | Purpose |
|---|---|
| `dms.searchFiles(projectId, { q, ...params })` | Full-text search by name |
| `dms.getDownloadUrl(token, projectId, 'attachment' \| 'inline')` | Signed URL. When `external` is true, the URL is the file's own source link, so open it in a new tab instead of fetching it |
| `dms.createFolder(projectId, { name }, parentToken?)` | New folder |
| `dms.createExternalLink(projectId, data, parentToken?)` | Link to an external document |
| `dms.renameFile` / `moveFile` / `bulkMove` | Organise |
| `dms.deleteFile` / `bulkDelete` → `restoreFile` / `bulkRestore` | Move to the trash and back |
| `dms.getTrashedFiles` / `permanentlyDeleteFile` | Trash handling |
| `dms.syncFileLabels(token, projectId, labelIds)` | Replace **all** labels on a file. Use `attachFileLabels` / `detachFileLabels` to change single labels, and `bulkAttachLabels` / `bulkDetachLabels` for many files |
| `dms.getEffectivePermissions(token, projectId)` | `{ effective, chain, is_owner }`: why a user can or can't do something |
| `dms.getFileUsages(token, projectId)` | Where the file is used (tasks, table cells) |
| `tasks.linkDmsFileToTask(taskId, dmsFileId)` | Attach an existing DMS file to a task |
| `tasks.uploadTaskAppendix(taskId, { data: base64, extension, name })` | Attach a new small file directly to a task |

## Realtime

The OS relays file changes made by other users as signals. Their payloads don't include `owner` or
`permissions`, so refetch (debounced) rather than merging partial rows.

```ts
const stop = signal.receive((s) => {
  if (s.dmsFile || s.dmsFileBatch)
    void refresh() // debounced reload
})
onScopeDispose(stop)
```

## Don't

- Don't pass `File`, `Blob` or `FormData` to `connect.dms.*`. Avoid `uploadFilesToFolder` from an iframe app.
- Don't download a file and render it yourself when `openFilePreview` can show it.
- Don't assume root permissions apply inside folders. Read the `permissions` on each item.
- Don't fetch an `external` download URL with `fetch()`. The browser can't read cross-origin source links.

## See also

[../calling-the-api.md](../calling-the-api.md) · [../signals-and-realtime.md](../signals-and-realtime.md) ·
[labels-sbs.md](labels-sbs.md) · [permissions.md](permissions.md) ·
[tasks-and-workflows.md](tasks-and-workflows.md) · [../pitfalls.md](../pitfalls.md)
