
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import PromptsView from '@/views/PromptsView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import ChatView from '@/views/ChatView.vue'
import EventsView from '@/views/EventsView.vue'
import { BaseApiService } from '@/services/BaseApiService'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat',
    name: 'Home'
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
    meta: { roles: ['teacher', 'manager', 'student'] }
  },
  {
    path: '/prompts',
    name: 'Prompts',
    component: PromptsView,
    meta: { roles: ['teacher', 'manager', 'student'] }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: CategoriesView,
    meta: { roles: ['teacher', 'manager', 'student'] }
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
  // Obtener los parámetros originales de la URL
  const originalParams = new URLSearchParams(window.location.search)
  const id = originalParams.get('id') || ''
  const data = originalParams.get('data') || ''

  // Verificar si estamos yendo a la ruta raíz y redirigir a /chat con parámetros
  if (to.path === '/') {
    const query = { ...to.query }
    if (id) query.id = id
    if (data) query.data = data
    return next({ path: '/chat', query })
  }

  // Para cualquier otra ruta, mantener los parámetros id y data si existen
  if ((id || data) && (to.path !== '/chat' || to.query.id !== id || to.query.data !== data)) {
    const query = { ...to.query }
    if (id) query.id = id
    if (data) query.data = data
    if (JSON.stringify(query) !== JSON.stringify(to.query)) {
      return next({ path: to.path, query })
    }
  }

  try {
    if (to.meta.roles) {
      await BaseApiService.getParamsFromUrl()
      if (!isAuthorized(to.meta.roles as string[])) {
        return next('/chat')
      }
    }
    next()
  } catch (error) {
    next('/chat')
  }
})

export default router
