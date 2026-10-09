# Tasks and workflows

> **TL;DR** Tasks are queried through the license with `connect.tasks.getV2Tasks(licenseId, buildTaskQuery(…))`.
> You create and update them with `importTask` (an upsert), then broadcast the change. The OS notepad and the
> flow window are the task UI, so open them instead of building your own.
> **Use when** your app lists, creates, plans or reacts to tasks, or works with workflow templates.

## Concepts

- **Task fields.** `id`, `title`, `status`, `priority`, `planned_start`, `planned_end`, `due`, `assigned_to`,
  `labels` and `sbscode`, plus links to an `app`, a `script` or a `trigger`.
  - Statuses: `open`, `closed`, `canceled`, `processing`, `executed`, `failed`, `inactive`, `skipped`.
  - Priorities: `low`, `normal`, `high`, `urgent`.
- **Hierarchy.** Tasks nest through `parent`, `children`, `hasChildren` and `children_count`. A task with
  subtasks and relations between them is a **workflow**.
- **Project vs license task.** It is the same model. A project task has `task_project` set; a license task has
  none.
- **Templates.** Templates are tasks with `is_template: true`.
  - Applying a template **clones** it.
  - The copy remembers where it came from in `template_source_id` and `template_version_id`.
  - Templates are versioned, so instances can be checked for updates and synced.
- **Typed fields.**
  - A license can define task **types**: schemas with custom fields (see
    [types-and-templates.md](types-and-templates.md)).
  - On a task, they appear as `task.type` (`{ key, label, …fieldValues }`) when you request `include: 'type'`.
  - You write them as `type: { key, ...values }`.
- **Selection in the OS.**
  - `context.selectedTask` is the task the user selected as working context.
  - `context.notepadTask` is the task open in the notepad.
  - `context.task` is deprecated, so don't use it.

## Rules

- Always query through the license. Narrow the results with filters such as `project`, `status`, `parent` and
  `is_template`.
- Always pass `per_page` and `page`. Without them, the endpoint returns **every** task.
  - With them, the response is `{ data, links, meta }`.
  - `meta` has no grand total. Use `links.next` to tell whether another page exists.
- Build query strings with `buildTaskQuery({...})` from `@antcde/connect-ts`. Don't concatenate strings yourself.
- Update with `importTask({ id, ...changes })`.
  - Then broadcast `signal({ task: { id, action: 'updated', data: saved } })` so the notepad and other apps
    merge the change.
  - Create a **fresh `useApi` per save** when saves can overlap, so they don't share one error state.
- Status changes the backend accepts, as observed:
  - `open` → `closed` or `canceled`.
  - Any other status → `open`.
  - `inactive` tasks can't be moved by the user.
- Open details with `notepad.showTask({ id })`, and workflows with `signal({ openFlow: { taskId } })`.
- For live updates, use **one** subscription for the user's tasks: `signal.with('userProjectTask')`. Don't open
  `.with('task', id)` once per visible task. `userProjectTask` is a per-**user** channel covering every
  project, so it does **not** need re-subscribing when the project changes; just refetch for the new one.

## Canonical pattern

The full implementation (list, close, live refresh) is `src/examples/tasks/useOpenTasks.ts`. The core:

```ts
const listApi = useApi(connect.tasks.getV2Tasks<Task>, null)

const query = buildTaskQuery({
  filters: { status: { $eq: 'open' }, project: { $eq: projectId } },
  include: 'taskProject,assignedTo',
  per_page: 25,
  page: 1,
})
const tasks = (await listApi.execute(licenseId, query))?.data ?? []

async function close(task: Task) {
  const saveApi = useApi(connect.tasks.importTask, null)
  const saved = await saveApi.execute({ id: task.id, status: 'closed' })
  if (saveApi.error.value || !saved)
    return
  signal({ task: { id: task.id, action: 'updated', data: saved } })
}

const refresh = useDebounceFn(load, 300)
const stop = signal.with('userProjectTask').receive(() => void refresh())
onScopeDispose(stop)
```

