import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import Icons from 'unplugin-icons/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'
import {viteSingleFile} from 'vite-plugin-singlefile'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
    // base: `/__APP_URL__/`,
    plugins: [
        vue(),
        VueI18nPlugin({
            include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
        }),
        UnoCSS(),
        vuetify(),
        Icons({autoInstall: true,}),
        viteSingleFile({removeViteModuleLoader: true,}),
    ],
})
