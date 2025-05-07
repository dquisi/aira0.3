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
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export const isAuthorized = (allowedRoles: string[]): boolean => {
  const userRole = BaseApiService.role || ''
  return allowedRoles.includes(userRole)
}

router.beforeEach(async (to, from, next) => {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const data = params.get('data')
  
  // Preparar los parámetros para las rutas
  const urlParams = { id, data }
  
  // Solo sincronizar los parámetros si existen
  if (id && data) {
    const needsParamSync = to.query.id !== id || to.query.data !== data
    if (needsParamSync) {
      return next({
        path: to.path,
        query: {
          ...to.query,
          ...urlParams
        }
      })
    }
  }
  
  // Verificar permisos solo para rutas que requieren rol específico
  if (to.meta.roles) {
    try {
      // Intentar cargar los parámetros de autenticación
      if (id && data) {
        await BaseApiService.getParamsFromUrl()
        if (!isAuthorized(to.meta.roles as string[])) {
          // Si no tiene permisos para esta ruta, redirigir a home
          return next('/')
        }
      } else {
        // Si faltan parámetros de autenticación para una ruta protegida
        return next('/')
      }
    } catch (err) {
      return next('/')
    }
  }
  
  next()
})

export default router
