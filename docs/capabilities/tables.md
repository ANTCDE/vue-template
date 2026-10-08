# Dynamic tables

> **TL;DR** Tables are ANT's structured data store. Declare the tables your app needs in `app-config.json`,
> read them with `connect.tables.queryTables`, and write rows with `connect.records.*`.
> **Use when** your app needs its own data (notes, registers, checklists, settings) or reads data another app owns.

## Concepts

- A **table** lives in a **project** (the default) or at **license** level. It has typed **columns** and **records** (rows).
- Tables your app declares in `app-config.json` are created when the app is activated in a project or license.
  Activation creates missing tables and columns and updates existing ones. **It never drops a column**, so
  renaming a column in the manifest adds a new column; the old one keeps its data.
- Table names are shared. When two apps declare the same table, they read and write the same data.
- Every query response carries the table's **id**, which you need for writes, and the current user's
  **permissions** on that table.
- The full declaration schema (column types, `required`, `is_unique`, `is_indexed`, `options_value`, …) is in
  [../app-manifest.md](../app-manifest.md).

## Rules

- Find the table by **name** first (`tables.getTables(projectId)` / `getLicenseTables(licenseId)`),
  and keep its `id`. Writes (`createRecord`, `updateRecord`, …) take the id, not the name.
- **Handle a missing table.** A declared table exists only where the app was activated, and never
  during local development at `/developer/<port>`. Querying a name that doesn't exist is an API
  error, with an OS error toast. Check the lookup instead, and show a clear "not activated" state.
  See `src/examples/tables/useNotes.ts` and
  [../app-anatomy.md](../app-anatomy.md#declared-tables-dont-exist-in-developer-mode).
- Always give a query an `as` alias. The response is keyed by that alias.
- Paginate with `limit` + `offset` and show the total from `stats.count`. Never load a whole table to count it,
  filter it or aggregate it in the browser.
- Gate write UI on `permissions['tables.create' | 'tables.update' | 'tables.delete']`, on project admin, and on
  `context.projectReadOnly`. The API refuses writes in an archived project anyway.
- Reset your state when `projectId` changes. The iframe is **not** reloaded when the user switches project, and a
  stale table id writes into the previous project's table.
- Keep large result sets in `shallowRef`, so Vue doesn't make every row deeply reactive.

## Canonical pattern

The full implementation is `src/examples/tables/useNotes.ts`. The core:

```ts
const { comms: { connect } } = injectContext()
const { projectId } = useGlobalStore()

const queryApi = useApi(connect.tables.queryTables<Note>, null)

if (!projectId.value)
  return // project tables need a project; show a notice instead
const result = await queryApi.execute({
  tables: [{
    name: 'MY_NOTES',             // as declared in app-config.json
    project: projectId.value,     // or `license: licenseId` for license tables
    as: 'notes',                  // response key
    columns: ['title', 'status'], // or ['*']
    sortBy: 'title',
    sortByOrder: 'asc',
    limit: 25,
    offset: 0,
  }],
})

const table = result?.notes        // null when the call failed (useApi does not throw)
table?.id                          // keep for writes
table?.permissions['tables.create']
table?.records                     // Array<Note & TableRecord> | null
table?.stats.count                 // total rows matching the query
```

**Filtering.** Write a column as an object with `conditions`:

```ts
columns: [
  'title',
  { name: 'status', conditions: [{ operator: '=', value: 'open' }] },
  { name: 'due', conditions: [{ operator: 'between', value: ['2026-01-01', '2026-03-31'] }] },
]
```

The operators are `=`, `!=`, `>`, `<`, `>=`, `<=`, `like` (use `%` wildcards), `in`, `not in`, `between`,
`not between`, `is null` and `is not null`.

Other per-table query options:
- `records: [ids]` limits the query to specific rows.
- `sbscode` narrows to records linked to an SBS code (see [labels-sbs.md](labels-sbs.md)).
- `includeLabels: true` adds `_labels` to each row.
- `includeLockInfo` is on by default and adds `_lock`.
- `includeUserColumn: 'column_name'` resolves a user column.
- `groupBy` groups the rows.

**Writing.**

```ts
const createApi = useApi(connect.records.createRecord, null)
await createApi.execute(tableId, { record: { title: 'Inspect roof', status: 'open' } })
if (createApi.error.value)
  return // the OS already showed the error toast
```

## More operations

| Call | Purpose |
|---|---|
| `records.updateRecord(tableId, recordId, { record })` | Update one row (send only the columns you change) |
| `records.deleteRecord({ project, table: tableId, records: [id] })` | Delete rows |
| `records.deleteRecords(projectId, tableId, ids)` | Delete many rows |
| `records.batchUpdate(tableId, { records: [{ id, record }] })` | Update many rows in one call. **Partial**: columns you leave out keep their value |
| `records.bulkUpdate(tableId, { where, updates })` | Set columns on every row matching `where` |
| `records.importRecords(tableId, { records: base64Csv })` | CSV import. Under 100 rows it runs synchronously and returns `{ message, errors, warnings }`. From 100 rows it runs async: `{ async: true, import_id }`, then progress arrives as `importProgress` signals. Check with `isAsyncImport()` |
| `records.getRecordHistory(tableId, recordId)` | Change history of a row |
| `records.getRecordDocument(tableId, recordId, documentId)` | Download a `document` cell. Returns `{ file: base64, extension, name }` |
| `records.attachRecordLabels / detachRecordLabels / syncRecordLabels` | Labels on a row (`sync` replaces all of them) |
| `recordLocks.lockRecords(tableId, { records })` / `unlockRecords` | Lock rows while a user edits them. Locks show up as `_lock` in query results |
| `tables.getTables(projectId)` / `getLicenseTables(licenseId)` | List tables, for example to let a user pick one |
| `tables.getTable(tableId)` | Table metadata, including permissions and limits |
| `tables.queryTablesExport(query)` | CSV export as a background job. Returns `{ batchId }` |
| `columns.*` | Create or change columns at runtime. Prefer the manifest for columns your app owns |

**Document columns.** You upload a file by writing a base64 object into a `document` cell:

```ts
await updateApi.execute(tableId, recordId, {
  record: { drawing: { data: base64, extension: 'pdf', name: 'floor-plan' } }, // name WITHOUT the extension
})
```

**Import progress.** Listen for the `importProgress` signal and filter it by your import:

```ts
const stop = signal.receive((s) => {
  if (s.importProgress?.import_id === importId && s.importProgress.status === 'completed')
    void reload()
})
onScopeDispose(stop)
```

## Don't

- Don't use giant `limit` values (10000+) to avoid paginating. Large results come back slowly and can be truncated.
- Don't aggregate a whole table in the browser. Filter on the server with conditions, or keep a summary table
  that you write to.
- Don't write by table name, and don't cache a table id across a project switch.
- Don't store credentials in a table. Use the Vault ([vault.md](vault.md)).
- Don't call `connect.tables.*` directly. Wrap every call in `useApi`.

## See also

[../calling-the-api.md](../calling-the-api.md) · [../app-manifest.md](../app-manifest.md) ·
[../signals-and-realtime.md](../signals-and-realtime.md) · [labels-sbs.md](labels-sbs.md) ·
[permissions.md](permissions.md) · [../pitfalls.md](../pitfalls.md)
