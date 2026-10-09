# Triggers

> **TL;DR** A trigger is a configured, server-side action, such as "call this external API",
> "return this table's data" or "run this script". It can be started over HTTP or by a platform
> event. An app runs one with `connect.webhookTriggers.dispatch`, wrapped in `useTriggerDispatch`.
> **Use when** your app needs data from outside ANT, has to call a third-party system, or must
> start server-side work that it should not (or cannot) do in the browser.

## Concepts

- **Owner.** Every trigger belongs to a license or a project. The SDK calls the owner the
  *triggerable*: `TriggerableType` is `'licenses' | 'projects'`, plus the owner's id. Almost every
  trigger call takes `(triggerableType, triggerableId, …)`.
- **Action (`event`).** Despite its name, `trigger.event` is the **action the trigger performs**,
  not what starts it. Each action has a stable `code`. Some examples:

  | Code | What it does |
  |---|---|
  | `ExternalHttpRequestEvent` | Calls a third-party HTTP endpoint and returns the response |
  | `ReturnTableDataEvent` | Returns rows from a dynamic table |
  | `ReturnFileDataEvent` | Returns data read from a DMS file |
  | `ReturnQueryEvent` | Returns the result of a saved table query |
  | `RunScriptEvent` | Runs a script (see [scripts.md](scripts.md)) |
  | `TransformWithScriptEvent` | Passes data through a script and returns the result |
  | `TableDataActionEvent` | Writes to a table |
  | `StartWorkflowEvent` | Starts a workflow (task template) |
  | `SendEmailEvent` | Sends an email |

  The authoritative list is `connect.webhookConfig.fetchConfig({ triggerable_type })`. Its `events`
  are the actions; each one has `code`, `name`, `contexts` (`'license'`/`'project'`) and an
  `available` flag. Its `actions` are the system events a trigger can listen to.
- **Start.** Every trigger starts in exactly one of two ways:
  - **Over HTTP.** It has an `http_method` and an `auth_type` (`'none' | 'ant' | 'secret_token'`),
    and is called at `dispatch_url`. If the trigger has a `custom_path`, that path replaces the
    default URL.
  - **By a system event.** `when` is set to an event from `fetchConfig().actions`, and the trigger
    has no URL.
- **Payload merge.** The trigger's stored `payload` is the default request configuration. At
  dispatch, the parts are merged in this order: stored payload, then URL params, then the body the
  caller sends. Keys listed in `payload_pins` are applied last and **cannot be overridden** by the
  caller.
- **Versions.** A draft can be released as a frozen version (`webhookTriggerVersions`). The default
  dispatch URL follows `default_version_id`. A retired version can no longer be called.
- **Secrets.** A trigger never stores credentials inline. It is **bound** to Vault secrets, and the
  server decides where each secret is injected. See [vault.md](vault.md).
- **History.** Every run is recorded. Read it with `webhookTriggersHistory`.
- **Safety flags.** `read_only` makes the trigger refuse write actions. `rate_limit_per_second` and
  `rate_limit_per_minute` cap how often it runs. `null` there means the server default applies.
- **Permissions.**
  - `triggers.read` lets a user list and run triggers.
  - `triggers.configure` lets a user create and edit them.
  - Both exist at license and project level. Check the one at the scope where the trigger lives: a
    license trigger needs license `triggers.read`, even when the user is in a project. The API
    enforces it either way. See [permissions.md](permissions.md).

## Rules

- Dispatch through `connect.webhookTriggers.dispatch`, which the OS proxies with the user's session.
  **Never** `fetch` a `dispatch_url` from the browser: you would need a token you don't have, and
  you would bypass the consent flow.
- Always wrap the dispatch in `useTriggerDispatch(comms)`. It handles the per-user OAuth case:
  1. The dispatch returns an `AuthorizationRequiredResult` (HTTP 200, not an error).
  2. The helper asks the OS to open the provider's consent popup (`oauthAuthorize` signal).
  3. It waits up to 5 minutes for `oauthAuthorizeResult`.
  4. It re-runs your call exactly once.
- Create the dispatch `useApi` with `{ throwError: true }`. Without it, a failed dispatch resolves
  to `null`, and that looks the same as a successful empty result.
- Send only the **question** in the body (a city, a date range, an id). Credentials, hosts and auth
  are trigger and Vault configuration, and the caller cannot change them.
- Find triggers in the current scope. A selected project wins over the license (see `scope` in
  `src/stores/app.store.ts`).
- Show a failure to the user. Only the message crosses the iframe boundary, so a refused dispatch
  has no `error.response`, no status and no body. If you need structured reasons, have the trigger
  return them in a successful response.

## Canonical pattern

The full version is `src/examples/triggers/useTriggerRunner.ts`.

