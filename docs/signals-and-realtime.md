# Signals and realtime

> **TL;DR** `comms.signal` is a two-way message bus with the OS. **Send** a signal to ask the
> OS to do something (navigate, open a preview, select a project, publish to other apps).
> **Receive** signals for everything that happens elsewhere: other apps' changes, realtime
> server events, job progress. Use `signal.with(type)` for live updates of platform resources.
> **Use when** your app must react to changes it didn't make, talk to other apps, or drive OS UI.
> Examples: `src/examples/signals/`, `src/examples/tasks/useOpenTasks.ts`,
> `src/examples/files/useProjectFiles.ts`.

## Sending

```ts
const { comms: { signal } } = injectContext()

signal({ select: { project: projectId } })                // these three are equivalent
signal.send({ select: { project: projectId } })
signal.append({ select: { project: projectId } }).send()
```

A signal with several keys is split into one signal per key before it is sent, so receivers
always see one concern per message.

### What you can ask the OS

| Signal | Effect |
| --- | --- |
| `navigate: { to: 'OS.dash' \| 'OS.profile' }` | Go to an OS screen |
| `navigate: { to: { app: { id } } }` | Open another app (by `id`; `title` also works but is fragile) |
| `openSplit: { app: { id \| title }, pane?: 0 \| 1, layout?: 'v' \| 'h' }` | Open an app in split screen next to yours |
| `select: { project?, task?, sbs? }` | Change the OS selection; `null` clears that level (and everything below it) |
| `route: { query, path? }` | Mirror your state into the OS URL; a `null` value removes a key. See [shell-integration.md](shell-integration.md#navigation-and-url) |
| `openFilePreview: { fileToken, fileName, … }` / `closeFilePreview: { fileToken }` | OS file preview window. See [capabilities/files-dms.md](capabilities/files-dms.md) |
| `openFlow: { taskId, title?, readonly? }` / `closeFlow: { taskId }` | OS workflow editor window for a task tree |
| `overlay: { action }` | Show or hide the OS overlay; `action` can be a task (`{ id }`), attachments, a DMS gallery or a record document |
| `notepad: { action: true \| false \| 'toggle' }` | Open or close the notepad (or use `comms.notepad`) |
| `notifications: { action: true \| false \| 'toggle' }` | Open or close the OS notification panel |
| `immersive: { mode: true \| false \| 'toggle' }` | Hide or show the OS chrome |
| `topic: { name, data, scope? }` | Publish to other apps. See [Topics](#topics-app-to-app-messages) |
| `subscribeChannel` / `unsubscribeChannel` | Ask the OS to relay a realtime channel. See [Channels](#channels) |
| `task: { id, action, data }` (and other change keys) | Tell other open apps you changed something. See [Broadcasting](#broadcasting-your-own-changes) |

Per-user OAuth consent for triggers (`oauthAuthorize` / `oauthAuthorizeResult`) is handled
for you by `useTriggerDispatch`. See [capabilities/triggers.md](capabilities/triggers.md).

## Receiving

```ts
const stop = signal.receive((s) => {
  if (s.jobProgress?.job_type === 'my-export')
    progress.value = s.jobProgress
})
onScopeDispose(() => stop())
```

`receive` sees **every** incoming signal; filter on the key you care about. It returns an
unsubscribe function. Always call it.

### What the OS sends you

| Key | When |
| --- | --- |
| `route` | The OS route changed |
| `connection: { state, since }` | The realtime connection changed (`connected` / `connecting` / `unavailable`). Also sent once when you subscribe |
| `importProgress` | Progress of an asynchronous record import (pushed automatically) |
| `jobProgress` | Progress of a long-running background job, with a `job_type` (pushed automatically) |
| `limitChange` | A license limit changed (from a subscribed limits channel) |
| `dmsFile`, `dmsFileBatch` | Documents changed, by anyone (pushed automatically). See [capabilities/files-dms.md](capabilities/files-dms.md) |
| `topic` | A message on a topic. See below |
| change keys (`task`, `project`, …) and `resource` | Another app or the server changed a resource |

Signals marked *pushed automatically* arrive at every app with no subscription: a plain
`signal.receive` is enough. For other server-side changes, subscribe with `signal.with()`
(below) or a channel.

The OS holds the only websocket. Apps never open their own realtime socket. Use
`connection` to show a "live updates paused" hint if that matters to your users.

## Live updates with `signal.with()`

`signal.with(type, id?, actions?, scope?)` subscribes to server-side changes of one resource
type. The OS joins the right realtime channel for you and leaves it when you unsubscribe.

```ts
const stop = signal.with('userProjectTask').receive((cause) => {
  // cause: { id, action?, data?, meta? }
  if (cause.action === 'deleted')
    remove(cause.id)
  else
    void refresh()
})
onScopeDispose(() => stop())
```

| Argument | Meaning |
| --- | --- |
| `type` | A platform type: `user`, `license`, `project`, `task`, `projectTask`, `userProjectTask`, `sbs`, `table`, `column`, `dmsFile`. Any other string is an **app-defined resource type** |
| `id` | Only changes to this one entity. Omit to receive the whole type within the scope |
| `actions` | Defaults to `created`, `updated`, `deleted`, `trashed`, `restored`. Custom verbs are allowed |
| `scope` | `['project']`, `['license']` or both (the default) |

Choosing the type:

- **Tasks:** `userProjectTask` is every task the user can see, on one channel.
  `projectTask` with a project id covers one project. `licenseProjectTask` is deprecated and
  never fires.
- **Avoid one subscription per entity.** `.with('task', id)` for each row in a list opens one
  authorised channel per row. Subscribe to the collection and filter in the handler.
- **App-defined types:** `.with('inspection')` receives `resource.inspection.<action>` events
  on the project/license resources channel. These are your own events, published by your
  backend logic or by other apps via `signal({ resource: { inspection: { id, action } } })`.

The channel is resolved **once**, when you subscribe. If the user switches project,
unsubscribe and subscribe again (put the subscription inside a `watch` on `projectId` and stop
the previous one).

## Broadcasting your own changes

When you change something that other open apps or the notepad display, tell them:

```ts
const saved = await saveApi.execute({ id: task.id, status: 'closed' })
if (!saveApi.error.value && saved)
  signal({ task: { id: task.id, action: 'updated', data: saved } })
```

The OS re-broadcasts change keys and `resource` signals to every other app loaded in the
browser tab. Other users get the change from the server, through the realtime channels above.
Documents need no broadcast: the server pushes `dmsFile` events to everyone, including you.

## Topics: app-to-app messages

Topics are named pub/sub channels between apps, for example "the user picked note 42". Declare
them in `app-config.json` (`signals.topics`), then send and receive:

```ts
signal({ topic: { name: 'template-note-selected', scope: 'project', data: { message } } })

const stop = signal.receive((s) => {
  if (s.topic?.name === 'template-note-selected')
    handle(s.topic.data)
})
```

- **Names** use letters, digits, `-` and `_` (no dots). **Scope** is `project` (default) or
  `license`.
- **The sender never receives its own message.**
- **Delivery:** a message goes to the other apps open in the same browser tab, and to other
  tabs and users subscribed to the topic. The OS joins a tab to a topic's cross-tab channel
  when an app in that tab **first publishes** on the topic. A tab that has only received so far
  gets messages from apps in the same tab, but not from other tabs or users until it has
  published once.
- Validate `data` before using it. The `schema` in the manifest documents the shape but is not
  enforced at runtime.

## Channels

For realtime streams that have no `.with()` type, ask the OS to relay a channel:

```ts
const channel = `App.Project.${projectId}.Limits`
signal({ subscribeChannel: { channel, events: ['limit.change'] } })
const stop = signal.receive(s => s.limitChange && onLimit(s.limitChange))

onScopeDispose(() => {
  stop()
  signal({ unsubscribeChannel: { channel } })
})
```

Limits channels exist per license, project and table (`App.License.{id}.Limits`,
`App.Project.{id}.Limits`, `App.Table.{id}.Limits`). Channel names must match exactly. A
misspelt channel authorises fine and then receives nothing, forever.

## Hygiene checklist

- [ ] Every `receive` / `.with()` unsubscribe is called in `onScopeDispose` / `onUnmounted`.
- [ ] Subscriptions keyed on project/license are re-created when the context changes.
- [ ] Bursts are debounced (`useDebounceFn(load, 300)`). One user action can produce many events.
- [ ] Handlers are idempotent. The same event can arrive more than once (it is fanned out to
      every app in the tab), so dedupe by id or just refetch.
- [ ] One subscription per collection, not per row.
- [ ] Your own optimistic updates are not undone by the echo of your own change. Ignore
      events for an entity while your save for it is in flight.

## See also

- [shell-integration.md](shell-integration.md)
- [app-manifest.md](app-manifest.md#signals)
- [pitfalls.md](pitfalls.md)
