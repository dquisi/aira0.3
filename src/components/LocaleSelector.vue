<template>
  <div class="locale-selector">
    <select v-model="currentLocale" @change="changeLocale" class="locale-select">
      <option value="es">{{ $t('display.language.es') }}</option>
      <option value="en">{{ $t('display.language.en') }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const currentLocale = ref(locale.value);

const changeLocale = () => {
  locale.value = currentLocale.value;
  localStorage.setItem('locale', currentLocale.value);
};

onMounted(() => {
  currentLocale.value = localStorage.getItem('locale') || 'es';
  if (locale.value !== currentLocale.value) {
    locale.value = currentLocale.value;
  }
});
</script>

<style scoped>
.locale-selector {
  display: flex;
  align-items: center;
}

.locale-select {
  padding: 0.5rem;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  background-color: var(--card-background);
  color: var(--text-color);
  cursor: pointer;
  transition: border-color 0.2s;
  font-size: 0.9rem;
}

.locale-select:hover {
  border-color: var(--primary-color);
}

.locale-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 128, 192, 0.2);
}
</style>