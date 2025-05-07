import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import PromptsView from '@/views/PromptsView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import ChatView from '@/views/ChatView.vue'
import EventsView from '@/views/EventsView.vue'
import HomeView from '@/views/HomeView.vue'
import { BaseApiService } from '@/services/BaseApiService'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatView,
    meta: { roles: ['teacher', 'manager', 'student'] }
  },
  {
    path: '/events',
    name: 'Events',
    component: EventsView,
    meta: { roles: ['manager'] }
  },
  {
    path: '/prompts',
    name: 'Prompts',
    component: PromptsView,
    meta: { roles: ['teacher', 'manager'] }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: CategoriesView,
    meta: { roles: ['manager'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export const isAuthorized = (allowedRoles: string[]): boolean => {
  const userRole = BaseApiService.role || ''
  return allowedRoles.includes(userRole)
}

router.beforeEach(async (to, from, next) => {
  // Obtener parámetros de autenticación
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const data = params.get('data')

  // Si hay parámetros de autenticación, sincronizarlos con la URL
  if (id && data) {
    const needsParamSync = to.query.id !== id || to.query.data !== data
    if (needsParamSync) {
      return next({
        path: to.path,
        query: {
          ...to.query,
          id,
          data
        }
      })
    }
  }

  // Solo verificar autorización si la ruta tiene requisitos de roles
  if (to.meta.roles) {
    try {
      // Si existen parámetros de autenticación, verificar permisos
      if (id && data) {
        await BaseApiService.getParamsFromUrl()
        // Si no está autorizado, redirigir al home
        if (!isAuthorized(to.meta.roles as string[])) {
          return next('/')
        }
      } else {
        // Si faltan parámetros de autenticación pero la ruta requiere roles, ir al home
        return next('/')
      }
    } catch (err) {
      return next('/')
    }
  }

  // Si todo está bien o la ruta no requiere roles, continuar
  next()
})

export default router