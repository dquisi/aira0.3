import './assets/main.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import enMessages from './locales/en.json'
import esMessages from './locales/es.json'
import { themeService } from '@/services/ThemeService' // Added import

const userLocale = navigator.language.split('-')[0] === 'en' ? 'en' : 'es'
const i18n = createI18n({
  legacy: false,
  locale: userLocale,
  fallbackLocale: 'es',
  messages: {
    en: enMessages,
    es: esMessages
  }
})
const app = createApp(App)
app.use(router)
app.use(i18n)

themeService.initTheme()

app.mount('#app')
