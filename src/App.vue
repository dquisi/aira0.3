<script setup lang="ts">
import 'vue-select/dist/vue-select.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n';
import { BaseApiService } from '@/services/BaseApiService';
import { ThemeService } from '@/services/ThemeService';
import { routes } from '@/router'
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const loading = ref(true);
const error = ref('');
const { t, locale } = useI18n();
const selectedTheme = ref('light');
const selectedLocale = ref('es');
const showThemeMenu = ref(false);
const showLangMenu = ref(false);
const filteredRoutes = ref([] as typeof routes);


const changeTheme = (theme: string) => {
  selectedTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
  ThemeService.getInstance().setTheme(theme);
  showThemeMenu.value = false;
};

const changeLocale = (lang: string) => {
  selectedLocale.value = lang;
  locale.value = lang;
  showLangMenu.value = false;
};

const toggleThemeMenu = () => {
  showThemeMenu.value = !showThemeMenu.value;
  showLangMenu.value = false;
};

const toggleLangMenu = () => {
  showLangMenu.value = !showLangMenu.value;
  showThemeMenu.value = false;
};

function getIcon(routeName: string): string {
  const icons: Record<string, string> = {
    Chat: 'bi bi-chat-dots',
    Prompts: 'bi bi-lightning',
    Categories: 'bi bi-folder',
    Events: 'bi bi-calendar-event'
  };
  return icons[routeName] || 'bi bi-circle';
}

onMounted(async () => {
  try {
    await BaseApiService.getParamsFromUrl();
    filteredRoutes.value = routes.filter(route => {
      if (route.meta && (route.meta as any).roles) {
        return (route.meta as any).roles.includes(BaseApiService.role);
      }
      return true;
    });
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    selectedTheme.value = themeParam === 'highContrast' ? 'highContrast' : 'light';
    document.documentElement.setAttribute('data-theme', selectedTheme.value);
    const localeParam = params.get('locale');
    selectedLocale.value = localeParam === 'en' ? 'en' : 'es';
    locale.value = selectedLocale.value;
    if (route.name === undefined) {
      const defaultRoute = filteredRoutes.value.length > 0 ? filteredRoutes.value[0].path : '/chat';
      router.push(defaultRoute);
    }
    loading.value = false;
  } catch (err) {
    error.value = 'Error al cargar la aplicación';
    loading.value = false;
  }
});
</script>

<template>
  <div class="container" :class="{ 'no-header': !BaseApiService.header }">
    <nav v-if="BaseApiService.header" class="main-nav">
      <div class="header-container">
        <!-- Opciones a la izquierda -->
        <div class="controls-container">
          <div class="theme-selector">
            <button @click="toggleThemeMenu" class="icon-btn" :title="t('app.theme.toggle')">
              <i class="bi bi-palette"></i>
            </button>
            <div v-if="showThemeMenu" class="dropdown-menu">
              <button @click="changeTheme('light')" class="dropdown-item" :class="{ active: selectedTheme === 'light' }">
                <i class="bi bi-sun"></i> {{ t('themes.light') }}
              </button>
              <button @click="changeTheme('highContrast')" class="dropdown-item"
                :class="{ active: selectedTheme === 'highContrast' }">
                <i class="bi bi-circle-half"></i> {{ t('themes.highContrast') }}
              </button>
            </div>
          </div>
          <div class="lang-selector">
            <button @click="toggleLangMenu" class="icon-btn">
              <i class="bi bi-translate"></i>
            </button>
            <div v-if="showLangMenu" class="dropdown-menu">
              <button @click="changeLocale('es')" class="dropdown-item" :class="{ active: selectedLocale === 'es' }">
                <i class="bi bi-check-lg" v-if="selectedLocale === 'es'"></i> {{ t('display.language.es') }}
              </button>
              <button @click="changeLocale('en')" class="dropdown-item" :class="{ active: selectedLocale === 'en' }">
                <i class="bi bi-check-lg" v-if="selectedLocale === 'en'"></i> {{ t('display.language.en') }}
              </button>
            </div>
          </div>
        </div>
        <!-- Menú de navegación en el centro -->
        <div class="nav-links">
          <router-link v-for="route in filteredRoutes.slice(1)" :key="route.path" :to="route.path" class="nav-link"
            :title="t('navigation.' + route.name)">
            <i :class="getIcon(route.name)"></i>
            <span class="nav-text">{{ t('navigation.' + route.name) }}</span>
          </router-link>
        </div>

        <!-- Logo y nombre a la derecha -->
        <div class="logo">
          <img src="https://cedia.edu.ec/wp-content/uploads/2022/06/LOGO-MARGEN-8.png" alt="Cedia" />
          <span>AIRA</span>
        </div>
      </div>
    </nav>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-else-if="loading" class="loading">
      <span class="loader"></span>
      Cargando...
    </div>
    <div v-else class="content" :class="{ 'full-height': !BaseApiService.header }">
      <router-view></router-view>
    </div>
  </div>
</template>