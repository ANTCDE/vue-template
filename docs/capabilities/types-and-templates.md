# Resource types and project templates

> **TL;DR** **Resource types** are per-license schemas that add custom fields to tasks or projects
> (`connect.resourceTypes`). **Project templates** (`connect.propagations`) are bundles of roles, tables, apps,
> task templates and DMS folders that get stamped onto a project. Applying one is a background job; you follow it
> through `jobProgress` signals.
> **Use when** your app needs structured custom fields on tasks or projects, or sets up projects in a repeatable way.

## Resource types: concepts

- A type belongs to a license and a `modelType`: `'task'` or `'project'`.
- A type has a `key`, a `label`, and optionally `is_default` and a linked project template (`template_id`).
- **Fields** have a `key`, a `label` and a `data_type`. The data types are `string`, `int`, `float`, `bool`,
  `date`, `datetime`, `uuid`, `select` (with `options`) and `json`. Fields can also be `is_required` or
  `is_hidden`, and have a `sort_order`.
- Types are usually defined by a license admin in the OS Types settings. Your app **reads** them, and only
  creates them if it is itself a configuration tool.
- On tasks, field values travel inside `task.type` (see
  [tasks-and-workflows.md](tasks-and-workflows.md#canonical-pattern)):
  - read them by querying with `include: 'type'`;
  - write them with `importTask({ id, type: { key, ...values } })`.

## Rules

- Look up types by `key`, not by label. Labels are user-facing and can change.
- Check that the type your app expects exists. If it doesn't, show a clear message ("ask your admin to add type
  X"). Types are configured per license and are not created automatically.
- For projects, or any entity outside the task payload, use `getEntityFields` / `setEntityFields`.

## Resource types: pattern

```ts
const typesApi = useApi(connect.resourceTypes.listTypes, null)
const types = (await typesApi.execute(licenseId, 'task'))?.data ?? []
const inspection = types.find(t => t.key === 'inspection')
if (!inspection)
  notifications.warning(t('setup.missingType', { key: 'inspection' }))

// Custom field values on a project
const getFieldsApi = useApi(connect.resourceTypes.getEntityFields, null)
const values = await getFieldsApi.execute('project', projectId)
```

| Call | Purpose |
|---|---|
| `resourceTypes.listTypes(licenseId, modelType)` | All types for `'task'` or `'project'` |
| `resourceTypes.getType(licenseId, modelType, key)` | One type including its fields |
| `resourceTypes.listFields(licenseId, modelType, typeKey)` | Fields of a type |
| `resourceTypes.createType` / `updateType` / `deleteType` / `setDefault` / `unsetDefault` | Manage types (configuration apps only) |
| `resourceTypes.addField` / `updateField` / `deleteField` | Manage fields |
| `resourceTypes.getEntityFields(modelType, entityId)` / `setEntityFields(modelType, entityId, values)` | Read or write field values on an entity |

## Project templates: concepts

- A template belongs to the license (the active license comes from the OS context). It holds ordered **items**,
  each with a `resource_type`:
  - `role`
  - `table`
  - `app`
  - `task_template`
  - `dms_folder`
- `applyTemplateToProject({ project_id, template_id })` starts a **run** in the background. The run and each of
  its items report a status: `pending` / `running` / `completed` / `failed`, and per item `created` / `skipped` /
  `failed`.
- A project type can link a template, so creating a project of that type can set it up in one go.

## Project templates: pattern

```ts
const applyApi = useApi(connect.propagations.applyTemplateToProject, null)
await applyApi.execute({ project_id: projectId, template_id: templateId })

// Follow the background job instead of polling
const stop = signal.receive((s) => {
  const job = s.jobProgress
  if (!job || job.resource_id !== projectId)
    return
  if (job.status === 'completed' || job.status === 'failed')
    void reloadRuns() // propagations.listProjectRuns(projectId)
})
onScopeDispose(stop)
```

`jobProgress` events carry `job_id`, `job_type`, `resource_type`, `resource_id`, `status` (`started`, `progress`,
`completed`, `failed`, `canceled`), `phase` and `processed`. Other long-running operations use the same signal,
for example deleting a project. Filter on `job_type` and `resource_id`.

| Call | Purpose |
|---|---|
| `propagations.listTemplates()` / `getTemplate(id)` | Templates of the active license |
| `propagations.createTemplate` / `updateTemplate` / `deleteTemplate` / `setDefaultTemplate` | Manage templates |
| `propagations.listTemplateItems(id)` / `addTemplateItem` / `updateTemplateItem` / `removeTemplateItem` / `reorderTemplateItems` | Manage items |
| `propagations.applyTemplateToProject({ project_id, template_id })` | Start a run |
| `propagations.listProjectRuns(projectId)` / `getRun` / `getRunItems` / `getRunDetail` | Run history and per-item results |

## Don't

- Don't poll a run in a loop. Listen for `jobProgress`, then refetch once.
- Don't hard-code type or field labels. Match on `key`.
- Don't use project templates as a substitute for your app's own tables. Declare those in `app-config.json`.

## See also

[tasks-and-workflows.md](tasks-and-workflows.md) · [tables.md](tables.md) · [permissions.md](permissions.md) ·
[../signals-and-realtime.md](../signals-and-realtime.md) · [../app-manifest.md](../app-manifest.md)
