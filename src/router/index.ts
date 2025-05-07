
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import PromptsView from '@/views/PromptsView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import ChatView from '@/views/ChatView.vue'
import EventsView from '@/views/EventsView.vue'
import HomeView from '@/views/HomeView.vue'
import { BaseApiService } from '@/services/BaseApiService'
import { showNotification } from '@/utils/notifications'

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
  // Obtener parámetros de URL actual
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const data = params.get('data')
  
  // Si no hay id o data, redirigir a home para mostrar estado de autenticación
  if (!id || !data) {
    if (to.path !== '/') {
      return next('/')
    }
    return next()
  }

  // Preparar los parámetros para la próxima ruta
  const urlParams = { id, data }
  
  // Comprobar si necesitamos añadir los parámetros a la URL
  const needsParamSync = to.query.id !== id || to.query.data !== data
  
  // Si necesitamos sincronizar los parámetros
  if (needsParamSync) {
    return next({
      path: to.path,
      query: {
        ...to.query,
        ...urlParams
      }
    })
  }

  // Verificar permisos solo si la ruta requiere roles específicos
  if (to.meta.roles) {
    try {
      await BaseApiService.getParamsFromUrl()
      
      if (!isAuthorized(to.meta.roles as string[])) {
        showNotification('No tienes permisos para acceder a esta sección', 'error')
        // Si no tiene permisos, redirigir a home
        return next('/')
      }
    } catch (err) {
      console.error('Error verificando permisos:', err)
      return next('/')
    }
  }
  
  next()
})

export default router
