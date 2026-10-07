# AGENTS.md: building an ANT app

Instructions for AI coding assistants (and developers) working in this repository. Read this
file first, then open **only** the doc that matches your task (routing table below).

## What this is

An app for **ANT-OS**, a platform where many small web apps run inside one shell. This app
runs in an **iframe**. The shell (the "OS" or "host") owns:

- the user session and the API token (the app holds none),
- the current license → project → task context,
- the chrome: title bar, search, toasts, side panel ("notepad"), navigation,
- the only realtime connection.

The app talks to the OS through `comms` (`@antcde/vue-utils`), and to the API through
`comms.connect` (`@antcde/connect-ts`), which is proxied by the OS. Stack: Vue 3,
TypeScript, Vuetify 4, UnoCSS, Vite, Vitest, pnpm.

## Golden rules

1. **Get everything from `injectContext()`.**
   `const { comms, i18n: { t } } = injectContext()` from `@/plugins/context`. Don't create a
   second comms client, i18n instance or API client.
2. **Read context, don't fetch it.** The user, license, project, selected task and permissions
   are in `comms.context` (derived in `useGlobalStore()`, `src/stores/app.store.ts`). Never
   call the API for them.
3. **Every API call goes through `useApi(connect.<service>.<method>, initial)`.** One instance
   per verb. Never `await connect.x.y()` bare in components, and never use `fetch` or axios
   against the ANT API.
4. **`useApi` does not throw.** After `execute()` check `api.error.value`, or create it with
   `{ throwError: true }` and `try/catch`. Otherwise failures look like successes.
5. **Don't add error toasts for API failures.** The OS already shows one. Use
   `comms.notifications.success|warning|info|error` for everything else; never build a
   snackbar.
6. **Watch the context.** The iframe is not reloaded when the user switches project or
   license. `watch(projectId, …, { immediate: true })`: reset state and cached ids, then
   reload. Respect `projectReadOnly`.
7. **Drive the OS chrome, don't rebuild it.** Title, search and menu go through
   `comms.toolbar`. Task details open with `comms.notepad.showTask`. Navigation, split screen,
   file preview and workflows go through `comms.signal(...)`.
8. **Clean up subscriptions.** Every `signal.receive()` / `signal.with().receive()` returns a
   stop function; call it in `onScopeDispose`. One subscription per collection, not per row.
9. **Files never cross the iframe as `File`/`Blob`/`FormData`.** Upload with presigned URLs.
   Preview with `signal({ openFilePreview })`.
10. **Credentials never live in the app or in tables.** Store them in the Vault, bind them to
    a trigger, and dispatch the trigger.
11. **UI conventions:** UnoCSS utilities with the ANT tokens (`bg-ant-surface`,
    `text-muted`, `border-ant`, …); no hex colours, no inline styles. Every control has an
    accessible name (`aria-label` on icon buttons). `autocomplete="off"` +
    `aria-autocomplete="none"` on selects and autocompletes. All text goes through `t()`, and
    `en.json`, `nl.json` and `de.json` are updated together.
12. **Keep the platform files.** `src/main.ts`, `src/plugins/context.ts` (the name `'appContext'`),
    `src/plugins/vuetify.ts` and the `createAnt*` factory configs stay as they are. Bump
    `package.json` and `app-config.json` `version` together, with a `CHANGELOG.md` entry.

## Where to look: task → doc

| You want to… | Read |
| --- | --- |
| Understand ANT, the hierarchy, the app lifecycle | [docs/concepts.md](docs/concepts.md) |
| Know what each template file does, add a feature, run in the OS | [docs/app-anatomy.md](docs/app-anatomy.md) |
| Use context, toolbar, notifications, notepad, URL/deep links, theme, i18n | [docs/shell-integration.md](docs/shell-integration.md) |
| Call the API, handle errors and pagination, find the right `connect.*` namespace | [docs/calling-the-api.md](docs/calling-the-api.md) |
| React to changes live, talk to other apps, ask the OS to do something | [docs/signals-and-realtime.md](docs/signals-and-realtime.md) |
| Declare tables, topics or deep-link params in `app-config.json` | [docs/app-manifest.md](docs/app-manifest.md) |
| Store and query structured data | [docs/capabilities/tables.md](docs/capabilities/tables.md) |
| List, upload, preview or download files | [docs/capabilities/files-dms.md](docs/capabilities/files-dms.md) |
| Read, create or update tasks and workflows | [docs/capabilities/tasks-and-workflows.md](docs/capabilities/tasks-and-workflows.md) |
| Run server-side actions or call external systems | [docs/capabilities/triggers.md](docs/capabilities/triggers.md) |
| Use third-party credentials or "Sign in with ANT" | [docs/capabilities/vault.md](docs/capabilities/vault.md) |
| Use server-side Python scripts | [docs/capabilities/scripts.md](docs/capabilities/scripts.md) |
| Gate UI on roles and permissions | [docs/capabilities/permissions.md](docs/capabilities/permissions.md) |
| Use labels, the OS label filter or SBS codes | [docs/capabilities/labels-sbs.md](docs/capabilities/labels-sbs.md) |
| Use custom task/project types or project templates | [docs/capabilities/types-and-templates.md](docs/capabilities/types-and-templates.md) |
| Build UI: tokens, shared components, accessibility | [docs/ui-and-design.md](docs/ui-and-design.md) |
| Write tests | [docs/testing.md](docs/testing.md) |
| Build, version and publish; host the app yourself | [docs/publishing.md](docs/publishing.md) |
| See how capabilities combine in a real-world feature | [docs/scenarios.md](docs/scenarios.md) |
| Debug odd behaviour / review before shipping | [docs/pitfalls.md](docs/pitfalls.md) |