Filter syntax for `buildTaskQuery`:
- `$eq`, `$ne`, `$null: true`, `$notNull: true`
- `$or: [...]` for alternatives
- nested keys such as `type: { key: { $eq: 'inspection' } }`
- `fields: { tasks: 'id,title,status' }` returns sparse rows
- `include` names relations, for example `taskProject,assignedTo,labels,type,childrenCount`
- Filterable columns in `filters`: `project`, `assigned_to`, `title`, `priority`, `status`, `parent`,
  `sbscode`, `created_by` (plus `is_template`). **My tasks:** `assigned_to: { $eq: userId }`, with
  `userId` from `useGlobalStore()`.
- **The task query language** (`q`), the same one the OS task lists use, covers what filters can't.
  For example `q: 'assignee = currentUser() AND status = open AND due < today() ORDER BY due'`,
  next to `filters: { project: { $eq: projectId } }`. `tasks.getTaskQueryFields(licenseId)` returns
  the fields it knows.
  - `q` and `filters` both apply: the result matches **both**.
  - `ORDER BY due` sorts ascending; add `DESC` to reverse. Tasks without a due date always come last.
  - `due < today()` excludes tasks due today; use `<=` to include them.

**Who may change a task.** Add `canUpdate` to `include`; each row then carries `can_update`. Disable
edit and close controls where it is `false` (`src/examples/tasks/` does this). Anyone allowed to
update a task can move it between the statuses described above.

**Lists longer than a page.** Keep `per_page` small and offer "Show more": fetch `page + 1` while
the response's `links.next` is set, and append. On a live update, reload the pages already shown.

To write typed fields:

```ts
await saveApi.execute({ id: task.id, type: { key: 'inspection', inspector: userId, score: 4 } })
// read them back with include: 'type' → task.type.score
```

## More operations

| Call | Purpose |
|---|---|
| `tasks.getV2Task(taskId, query?)` | One task with details (checks, activities) |
| `tasks.importTasks([...])` | Bulk upsert |
| `tasks.deleteTask(taskId, 'single' \| 'with-subtasks')` | Delete |
| `tasks.getTaskTree(taskId)` | Full subtree of a workflow |
| `tasks.setTaskRelation(sourceId, { target_id, mode: 'CREATE', type: 'BLOCKED_BY', lag_days })` | Dependency between tasks (`BLOCKED_BY`, `NON_BLOCKING`, `CONDITIONAL`) |
| `tasks.getTaskRelations(taskId)` | A task's relations |
| `tasks.clone(templateId, { license, project, parent?, is_template: false, start_date? })` | Apply a template |
| `tasks.listVersions` / `publishVersion` / `checkForUpdates` / `versionDiff` / `syncToLatestVersion` | Template versioning. `useTemplateVersioning(connect)` from `@antcde/vue-utils` wraps all of them |
| `tasks.getInstances(templateId)` / `pushSync(templateId, ids)` | Instances of a template, and pushing updates to them |
| `tasks.createTaskCheck` / `updateTaskCheck` / `deleteTaskCheck` | Checklist items |
| `tasks.uploadTaskAppendix(taskId, { data, extension, name })` / `linkDmsFileToTask` | Attachments (see [files-dms.md](files-dms.md)) |
| `tasks.executeTask(taskId)` | Run a task's automation (script, trigger or app) |
| `tasks.listShares` / `addShare` / `removeShare` | Share a private task with a user |
| `notepad.showTask({ id }, true)` | Open the task in the notepad and also make it the selected task |

## Don't

- Don't build a task detail screen or a flow editor. The OS has both.
- Don't read `context.task`. Use `selectedTask` or `notepadTask`.
- Don't subscribe to `licenseProjectTask`. It is deprecated and never fires; use `userProjectTask`.
- Don't fetch without `per_page`, and don't use page sizes in the thousands.
- Don't forget the broadcast after a write, or other open apps will show stale data.

## See also

[../calling-the-api.md](../calling-the-api.md) · [../signals-and-realtime.md](../signals-and-realtime.md) ·
[types-and-templates.md](types-and-templates.md) · [triggers.md](triggers.md) · [scripts.md](scripts.md) ·
[permissions.md](permissions.md) · [../pitfalls.md](../pitfalls.md)
