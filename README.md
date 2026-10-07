# ANT App Template (Vue)

The starting point for apps that run inside [ANT-OS](https://os.antcde.io). It is also a
working reference: each platform capability has a small, production-style example you can
copy from or delete.

## Quick start

```bash
pnpm install
pnpm dev
```

Then open ANT-OS and go to **`/developer/5174`**. The OS loads your local dev server as an app,
with your real session and context. Outside the OS (`http://localhost:5174` on its own) the
app has no host to talk to.

## What's inside

| Tab (`src/examples/`) | Shows |
| --- | --- |
| `shell/` | Context from the OS, toolbar, notifications, notepad, app state, navigation |
| `tables/` | A table declared in `app-config.json`: paginated query, create/delete, permissions, deep link |
| `tasks/` | Open tasks, opening them in the notepad, closing one, live updates |
| `files/` | Project documents: list, presigned upload, OS preview, label filter |
| `triggers/` | Running a server-side trigger; Vault credentials and OAuth consent handled by the OS |
| `signals/` | App-to-app topics and split screen |

Starting a real app? Delete the example folders you don't need, their entries in
`src/examples/index.ts`, and the example table and topic in `app-config.json`.

## Documentation

- **[docs/](docs/README.md)**: how ANT works and how to use each capability
- **[AGENTS.md](AGENTS.md)**: the entry point for AI coding assistants (Claude Code, Codex,
  Cursor, Copilot…). It is just as useful as a checklist for people.
- **[docs/pitfalls.md](docs/pitfalls.md)**: read it before you ship

## Stack

Vue 3 · TypeScript · Vuetify 4 (ANT light and dark themes) · UnoCSS · Vite · Vitest ·
`@antcde/connect-ts` (API client and OS messaging) · `@antcde/vue-utils` (Vue integration) ·
`@antcde/component-library` (build factories, shared components, test helpers)

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server on port 5174 |
| `pnpm build` | `dist/app.zip` with the app, `app-config.json`, `README.md` and `CHANGELOG.md`, ready for the App Store |
| `pnpm type-check` | `vue-tsc` (run `pnpm dev` or `pnpm build` once first on a fresh clone) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

## Releasing

Bump `version` in `package.json` **and** `app-config.json`, add a matching `CHANGELOG.md`
entry, and run `pnpm build`. The README and CHANGELOG are shown to users in the App Store, so
write them for your users. See [docs/publishing.md](docs/publishing.md).
