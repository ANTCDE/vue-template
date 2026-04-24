/**
 * Vuetify configuration — uses the shared ANT factory from @antcde/component-library.
 *
 * The factory provides:
 * - ANT design system colors (light + dark themes with auto dark mode support)
 * - Component defaults: VCard (rounded xl, flat, border), VBtn (rounded xl, text-none),
 *   VAppBar/VToolbar (flat), VNavigationDrawer (no elevation), etc.
 * - Icon setup using @iconify/vue
 * - Side-effect imports: vuetify/styles and virtual:uno.css
 *
 * Override defaults, colors, or add lab components by passing options:
 *   createAntVuetify({ defaults: { VMenu: { ... } }, components: { VDateInput } })
 */
import { createAntVuetify } from '@antcde/component-library/build/vuetify'

export default createAntVuetify()
