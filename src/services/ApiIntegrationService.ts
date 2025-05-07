import { BaseApiService } from './BaseApiService'
import type { Category } from '@/types'

class ApiIntegrationService extends BaseApiService {
  private static instance: ApiIntegrationService

  async search(criteria: Record<string, any>): Promise<{ answer: Category[]; total: number }> {
    try {
      const filter = [...criteria.filters, { field: 'service', operator: '=', value: 'agent' }]
      const searchParams = {
        skip: criteria.skip || 0,
        limit: criteria.limit || 10,
        filters: filter
      }
      const result = await this.post('/api/v1/api-integration/search', searchParams)
      const response = {
        answer: result.answer || [],
        total: typeof result.count === 'number' ? result.count : result.answer?.length || 0
      }
      return response
    } catch (error) {
      return { answer: [], total: 0 }
    }
  }

  async getAll(): Promise<Category[]> {
    try {
      const result = await this.search({
        skip: 0,
        limit: 1000,
        filters: []
      })
      return result.answer || []
    } catch (error) {
      return []
    }
  }

  static getInstance(): ApiIntegrationService {
    if (!ApiIntegrationService.instance) {
      ApiIntegrationService.instance = new ApiIntegrationService()
    }
    return ApiIntegrationService.instance
  }
}

export const apiIntegrationService = ApiIntegrationService.getInstance()
export default apiIntegrationService
