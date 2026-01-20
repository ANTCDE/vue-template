import AntComponentLibrary from '@antcde/component-library'
import { createApp } from 'vue'
import App from './App.vue'
import { vuetify } from './plugins/vuetify.ts'
import { provideContext } from './plugins/context.ts'

createApp(App)
    .use(vuetify)
    .use(AntComponentLibrary)
    .use(provideContext)
    .mount('#app-1')