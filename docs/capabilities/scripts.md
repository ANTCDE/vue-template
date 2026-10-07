# Scripts

> **TL;DR** Scripts are Python programs owned by a license and run on ANT's script engine, not in
> the browser. You write and version them in the **Scripts IDE** app in ANT-OS, publish a version
> to a project, and run them through a trigger or a task.
> **Use when** you need logic that runs on the server: reshaping third-party data, bulk updates,
> or computations too heavy or too sensitive for the browser.

## Concepts

- **Ownership.** A script belongs to a license (`scripts.create({ license, name })`).
- **Genesis.** The editable working copy. In `ScriptItem` it is the item with
  `is_genesis: true`.
- **Version.** A frozen snapshot of the genesis content. Create one with
  `scripts.update(scriptId, { version })`.
- **Publication.** A version made available to one project with
  `scripts.publish(scriptVersionId, projectId)`. A project only runs the versions published to it,
  so editing the genesis never changes what a project is running.
- **How scripts run:**
  - **From a trigger.** `RunScriptEvent` runs the script. `TransformWithScriptEvent` passes data
    through the script and returns what it produces (for example, to reshape an external API's
    response). See [triggers.md](triggers.md).
  - **From a task.** A task can reference a script (`task.script`), which runs as part of that
    task's workflow. See [tasks-and-workflows.md](tasks-and-workflows.md).
- **Debug runs.** `scripts.debug(scriptId, { python_version? })` starts a debug session. The engine
  streams the output to the Scripts IDE. Use the IDE to debug; apps don't open their own sockets
  (the OS holds the only realtime connection; see
  [../signals-and-realtime.md](../signals-and-realtime.md)).

## Runtime: what a script can do

The available Python versions, the installed libraries, how a script receives its input and how it
talks to ANT are all documented **in the Scripts IDE app in ANT-OS**. That documentation tracks the
engine exactly, so it is not repeated here. Read it there before you write a script.

## Rules

- Run scripts through a trigger. Your app calls `connect.webhookTriggers.dispatch`, never a script
  endpoint. That gives you versioning, run history, permission checks and Vault-injected
  credentials for free.
- Publish a specific version to each project, and release a new version on purpose. Projects must
  not depend on the genesis copy.
- Keep credentials out of script source. If a script needs a third-party credential, bind a Vault
  secret to the trigger that runs it (see [vault.md](vault.md)).
- A `TransformWithScriptEvent` trigger counts as a **write** action, because it runs user code
  with real credentials. A trigger marked `read_only` refuses it.

## More operations

| Call | Purpose |
|---|---|
| `scripts.getAll(licenseId)` | List the license's scripts |
| `scripts.get(scriptId)` | One script, with `content` and `versions` |
| `scripts.create({ license, name })` | New script (genesis) |
| `scripts.update(scriptId, { name?, content?, version? })` | Edit content or freeze a version |
| `scripts.publish(scriptVersionId, projectId)` | Make a frozen version available in a project |
| `scripts.publications(scriptId, projectId)` / `getProjectScriptPublications(projectId)` | What is published where |
| `scripts.delete(scriptId, all?)` | Delete a script |

Most apps never call these. They only dispatch the trigger that runs the script.

## Don't

- Don't reimplement in the browser what a script would do with privileged data. The browser is the
  wrong place for credentials and for bulk writes.
- Don't poll for a long-running script's output. Have it write its result to a table or close a
  task, and react to the change with signals.

## See also

[triggers.md](triggers.md) · [vault.md](vault.md) · [tasks-and-workflows.md](tasks-and-workflows.md) ·
[../scenarios.md](../scenarios.md)
