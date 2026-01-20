import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'
import {viteSingleFile} from 'vite-plugin-singlefile'
import vuetify from 'vite-plugin-vuetify'
import presetWind4 from 'unocss/preset-wind4'

export default defineConfig({
    // base: `/__APP_URL__/`,
    plugins: [
        vue(),
        UnoCSS({presets: [presetWind4()]}),
        vuetify(),
        Icons({autoInstall: true,}),
        viteSingleFile({removeViteModuleLoader: true,}),
    ],
})
