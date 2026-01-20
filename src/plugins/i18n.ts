import {createI18n} from 'vue-i18n'
import de from '../locales/de.json'
import en from '../locales/en.json'
import nl from '../locales/nl.json'

export const i18n = createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: {de, en, nl},
})
