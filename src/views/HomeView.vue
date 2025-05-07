<template>
  <div class="home-container">
    <div class="logo-container">
      <img src="/favicon.ico" alt="AIRA Logo" class="logo-img" />
      <h1 class="app-title">AIRA</h1>
    </div>

    <div class="intro-container">
      <h2>{{ t('home.welcomeTitle') }}</h2>
      <div class="intro-content">
        <p v-html="t('home.welcomeText')"></p>
      </div>
    </div>
    <div class="status-container">
      <div class="status-card" :class="{ 'status-error': !isTokenValid, 'status-success': isTokenValid }">
        <i class="bi" :class="isTokenValid ? 'bi-check-circle' : 'bi-x-circle'"></i>
        <div class="status-info">
          <h3>{{ t('home.tokenStatus') }}</h3>
          <p>{{ isTokenValid ? t('home.tokenValid') : t('home.tokenInvalid') }}</p>
        </div>
      </div>

      <div class="status-card" :class="{ 'status-error': !hasPermissions, 'status-success': hasPermissions }">
        <i class="bi" :class="hasPermissions ? 'bi-shield-check' : 'bi-shield-exclamation'"></i>
        <div class="status-info">
          <h3>{{ t('home.permissionStatus') }}</h3>
          <p>{{ hasPermissions ? t('home.hasPermissions') : t('home.noPermissions') }}</p>
          <p v-if="hasPermissions" class="user-role">{{ t('home.role') }}: {{ userRole }}</p>
        </div>
      </div>
    </div>
    <div class="action-container">
      <button class="btn-primary" @click="$router.push(hasPermissions ? '/chat' : '/home')">
        {{ t('home.startChat') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { BaseApiService } from '@/services/BaseApiService'
import { isAuthorized } from '@/router'

const { t } = useI18n()

const isTokenValid = ref(false)
const hasPermissions = ref(false)
const userRole = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const data = params.get('data')
  isTokenValid.value = !!id && !!data && id !== '' && data !== ''
  if (isTokenValid.value) {
    try {
      await BaseApiService.getParamsFromUrl()
      userRole.value = BaseApiService.role || ''
      hasPermissions.value = isAuthorized(['teacher', 'manager', 'student'])
    } catch (err) {
      console.error('Error verificando permisos:', err)
      hasPermissions.value = false
    }
  }
})

</script>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.logo-img {
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
}

.app-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.status-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.status-card {
  flex: 1;
  min-width: 250px;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: var(--card-background);
  box-shadow: 0 2px 8px var(--card-shadow);
}

.status-card i {
  font-size: 2rem;
}

.status-success {
  border-left: 4px solid var(--success-color);
}

.status-success i {
  color: var(--success-color);
}

.status-error {
  border-left: 4px solid var(--danger-color);
}

.status-error i {
  color: var(--danger-color);
}

.status-info {
  flex: 1;
}

.status-info h3 {
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.user-role {
  margin-top: 0.5rem;
  font-style: italic;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.intro-container {
  background-color: var(--card-background);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--card-shadow);
}

.intro-container h2 {
  margin-bottom: 1rem;
  color: var(--primary-color);
  font-weight: 600;
}

.intro-content {
  line-height: 1.6;
}

.intro-content p {
  margin-bottom: 1rem;
}

.action-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.action-container button {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>