import { BaseApiService } from './BaseApiService'
import { handleError } from '@/utils/notifications'
import type { Event } from '@/types'
import { isConstructorDeclaration } from 'typescript'

class EventService extends BaseApiService {
  private static instance: EventService

  private constructor() {
    super()
  }

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService()
    }
    return EventService.instance
  }

  async getAll(): Promise<Event[]> {
    try {
      const searchParams = {
        skip: 0,
        limit: 100,
        filters: [{ field: 'moodle_user_id', operator: '=', value: BaseApiService.moodle_user_id }]
      }
      const result = await this.post('/api/v1/event/search', searchParams)
      return result.answer || []
    } catch (error) {
      handleError(error, 'obtener eventos')
      return []
    }
  }

  async create(event: Partial<Event>): Promise<Event> {
    try {
      const eventData = {
        ...event,
        moodle_user_id: BaseApiService.moodle_user_id
      }
      return await this.post('/api/v1/event', eventData)
    } catch (error) {
      throw error
    }
  }

  async update(event: Partial<Event>): Promise<Event> {
    try {
      const eventData = {
        ...event,
        moodle_user_id: BaseApiService.moodle_user_id
      }
      return await this.put(`/api/v1/event/${event.id}`, eventData)
    } catch (error) {
      throw error
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.delete(`/api/v1/event/${id}`)
    } catch (error) {
      throw error
    }
  }
}

export const eventService = EventService.getInstance()
