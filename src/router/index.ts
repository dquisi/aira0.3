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
    name: 'Home',
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
  const originalParams = new URLSearchParams(window.location.search)
  const id = originalParams.get('id') || ''
  const data = originalParams.get('data') || ''
  
  // Si la ruta es raíz, redireccionar a /chat
  if (to.path === '/') {
    return next('/chat')
  }
  
  // No forzar los parámetros id y data si no existen
  // pero mantenerlos si están presentes en la URL
  if ((id || data) && (to.query.id !== id || to.query.data !== data)) {
    return next({ path: to.path, query: { id, data } })
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
