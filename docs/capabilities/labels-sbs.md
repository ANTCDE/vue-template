# Labels and SBS

> **TL;DR** **Labels** are a shared tree of tags, defined at license (or project) level and attached to projects,
> tasks, files, records, tables and more. The OS has a global label filter, which your app reads from
> `context.selectedLabels`. **SBS** is the project's location/breakdown code tree; the current code arrives as
> `context.sbs.code`.
> **Use when** your app shows or assigns labels, should respect the OS label filter, or works with locations or
> building parts.

## Labels: concepts

- Labels form a tree (`parent_id`). They are defined per `'licenses'` or `'projects'` resource and have `name`,
  `color` and `icon`.
- A label can be attached to these target types: `projects`, `tasks`, `sbs`, `apps`, `tables`, `triggers`,
  `licenses`, `records`, `dms_files`.
- **The OS label filter.** The user picks labels in the OS bar, and every app receives the result as
  `context.selectedLabels`:
  ```ts
  { labels: string[], operator: 'and' | 'or', resources: LabelTargetType[], includeChildren: boolean }
  ```
  `resources` says which kinds of item the user wants filtered.

## Rules

- Respect the OS filter: map it to `label_ids` / `label_operator` (and `label_include_children`) on list calls.
- Apply it only when `resources` includes the type you list (`'dms_files'` for files, `'projects'` for projects,
  and so on).
- Fetch the catalogue once per license and cache it. It changes rarely.
- For tables, records and other targets, use `labels.filterTargets` to get the matching ids. Then pass them as
  `records: ids` in a table query.

## Canonical pattern

```ts
const { comms: { connect, context } } = injectContext()

// 1. The OS filter → list params (pattern used by src/examples/files/useProjectFiles.ts)
const labelParams = computed(() => {
  const f = context.value.selectedLabels
  if (!f?.labels.length || !f.resources.includes('projects'))
    return {}
  return { label_ids: f.labels, label_operator: f.operator, label_include_children: f.includeChildren }
})
const projectsApi = useApi(connect.projects.getProjects, [])
await projectsApi.execute(licenseId, { filters: { ...labelParams.value } })

// 2. The label catalogue, as a tree
const labelsApi = useApi(connect.labels.fetchLabels, null)
const tree = (await labelsApi.execute('licenses', licenseId, { include: 'tree' }))?.data ?? []

// 3. Assign a label to a project
const attachApi = useApi(connect.labels.attachLabel, null)
await attachApi.execute('licenses', licenseId, labelId, [{ resource_type: 'projects', resource_id: projectId }])
```

To filter table records by label:

```ts
const { ids } = await filterApi.execute('licenses', licenseId, f.labels, 'records', f.operator, f.includeChildren) ?? { ids: [] }
// then: tables: [{ name, project, as, columns, records: ids }]
```

## Labels: operations

| Call | Purpose |
|---|---|
| `labels.fetchLabels(scope, id, { include: 'tree' \| 'children', parent_id? })` | Catalogue |
| `labels.createLabel` / `updateLabel` / `deleteLabel` | Manage the catalogue (needs label-management permission) |
| `labels.attachLabel` / `detachLabel(scope, id, labelId, targets)` | Assign or unassign a label on any target type |
| `labels.filterTargets(scope, id, labelIds, targetType, operator?, includeChildren?)` | Ids of the targets matching a label set |
| `dms.syncFileLabels`, `records.syncRecordLabels` | Replace all labels on one file or record. See [files-dms.md](files-dms.md) and [tables.md](tables.md) |

`@antcde/component-library` ships ready-made label UI. See [../ui-and-design.md](../ui-and-design.md).

## SBS: concepts

- SBS is a project-level tree of **codes** (`code`, `label`, `parent`). It typically represents locations or
  building parts.
- When the user selects an SBS item in the OS, apps receive it as `context.sbs = { code }`.
- Tasks carry an `sbscode`. Table queries accept an `sbscode` that narrows the results to records linked to that
  code.

## SBS: pattern

```ts
const sbsCode = computed(() => context.value.sbs?.code ?? null)

watch(sbsCode, () => void reload())  // re-query when the user picks another location
// in the query: tables: [{ name, project, as, columns, sbscode: sbsCode.value ?? undefined }]

// Highlight a code in the OS notepad's SBS tab
await notepad.show('sbs')
await notepad.selectSbs({ code })
```

| Call | Purpose |
|---|---|
| `sbs.allSbs(projectId, { filters? })` | The whole tree (label filter supported) |
| `sbs.getSbs(projectId, code?)` | Root items, or the children of `code` |
| `sbs.searchSbs(projectId, term)` | Search, for example for a picker |
| `sbs.createSbs` / `updateSbs` / `deleteSbs` | Manage codes (needs `sbs.configure`) |
| `signal({ select: { sbs: code } })` | Make a code the OS selection (`null` clears it) |

## Don't

- Don't build your own global label filter UI. Read `context.selectedLabels`.
- Don't apply the label filter to resource types the user didn't select in `resources`.
- Don't keep your own "current location" state when `context.sbs` already carries it.

## See also

[tables.md](tables.md) · [files-dms.md](files-dms.md) · [tasks-and-workflows.md](tasks-and-workflows.md) ·
[../shell-integration.md](../shell-integration.md) · [../signals-and-realtime.md](../signals-and-realtime.md)
