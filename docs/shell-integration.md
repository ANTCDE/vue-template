# Integrating with the OS shell

> **TL;DR** `comms` (from `injectContext()`) is your app's handle on ANT-OS. Read the
> context from it, and drive the title bar, toasts, side panel, navigation and URL through it.
> Never rebuild what the shell already provides.
> **Use when** you need the current user/license/project/task, want to show a message, open a
> task, sync your state to the URL, or follow the OS theme and language.
> Example: `src/examples/shell/ShellExample.vue`.

## Rules

- Read context from `comms.context`. Never fetch the current user, license or project
  over the API.
- Show messages with `comms.notifications`, never with your own snackbar.
- Use the OS toolbar (`comms.toolbar`) for the title, search box and app menu. Don't render
  your own header bar.
- Open tasks in the OS notepad (`comms.notepad.showTask`). Don't build task detail screens.
- Use `useAntI18n(comms)` (already in the template). A bare `createI18n` locale does not
  follow the user's language.
- Theme from `colorMode.isDark`, never from the raw colour mode (it can be `'auto'`).
- Don't touch `window.top`, `window.parent` or the top-level URL. Ask the OS through signals.

## Canonical pattern

`src/examples/shell/ShellExample.vue`: read context through `useGlobalStore()`, set the toolbar
once on mount, and let the OS show messages.

```ts
const { comms: { toolbar, notifications }, i18n: { t } } = injectContext()
const { projectId } = useGlobalStore()

onMounted(() => {
  toolbar.title.value = t('app.title')
  toolbar.menu.value = [{ icon: 'mdi-refresh', title: t('actions.refresh'), onClick: () => void load() }]
})
watch(projectId, () => { reset(); void load() }, { immediate: true })
```

## The `comms` object

| Member | Type | Use |
| --- | --- | --- |
| `context` | `Ref<Context>` | Current user, license, project, task, SBS, labels, dark mode. Kept in sync by the OS |
| `connect` | `AntConnect` | The typed API client (proxied through the OS). See [calling-the-api.md](calling-the-api.md) |
| `signal` | callable | Send and receive signals. See [signals-and-realtime.md](signals-and-realtime.md) |
| `toolbar` | writable refs | `title`, `subtitle`, `searchEnabled`, `search`, `menu`, `isLoading` |
| `notifications` | functions | `success`, `error`, `warning`, `info` (message string) |
| `notepad` | functions | `show(tab?)`, `showTask({ id }, select?)`, `hide()`, `selectSbs({ code })` |
| `appState` | `Ref<string>` | A string the OS keeps in the URL hash for you |
| `request` | function | Raw request through the OS, for endpoints `connect` does not wrap |
| `unsubscribe` | function | Tear down; the template calls it on unmount |

## Context

`comms.context.value` contains:

| Field | Meaning |
| --- | --- |
| `user` | The signed-in user (`name`, `email`, `language`, `is_admin`, …) |
| `license` | The current license, including the user's license permissions |
| `project` | The current project or `null`, including the user's project permissions |
| `projectReadOnly` | `true` when the project is archived. The API refuses writes, so disable them |
| `selectedTask` | The task the user selected as working context |
| `notepadTask` | The task open in the notepad. Different from `selectedTask`; pick the one you mean |
| `task` | **Deprecated.** Use `selectedTask` or `notepadTask` |
| `sbs` | The selected SBS code (`{ code }`) or `null` |
| `selectedLabels` | The OS label filter. See [capabilities/labels-sbs.md](capabilities/labels-sbs.md) |
| `darkMode` | `true`, `false` or `null` (follow system). Use `colorMode.isDark` instead |
| `tourMode` | `true` while the OS product tour runs |
| `initialRouteQuery` | The OS URL query at the moment your app loaded, for restoring deep links |

The context is a `Ref`. Wrap what you need in `computed`, and `watch` it to react to changes.
The template's `useGlobalStore()` (`src/stores/app.store.ts`) derives `licenseId`,
`projectId`, `projectReadOnly`, `scope` and `permissions` once:

```ts
const { projectId } = useGlobalStore()
watch(projectId, () => { resetState(); void load() }, { immediate: true })
```

