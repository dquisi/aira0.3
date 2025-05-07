import { createI18n } from 'vue-i18n';
import es from '@/locales/es.json';
import en from '@/locales/en.json';

export type Locale = 'es' | 'en';

export const messages: Record<Locale, Record<string, unknown>> = { es, en };

// Obtener idioma preferido o usar español por defecto
const storedLocale = localStorage.getItem('locale') as Locale | null;
const userLocale: Locale = storedLocale && ['es', 'en'].includes(storedLocale) ? storedLocale : 'es';

// Guardar la preferencia del usuario
localStorage.setItem('locale', userLocale);

const i18n = createI18n<Record<string, unknown>, Locale>({
  legacy: false,
  locale: userLocale,
  fallbackLocale: 'es',
  messages,
});

export default i18n;
