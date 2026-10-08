# Files (DMS)

> **TL;DR** Files and folders live in the document management system (DMS), in a project or at license level.
> Every item is addressed by its **token**. Upload with `comms.uploadDmsFiles` (the OS does the transfer), and
> preview by handing the token to the OS with the `openFilePreview` signal. Never stream file bytes through `connect`.
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
- **How uploads work.** Bytes never go through the ANT API: DMS hands out presigned storage URLs, the file is
  `PUT` straight to storage, and DMS is told afterwards. `comms.uploadDmsFiles` lets **the OS** do all three steps,
  so the PUT leaves from the OS's origin. `connect` calls can't carry files at all: their arguments are
  cloned as JSON, so `File`, `Blob` and `FormData` arrive empty.

## Rules

- List with `getProjectFiles(projectId, params)` for the root, or `getFilesByToken(folderToken, projectId, params)`
  for a folder. The response has `data`, `file` (the current folder), `breadcrumbs` and `meta`, so paginate with
  `per_page` and `page`.
- Apply the OS label filter only when `context.selectedLabels.resources` includes `'dms_files'`.
- Upload with `comms.uploadDmsFiles(files, { scope, folderToken, duplicateAction, onProgress })`
  (see [Uploading files](#uploading-files-commsuploaddmsfiles)). If names may clash, call
  `checkDuplicateNames` first and pass the user's choice as `duplicateAction`.
  - Failed files come back as results with `status: 'error'`; the OS shows no toast for them, so report them.
- Preview through the OS: `signal({ openFilePreview: { fileToken, fileName, … } })`.
  - Put the extension back on the name (`name.ext`), or the viewer can't tell the file type.
- Before deleting, call `getFileUsages(token, projectId)` and warn the user if tasks or table cells reference
  the file.
- Gate upload and delete UI on the permissions above **and** on `context.projectReadOnly`.

## Canonical pattern

The full implementation (list, upload, preview, live refresh) is `src/examples/files/useProjectFiles.ts`.
The upload core:

```ts
const { comms } = injectContext()

const upload = comms.uploadDmsFiles(files, {
  scope: 'project', // or 'license'; the id comes from the OS context
  folderToken: null, // null = root, or a folder's token
  duplicateAction: 'keep_both', // 'replace' | 'keep_both' | 'skip'
  onProgress: e => progress.set(e.index, e.loaded / e.total), // per file: queued → uploading → finishing → done
})
cancelButton.onclick = () => upload.cancel() // or upload.cancel(index) for one file
const results = await upload.done // one per file: { index, filename, status: 'done' | 'error' | 'cancelled', file?, error? }
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

## Uploading files: `comms.uploadDmsFiles`

```ts
comms.uploadDmsFiles(files: File[], options: {
  scope: 'project' | 'license'
  folderToken?: string | null
  duplicateAction?: 'replace' | 'keep_both' | 'skip'
  onProgress?: (e: DmsUploadProgress) => void
}): { done: Promise<DmsUploadResult[]>, cancel: (index?: number) => void, mode: Promise<'host' | 'local'> }
```

**What the OS does for you.**
- It requests presigned upload URLs just in time, in batches. They expire after 300 s, so they are
  never fetched far ahead.
- It `PUT`s each file to storage **from the OS's origin**, at most 20 at a time.
- It retries once with a fresh URL if one expired while queued.
- It registers each file with DMS. The `DmsFile` arrives in its `done` progress event and in the result.

**What it decides for you.**
- The project or license id is taken from the app's current OS context; you only say `scope`.
- An archived project is refused: `done` rejects.
- Closing the app's pane aborts uploads still in flight. Files that already finished stay.

**Results, not exceptions.** `done` resolves with one result per input file, even when some fail.
It only rejects when nothing could start at all: no project or license in context, or the project
is read-only.

**Cancel.** `cancel(index)` cancels one file, `cancel()` all of them.
- A queued file is dropped.
- A file that is uploading is aborted.
- A file already being registered completes and is kept, so you never get a stored file that
  doesn't show.

**Requirements.** `@antcde/connect-ts` ≥ 0.4.33 together with `@antcde/vue-utils` ≥ 0.2.28 and
`@antcde/component-library` ≥ 0.1.31. Bump them together: `vue-utils` pins its own `connect-ts`,
and an older pin brings back the old client without this method.

### Compatibility

Nothing was removed. All three combinations work:

| Combination | What happens |
| --- | --- |
| **Your app does the presigned upload itself** (`getUploadUrls` → `PUT` → `uploadFilesFinish`) | Works exactly as before, with its existing limit: the browser only lets the `PUT` through from the OS origin, so it works in installed apps but not from `/developer/<port>` or a self-hosted origin (see below) |
| **New SDK, older ANT-OS** (no OS upload yet) | The SDK detects this and runs the same upload in your app's frame. `mode` resolves to `'local'`, and the same origin limit applies |
| **Older app, newer ANT-OS** | Unaffected. The OS only gained the new method |

`await upload.mode` tells you which happened: `'host'` (the OS uploaded) or `'local'` (your frame did).

### The direct presigned path (still supported)

You can still call `connect.dms.getUploadUrls` / `getLicenseUploadUrls`, `PUT` the files yourself
and call `uploadFilesFinish` / `uploadLicenseFilesFinish`. Prefer `uploadDmsFiles`; if you do it
yourself, these facts apply:

- **Storage is Amazon S3.** The URL is SigV4, signed in the query string, with
  `X-Amz-SignedHeaders=host` and `UNSIGNED-PAYLOAD`, valid for 300 s.
- **Send only `config.headers`, minus `Host`.** Add no `x-amz-*` headers: unsigned ones get a 403.
  The browser's own `Content-Type` is fine, because it isn't signed.
- **The `PUT` leaves from your app's origin, so the bucket's CORS policy decides.** It allows the
  OS origin, so installed apps work. From `http://localhost:<port>` or your own domain, the browser
  blocks it. The console shows *"…from origin 'http://localhost:5174' has been blocked by CORS
  policy…"* on a request to `*.s3.<region>.amazonaws.com`, and `fetch`/XHR fails without a
  response. `uploadDmsFiles` avoids this entirely.
- **A `403` from S3** means an expired URL or extra unsigned headers.

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
- Don't hand-roll the presigned `PUT` when `comms.uploadDmsFiles` fits. A PUT from your own frame only works
  from the OS origin (see [the direct path](#the-direct-presigned-path-still-supported)).
- Don't fetch an `external` download URL with `fetch()`. The browser can't read cross-origin source links.

## See also

[../calling-the-api.md](../calling-the-api.md) · [../signals-and-realtime.md](../signals-and-realtime.md) ·
[labels-sbs.md](labels-sbs.md) · [permissions.md](permissions.md) ·
[tasks-and-workflows.md](tasks-and-workflows.md) · [../pitfalls.md](../pitfalls.md)
