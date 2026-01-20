import AntComponentLibrary from '@antcde/component-library'
import { createApp } from 'vue'
import App from './App.vue'
import { provideContext } from './plugins/context.ts'
import { i18n } from './plugins/i18n.ts'
import { vuetify } from './plugins/vuetify.ts'

createApp(App)
    .use(i18n)
    .use(vuetify)
    .use(AntComponentLibrary)
    .use(provideContext)
    .mount('#app-1')