```ts
const { comms } = injectContext()
const { scope } = useGlobalStore()

const listApi = useApi(comms.connect.webhookTriggers.fetchTriggers, null)
const dispatchApi = useApi(comms.connect.webhookTriggers.dispatch, null, { throwError: true })
const { dispatch } = useTriggerDispatch(comms)

// List the triggers in scope (paginated: { data, current_page, last_page, … }).
const triggers = (await listApi.execute(scope.value.type, scope.value.id, { per_page: 50 }))?.data ?? []

// Run one. The body is merged over the trigger's stored request config.
try {
  const result = await dispatch(() =>
    dispatchApi.execute(scope.value.type, scope.value.id, trigger.id, { city: 'Utrecht' }))
  // `result` is whatever the action returns, e.g. the third party's response.
}
catch (error) {
  message.value = error instanceof Error ? error.message : String(error)
}
```

`isAuthorizationRequired(result)` and `isResourceAccessDenied(value)` are exported type guards. You
rarely need the first one, because `useTriggerDispatch` already handles that case. A trigger that
serves a purchased store resource and is refused (not entitled, subscription expired, …) fails with
a **non-2xx** response. Inside an iframe app you only receive its message, so show the message and
don't present it as "no data".

### Finding the trigger to run

Look triggers up by exact name, in the scope where an admin made them:

```ts
const params = { per_page: 1, filters: { name: { $eq: 'site-weather' }, is_active: { $eq: true } } }
const inProject = projectId ? (await listApi.execute('projects', projectId, params))?.data[0] : undefined
const trigger = inProject ?? (await listApi.execute('licenses', licenseId, params))?.data[0]
// dispatch with the scope it was found in
```

- A **project's** trigger list contains only that project's triggers, never the license's. If the
  trigger may live at either level, look in the project first, then the license, and dispatch in the
  scope where you found it.
- "Not found" (empty list) and "couldn't check" (the lookup failed, e.g. no `triggers.read`) are
  different states. Show them differently.

### Reading the result

`dispatch` resolves to whatever the action returns. Two things to expect:

- **External calls may come back wrapped** as `{ response: <the third party's body>, error: null }`.
  Unwrap when both keys are present:
  `const body = result && typeof result === 'object' && 'response' in result && 'error' in result ? result.response : result`.
- **Agree the shape with whoever configures the trigger.** A `TransformWithScriptEvent` (or a script
  step) can reduce a third-party response to exactly what your app needs, for example
  `{ temperature: 21.5, unit: 'C' }`. That beats parsing every provider's format in the app.

### Showing failures

The OS already shows a toast when the call fails. Show the outcome **inline** where the user asked
for it (as `src/examples/triggers/` does), but don't add a second toast. Inside an app frame a refusal
reaches you as a message only: the SDK types mention `error.response` for refused resource triggers,
but that is only available to code that calls the API directly, not through the OS.

## More operations

| Call | Purpose |
|---|---|
| `webhookTriggers.fetchTriggers(type, id, { search, page, per_page })` | List triggers in a scope |
| `webhookTriggers.fetchTrigger(type, id, triggerId)` | One trigger, with full detail |
| `webhookTriggers.createTrigger` / `updateTrigger` / `deleteTrigger` | Manage triggers (needs `triggers.configure`) |
| `webhookTriggers.testTrigger(triggerId)` | Test run that returns the execution detail |
| `webhookConfig.fetchConfig({ triggerable_type })` | Catalogue: actions, system events, HTTP methods, auth types |
| `webhookTriggerVersions.fetchVersions` / `releaseVersion` / `setDefaultVersion` / `retireVersion` | Version lifecycle |
| `webhookTriggersHistory.fetchExecutionHistory(type, id, filters)` | Run history (filter by `trigger_id`, `status`, date range) |
| `webhookTriggersHistory.fetchExecutionHistoryDetail(type, id, runId)` | One run in detail |
| `webhookTriggerSecrets.listBindings` / `bind` / `unbind` / `testBindings` | Vault bindings (see [vault.md](vault.md)) |

Most apps need only `fetchTriggers` and `dispatch`. Configuring triggers belongs in the OS's
Triggers management app, not in yours.

## Don't

- Don't hard-code trigger ids that differ per environment. Look triggers up by name in the
  current scope, or let an admin pick one in your app's settings.
- Don't put an API key in a dispatch body or a stored payload. Bind a Vault secret instead.
- Don't treat `null` from a dispatch as success. Use `throwError: true`.
- Don't build a polling loop around a slow trigger. If the work is asynchronous, report progress
  through a table or a task, and listen with signals (see [../signals-and-realtime.md](../signals-and-realtime.md)).

## See also

[vault.md](vault.md) · [scripts.md](scripts.md) · [permissions.md](permissions.md) ·
[../calling-the-api.md](../calling-the-api.md) · [../scenarios.md](../scenarios.md) ·
[../pitfalls.md](../pitfalls.md)
