import { BaseApiService } from './BaseApiService'
import type { Category } from '@/types'

export class CategoryService extends BaseApiService {
  private static instance: CategoryService

  public constructor() {
    super()
  }

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService()
    }
    return CategoryService.instance
  }

  async search(criteria: Record<string, any>): Promise<{ answer: Category[]; total: number }> {
    try {
      const filter = [
        ...criteria.filters,
        { field: 'moodle_user_id', operator: 'in', value: [0, BaseApiService.moodle_user_id] },
        { field: 'active', operator: '=', value: true }
      ]
      const searchParams = {
        skip: criteria.skip || 0,
        limit: criteria.limit || 10,
        filters: filter
      }
      const result = await this.post('/api/v1/category/search', searchParams)
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
      const categories = result.answer || []
      if (BaseApiService.role !== 'Administrador') {
        const blocked = ['Docente', 'Administrador', 'Estudiante']
        return categories.filter((cat) => !blocked.includes(cat.name))
      }

      return result.answer || []
    } catch (error) {
      return []
    }
  }

  async create(category: Partial<Category>): Promise<Category> {
    category.moodle_user_id = BaseApiService.moodle_user_id
    return this.post<Category>('/api/v1/category', category)
  }

  async update(category: Category): Promise<Category> {
    category.moodle_user_id = BaseApiService.moodle_user_id
    return this.put<Category>(`/api/v1/category/${category.id}`, category)
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.delete<void>(`/api/v1/category/${id}`)
    } catch (error) {
      throw error
    }
  }
}

export const categoryService = CategoryService.getInstance()
export default categoryService