Working examples of every capability live in `src/examples/<capability>/`. Copy their
patterns. The SDK's own types are the API reference:
`node_modules/@antcde/connect-ts/build/AntConnect.d.ts` (services) and
`node_modules/@antcde/connect-ts/build/comms/signalTypes.d.ts` (signals) carry doc comments.

## The bootstrap (don't change)

```ts
// src/main.ts
createApp(App).use(i18n).use(vuetify).use(provideContext).mount('#app')

// src/plugins/context.ts
export const [provideContext, injectContext] = useSingleton<Context>('appContext', () => {
  const comms = useCommsClient(undefined, undefined, JSON.parse(rawManifest)) // no connect arg: API proxied by the OS
  const colorMode = useAntColorMode(comms)
  const i18n = useAntI18n(comms)
  return { comms, colorMode, i18n }
}, ({ comms }) => comms.unsubscribe())
```

## The canonical data pattern

```ts
export function useThings() {
  const { comms: { connect, notifications }, i18n: { t } } = injectContext()
  const { projectId, projectReadOnly } = useGlobalStore()

  const listApi = useApi(connect.tables.queryTables<Thing>, null)
  const createApi = useApi(connect.records.createRecord, null)
  const things = shallowRef<Thing[]>([])

  async function load() {
    if (!projectId.value)
      return
    const result = await listApi.execute({ tables: [{ name: 'ACME_THINGS', project: projectId.value, as: 'things', columns: ['*'], limit: 25, offset: 0 }] })
    things.value = result?.things.records ?? [] // null on error: the OS already toasted
  }

  async function create(tableId: string, name: string) {
    await createApi.execute(tableId, { record: { name } })
    if (!createApi.error.value) {
      notifications.success(t('things.created'))
      await load()
    }
  }

  watch(projectId, () => { things.value = []; void load() }, { immediate: true })
  return { things, isLoading: listApi.isLoading, canWrite: computed(() => !projectReadOnly.value), create }
}
```

## Top pitfalls (full list: [docs/pitfalls.md](docs/pitfalls.md))

- `useApi` resolves on failure, so check `.error`. Use `{ throwError: true }` for trigger dispatches.
- Errors reach the app as a message only: no `error.response`, no status.
- Not watching `projectId`: you show, or write into, the previous project.
- `context.task` is deprecated: use `selectedTask` or `notepadTask`.
- Theme from `colorMode.isDark`, not from the raw mode (`'auto'`).
- Deep links: read `context.initialRouteQuery` once at startup; write with `signal({ route })`.
- Writes to a table need its **id** (from the query response), not its name.
- `.with()` subscriptions are bound to the project at subscribe time: re-subscribe on switch.
- `connect.triggers` / `connect.vault` / `connect.files` don't exist: use
  `webhookTriggers`, `secrets`, `dms`.
- Auto-imports cover only `vue`, VueUse and `useDisplay`. Import everything else.

## Verify your work

```bash
pnpm dev          # then open ANT-OS at /developer/5174; the app only works inside the OS
pnpm type-check   # run pnpm dev or pnpm build once first on a fresh clone (generates d.ts)
pnpm lint
pnpm test
pnpm build        # dist/app.zip, which goes to the App Store
```

Before finishing: all three translation files updated, versions bumped together if
releasing, no `as` casts on API data, subscriptions cleaned up, write controls respect
permissions and `projectReadOnly`.
