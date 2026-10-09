# Changelog

All notable changes to this app are documented here. This file is bundled into
the built app and shown in the ANT App Store.

## 2.0.0

- The template is now a reference app: one tab per platform capability (shell & context,
  dynamic tables, tasks, files, triggers, signals) under `src/examples/`, each written the way
  a production app should be — `useApi` for every call, permission and read-only gating, live
  updates, deep links.
- `app-config.json` declares a real example table, a topic and a deep-link query parameter.
- The app passes its manifest to ANT-OS on connect.
- Theme follows the OS dark mode reliably (`isDark` instead of the raw colour mode).
- TypeScript pinned to 6 (vue-tsc does not support 7 yet).
- `pnpm lint` passes again on a fresh clone.
- Tables example: shows a clear "table not activated" state, with a "Create table for
  development" button, when its table doesn't exist yet (always the case at `/developer/<port>`).
- Files example: upload is enabled for project and license admins (previously only users with an
  explicit upload grant), shows why it is disabled otherwise, and lists newest files first.
- Files example: uploads go through `comms.uploadDmsFiles`, so the OS performs the transfer and
  uploading works from the developer URL and self-hosted apps too. It shows progress, can cancel,
  reports per-file failures, and says whether the OS or the app performed the upload.
- SDK requirement raised to `@antcde/connect-ts` ^0.4.33, `@antcde/vue-utils` ^0.2.28 and
  `@antcde/component-library` ^0.1.31 (bumped together; `vue-utils` pins its `connect-ts`).

## 1.0.0

- Initial ANT OS app template: Vue 3 + Vuetify 4 + Vite 8 + TypeScript, wired to
  ANT-OS through the `@antcde/component-library` shared build, Vuetify, UnoCSS,
  and test factories.