The OS does **not** reload your iframe when the user switches project or license. If you
don't watch, you will show the previous project's data, or write into it.

## Toolbar

```ts
const { comms: { toolbar, notifications }, i18n: { t } } = injectContext()

onMounted(() => {
  toolbar.title.value = t('app.title')
  toolbar.searchEnabled.value = true
  toolbar.menu.value = [
    { icon: 'mdi-refresh', title: t('actions.refresh'), onClick: () => void reload() },
  ]
})
watch(() => toolbar.search.value, query => filter(query)) // already debounced by the OS
watch(isLoading, value => toolbar.isLoading.value = value)
```

A menu item's `onClick` runs inside your app. The OS only receives the icon and title.

## Notifications

```ts
notifications.success(t('notes.saved'))
```

The OS **already shows an error toast for every failed API call** made through `connect`.
Don't add your own error toast for those, or the user sees two. Do show one for failures the OS
can't see, such as a direct upload to storage or your own validation. See
[calling-the-api.md](calling-the-api.md#errors).

## Notepad

The notepad is the OS side panel. Its tabs are `'task' | 'tasks' | 'apps' | 'sbs' | 'chat'`.

```ts
notepad.showTask({ id: task.id })          // open a task's details
notepad.showTask({ id: task.id }, true)    // …and make it the selected task
notepad.show('sbs')                        // open a tab
notepad.selectSbs({ code: 'B01.02' })      // highlight an SBS code
notepad.show('chat', { prefill: t('ai.question') }) // pre-fill the assistant's input
notepad.hide()
```

## Navigation and URL

Your iframe's own URL is not what the user sees or shares. Use signals instead:

```ts
signal({ navigate: { to: 'OS.dash' } })                 // OS dashboard ('OS.profile' too)
signal({ navigate: { to: { app: { id: appId } } } })    // open another app
signal({ route: { query: { noteId: id } } })            // mirror your state into the OS URL
signal({ route: { query: { noteId: null } } })          // remove a key
```

To make deep links work:

1. Declare the parameter under `capabilities.queryParams` in `app-config.json`. See
   [app-manifest.md](app-manifest.md#capabilities).
2. On load, read it **once** from `context.value.initialRouteQuery`. Signals sent before the
   handshake are lost, so this snapshot is the only reliable source at startup.
3. On every change, send it back with a `route` signal.

`src/examples/tables/TablesExample.vue` does exactly this with `noteId`.

If you use vue-router inside your app, mirror the router path into one query parameter in an
`afterEach` hook, and restore it from `initialRouteQuery` before the first navigation. Don't
use the iframe's own location as the source of truth.

## App state

`appState` is a string the OS stores in its URL hash, so it survives reloads and shared links.
Use it for small UI state (a selected tab, a zoom level). Serialise it yourself:

```ts
const tab = ref(appState.value || 'overview')
watch(tab, value => appState.value = value)
```

## Language and theme

- **Language:** `useAntI18n(comms)` sets vue-i18n's locale from `context.user.language`,
  falling back to `en`. Keep `en.json`, `nl.json` and `de.json` in step.
- **Theme:** `<v-app :theme="theme">` with
  `const theme = computed(() => colorMode.isDark.value ? 'dark' : 'light')`.
  UnoCSS `dark:` utilities and the ANT tokens follow automatically.

## Tour mode

While the OS product tour runs, `context.tourMode` is `true`. To take part in it, use
`AntTourZone` and `useAppTourMode()` from `@antcde/component-library`. See
[ui-and-design.md](ui-and-design.md).

## Don't

- Don't fetch the current user, license or project. Read `comms.context`.
- Don't build your own header bar, snackbar or task detail screen.
- Don't use `context.task` (deprecated) or the raw colour mode (it can be `'auto'`).
- Don't change the top-level URL or use the iframe's own URL as shareable state. Use
  `signal({ route })`.

## See also

- [signals-and-realtime.md](signals-and-realtime.md): everything else you can ask the OS
- [calling-the-api.md](calling-the-api.md)
- [pitfalls.md](pitfalls.md)
