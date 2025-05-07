
<template>
  <div class="theme-toggle">
    <button 
      class="theme-button"
      :class="{ active: currentTheme === 'light' }"
      @click="setTheme('light')"
      title="Tema claro"
    >
      <i class="bi bi-sun"></i>
    </button>
    <button 
      class="theme-button"
      :class="{ active: currentTheme === 'highContrast' }"
      @click="setTheme('highContrast')"
      title="Alto contraste"
    >
      <i class="bi bi-circle-half"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { themeService } from '@/services/ThemeService'

const currentTheme = ref(themeService.getTheme())

const setTheme = (theme: string) => {
  themeService.setTheme(theme)
  currentTheme.value = theme
}

onMounted(() => {
  // Inicializar el tema de la aplicación
  const initialTheme = localStorage.getItem('theme') || 'light'
  setTheme(initialTheme)
})

watch(currentTheme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
})
</script>

<style scoped>
.theme-toggle {
  display: flex;
  gap: 0.5rem;
}

.theme-button {
  background-color: var(--secondary-color);
  color: var(--text-color);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  border: 1px solid var(--card-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.theme-button:hover {
  transform: scale(1.1);
  background-color: var(--primary-color);
  color: white;
}

.theme-button.active {
  background-color: var(--primary-color);
  color: white;
}

/* Alto contraste */
:root[data-theme="highContrast"] .theme-button {
  background-color: #333;
  color: white;
  border: 1px solid white;
}

:root[data-theme="highContrast"] .theme-button.active {
  background-color: var(--primary-color);
  color: black;
  border: 2px solid white;
}
</style>
