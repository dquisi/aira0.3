import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import PromptsView from '@/views/PromptsView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import ChatView from '@/views/ChatView.vue'
import EventsView from '@/views/EventsView.vue'
import { BaseApiService } from '@/services/BaseApiService'
import { showNotification } from '@/utils/notifications'

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
  if (!id || !data) {
    showNotification('Token Invalidate !!!', 'error')
  }
  if (to.path === '/') {
    return next({
      path: '/chat',
      query: { id, data }
    })
  }
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
  try {
    if (to.meta.roles) {
      await BaseApiService.getParamsFromUrl()
      if (!isAuthorized(to.meta.roles as string[])) {
        showNotification('Permmissions Invalidate !!!', 'error')
      }
    }
    next()
  } catch (err) {
    next(err)
  }
})

export default router
