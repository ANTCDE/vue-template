import AntComponentLibrary from '@antcde/component-library'
import { createApp } from 'vue'
import App from './App.vue'
import { vuetify } from './plugins/vuetify.ts'
import { provideContext } from './plugins/context.ts'

createApp(App)
    .use(provideContext)
    .use(vuetify)
    .use(AntComponentLibrary)
    .mount('#app-1')