/**
 * App entry point.
 *
 * Plugin order:
 * 1. vuetify — must be first to trigger CSS side-effect imports before component rendering
 * 2. i18n — sets up vue-i18n for $t() translations
 * 3. provideContext — initializes ANT-OS comms (toolbar, notepad, signals, etc.)
 */
import vuetify from './plugins/vuetify'
import { createApp } from 'vue'
import { i18n } from '@/lang/language'
import { provideContext } from '@/plugins/context'
import App from './App.vue'

createApp(App)
  .use(i18n)
  .use(vuetify)
  .use(provideContext)
  .mount('#app')
