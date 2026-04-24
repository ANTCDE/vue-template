/**
 * UnoCSS configuration — uses the shared ANT factory from @antcde/component-library.
 *
 * The factory includes:
 * - Correct CSS layer prefixing (`uno-`) for Vuetify 4 compatibility
 * - Vuetify breakpoints (xs, sm, md, lg, xl, xxl)
 * - Dark mode selector `.v-theme--dark` (so `dark:` utilities work with Vuetify themes)
 * - presetRemToPx (pixel-based design)
 * - presetWind4 (Tailwind 4 utilities)
 * - Vuetify-aware utility rules: bg-v-surface, bg-v-panel, text-v-body, text-v-muted, etc.
 * - transformerDirectives and transformerVariantGroup
 *
 * Override by passing a partial UnoCSS config to the factory.
 */
import { createAntUnoConfig } from '@antcde/component-library/build/uno'

export default createAntUnoConfig()
