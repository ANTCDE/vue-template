# Anatomy of an ANT app

> **TL;DR** What every file in this template does, which parts are platform contract
> (keep them) and which parts are examples (replace them), and how to run the app inside ANT-OS.
> **Use when** starting a new app from the template or adding a feature to one.

## File map

```
app-config.json            Manifest: version, tables, topics, deep-link params. See app-manifest.md
package.json               Keep "version" equal to app-config.json "version"
CHANGELOG.md / README.md   Bundled into the build and shown in the App Store
vite.config.ts             createAntViteConfig(import.meta.url)       ← keep
uno.config.ts              createAntUnoConfig()                       ← keep
vitest.config.ts           createAntVitestConfig(import.meta.url)     ← keep
src/
  main.ts                  createApp → i18n → vuetify → provideContext → mount   ← keep
  App.vue                  <v-app> with OS-synced theme; renders the example tabs
  plugins/
    context.ts             provideContext / injectContext: comms + i18n + colorMode  ← keep
    vuetify.ts             createAntVuetify()                         ← keep
  stores/
    app.store.ts           useGlobalStore(): licenseId, projectId, scope, permissions
  lang/
    language.ts            createI18n; translations auto-discovered
    translations/          en.json, nl.json, de.json, always edited together
  examples/                One folder per capability; delete what you don't need
    index.ts               The tab list
    shell/  tables/  tasks/  files/  triggers/  signals/
tests/
  app.test.ts              testAppSetup(): the app is wired to ANT-OS correctly
docs/                      Platform documentation (you are here)
AGENTS.md / CLAUDE.md      Entry point for AI coding assistants
```

## The bootstrap (keep it exactly like this)

`src/plugins/context.ts` creates one app-wide context:

```ts
export const [provideContext, injectContext] = useSingleton<Context>(
  'appContext', // the test helpers inject under this name, so don't rename it
  () => {
    const comms = useCommsClient(undefined, undefined, JSON.parse(rawManifest))
    const colorMode = useAntColorMode(comms)
    const i18n = useAntI18n(comms)
    return { comms, colorMode, i18n }
  },
  ({ comms }) => comms.unsubscribe(),
)
```

- `useCommsClient()` opens the channel to the OS. There is **no `connect` argument**, so API
  calls go through the OS (no token in the app). The third argument sends `app-config.json`
  to the OS during the handshake.
- `useAntI18n(comms)` makes vue-i18n follow the user's ANT language.
- `useAntColorMode(comms)` follows the OS dark mode. Bind the theme to
  `colorMode.isDark` (see `src/App.vue`), not to the raw mode, which can be `'auto'`.

In any component or composable:

```ts
const { comms, i18n: { t } } = injectContext()
const { connect, context, signal, notifications, toolbar, notepad } = comms
```

## Adding a feature

1. Create `src/examples/<name>/` (or, in a real app, `src/components/<Feature>/` plus
   `src/composables/`), with a composable for data and a component for UI.
2. Read context from `useGlobalStore()` / `comms.context`. Don't fetch the user, license
   or project.
3. Call the API with `useApi(connect.<service>.<method>, initial)`. See
   [calling-the-api.md](calling-the-api.md).
4. Watch `projectId` (or `licenseId`) and reset your state when it changes.
5. Add every user-facing string to `en.json`, `nl.json` and `de.json`.
6. Register the tab in `src/examples/index.ts`, or route to it yourself.

When you start a real app, delete the `src/examples/` folders you don't need and their
entries in `src/examples/index.ts`. Delete the `TEMPLATE_NOTES` table and the
`template-note-selected` topic from `app-config.json` if you don't use them.

## What the factories give you

| Factory | Provides |
| --- | --- |
| `createAntViteConfig(import.meta.url, overrides?)` | Vue, Vuetify (with labs), UnoCSS, icons, the i18n plugin for `src/lang/translations/**`, the `@` → `src` alias, CSS layer ordering, auto-imports, component auto-registration |
| `createAntVuetify(options?)` | ANT light and dark themes, component defaults, icons |
| `createAntUnoConfig(overrides?)` | ANT design tokens (`bg-ant-surface`, `text-muted`, `border-ant`, …), Vuetify breakpoints, `dark:` variant |
| `createAntVitestConfig(import.meta.url)` | happy-dom, Vuetify and i18n registered, `@antcde/vue-utils` mocked |

All of them accept overrides, which are deep-merged. Leave `base` as the Vite factory sets it.

**Auto-imports** cover only `vue`, `@vueuse/core`, `@vueuse/math`, Vuetify's `useDisplay`, and
the exports of `src/composables`, `src/stores` and `src/plugins`. Everything else (vue-router,
vue-i18n, `@antcde/*`) needs an explicit import. The template imports explicitly everywhere,
which is clearer for readers and for AI assistants.

**Components** in `src/components/**/*.vue` are registered automatically. Files and folders
whose name starts with `_` are skipped: use that for private sub-components and import them
explicitly. `src/examples/` is not auto-registered; its tabs are imported in
`src/examples/index.ts`.

The generated `auto-imports.d.ts`, `components.d.ts` and `.eslintrc-auto-import.json` appear
after the first `pnpm dev` or `pnpm build`. They are git-ignored, so run one of those before
`pnpm type-check` on a fresh clone.

## Running inside ANT-OS

```bash
pnpm install
pnpm dev            # serves on http://localhost:5174
```

Open ANT-OS and go to **`/developer/5174`**. The OS loads `http://localhost:5174` in an iframe,
with your real session, context and realtime. For another port use `/developer/<port>`.

Opened directly at `http://localhost:5174`, outside the OS, the app has no host: comms never
connects and API calls fail. Always develop inside the OS.

### Declared tables don't exist in developer mode

The developer URL loads your code, but the app is **not installed or activated**. So nothing in
`app-config.json` has been applied: the tables you declare don't exist in the project yet, and
querying them fails. To get them while developing:

- **Create them for development.** The Tables example shows a "Create table for development"
  button when its table is missing. It calls `connect.tables.createTable` with the columns from
  `app-config.json`; see `createTableForDevelopment` in `src/examples/tables/useNotes.ts`. You need
  `tables.configure` or project admin rights. You can also create the table by hand in the OS's
  tables app, with the same name and columns.
- **Or activate a real version once.** Upload a build to the App Store, install it on your license
  and activate it in your development project. That creates every declared table. You can keep
  using `/developer/<port>` for the code afterwards.

Either way works: activation **adopts** an existing table with the same name and adds or updates
its declared columns, so a table you created during development is taken over by the first real
activation. Your code should still handle a missing table, because a project where the app was
never activated looks exactly like this. Look the table up by name first and show a clear state
instead of failing (see [capabilities/tables.md](capabilities/tables.md)).

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server on port 5174 |
| `pnpm build` | `dist/` plus `dist/app.zip` (with `app-config.json`, `README.md`, `CHANGELOG.md`) |
| `pnpm type-check` | `vue-tsc --build` |
| `pnpm lint` | ESLint (antfu config) |
| `pnpm test` | Vitest, once |

## Versioning

Bump `package.json` `version` **and** `app-config.json` `version` together, and add a
`CHANGELOG.md` entry with the same version. Users see that entry in the App Store. See
[publishing.md](publishing.md).
