/**
 * Vite configuration — uses the shared ANT factory from @antcde/component-library.
 *
 * The factory includes: vue, UnoCSS, Vuetify auto-import (with labs), AutoImport,
 * Components, Icons, VueI18nPlugin, and a transformIndexHtml plugin that injects
 * the CSS @layer order declaration for Vuetify 4 + UnoCSS compatibility.
 *
 * Pass `import.meta.url` so the factory can resolve relative paths (i18n translations,
 * `@` alias) correctly for this app's directory.
 *
 * Override any Vite config by passing a second argument — it's merged via Vite's
 * `mergeConfig()` (plugins are appended, objects are deep-merged).
 */
import { createAntViteConfig } from '@antcde/component-library/build/vite'

export default createAntViteConfig(import.meta.url)
