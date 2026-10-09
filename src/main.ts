/**
 * App entry point. See docs/app-anatomy.md.
 *
 * provideContext opens the connection to ANT-OS (comms, i18n sync, colour mode) and must be
 * installed before mount. Vuetify's styles load as an import side effect; that is fine at any
 * import position because nothing renders until mount().
 */
import { createApp } from 'vue'
import { i18n } from '@/lang/language'
import { provideContext } from '@/plugins/context'
import App from './App.vue'
import vuetify from './plugins/vuetify'

createApp(App)
  .use(i18n)
  .use(vuetify)
  .use(provideContext)
  .mount('#app')
