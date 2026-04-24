# ANT App Template (Vue)

A starter template for building apps that run inside [ANT-OS](https://os.antcde.io).

## Tech Stack

- **Vue 3** + **TypeScript 6**
- **Vuetify 4** with ANT design system (light + dark themes)
- **Vite 8** (Rolldown)
- **UnoCSS** with Vuetify 4 CSS layer compatibility
- **@antcde/component-library** for shared build configs
- **@antcde/vue-utils** for ANT-OS integration (comms, signals, i18n sync)

## Quick Start

```bash
pnpm install
pnpm dev
```

The app runs on `http://localhost:5174` and is designed to be loaded inside ANT-OS as an iframe app.

## Project Structure

```
src/
  main.ts                    # App entry point
  App.vue                    # Root component (theme sync, tab layout)
  components/
    Main.vue                 # Demo component showing ANT-OS integration
  plugins/
    vuetify.ts               # Vuetify config (createAntVuetify factory)
    context.ts               # App context (comms, i18n, color mode)
  lang/
    language.ts              # i18n setup (auto-discovers translations)
    translations/            # Locale files (en, de, nl)
vite.config.ts               # Vite config (createAntViteConfig factory)
uno.config.ts                # UnoCSS config (createAntUnoConfig factory)
app-config.json              # ANT-OS app metadata
```

## Shared Build Configs

This template uses factory functions from `@antcde/component-library/build/*`:

- **`createAntViteConfig(import.meta.url)`** — Vite plugins, CSS layer ordering, path aliases
- **`createAntVuetify()`** — Theme colors, component defaults, icons, light + dark themes
- **`createAntUnoConfig()`** — UnoCSS presets, Vuetify breakpoints, dark mode selector

These are opt-in and overridable — pass options to customize.

## ANT-OS Integration

The app communicates with ANT-OS through the `comms` object (from `@antcde/vue-utils`):

```ts
const { comms } = injectContext()
const { toolbar, notepad, context, connect, notifications, signal } = comms
```

- **toolbar** — control the app toolbar (title, menu items, search)
- **notepad** — open/close the notepad panel (tasks, SBS)
- **context** — reactive license/project/task context from ANT-OS
- **connect** — typed API client for ANT backend services
- **notifications** — show toast notifications
- **signal** — send/receive signals to/from ANT-OS (navigation, overlays, queries)

## Building for ANT-OS

```bash
pnpm build
```

Creates a `dist/` folder with the built app and `app-config.json`, zipped for upload to the ANT App Store.
