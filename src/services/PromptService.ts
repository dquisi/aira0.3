import { BaseApiService } from './BaseApiService'
import type { Prompt } from '@/types'

class PromptService extends BaseApiService {
  private static instance: PromptService

  private constructor() {
    super()
  }

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService()
    }
    return PromptService.instance
  }

  async search(criteria: Record<string, any>): Promise<{ answer: Prompt[]; total: number }> {
    try {
      const filters = criteria.filters || []
      const filter = [
        ...filters,
        { field: 'moodle_course_id', operator: '=', value: BaseApiService.moodle_course_id },
        { field: 'moodle_user_id', operator: '=', value: BaseApiService.moodle_user_id }
      ]

      const searchParams = {
        skip: parseInt(String(criteria.skip)) || 0,
        limit: parseInt(String(criteria.limit)) || 10,
        filters: filter,
        sort: [{ field: 'created_at', direction: 'desc' }]
      }

      const result = await this.post('/api/v1/prompt/search', searchParams)

      return {
        answer: Array.isArray(result.answer) ? result.answer : [],
        total: typeof result.total === 'number' ? result.total : (result.answer?.length || 0)
      }
    } catch (error) {
      return { answer: [], total: 0 }
    }
  }

  async create(prompt: Partial<Prompt>): Promise<Prompt> {
    try {
      const promptData = {
        ...prompt,
        moodle_course_id: BaseApiService.moodle_course_id,
        moodle_user_id: BaseApiService.moodle_user_id
      }
      const result = await this.post('/api/v1/prompt', promptData)
      return result
    } catch (error) {
      throw error
    }
  }

  async update(prompt: Prompt): Promise<Prompt> {
    try {
      const promptData = {
        ...prompt,
        moodle_course_id: BaseApiService.moodle_course_id,
        moodle_user_id: BaseApiService.moodle_user_id
      }
      const result = await this.put(`/api/v1/prompt/${prompt.id}`, promptData)
      return result
    } catch (error) {
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.delete(`/api/v1/prompt/${id}`)
    } catch (error) {
      throw error
    }
  }

  async toggleFavorite(prompt: Prompt): Promise<Prompt> {
    try {
      let updated = { ...prompt, is_favorite: !prompt.is_favorite }
      const result = await this.update(updated)
      return result
    } catch (error) {
      throw error
    }
  }

  async incrementUsageCount(id: string): Promise<void> {
    try {
      await this.post(`/api/v1/prompt/increment-usage-count?id=${id}`, {
        moodle_course_id: BaseApiService.moodle_course_id,
        moodle_user_id: BaseApiService.moodle_user_id
      })
    } catch (error) {
      throw error
    }
  }

  copyToClipboard(prompt: Prompt): boolean {
    try {
      const essentialData = {
        name: prompt.name,
        value: prompt.value,
        category_id: prompt.category_id
      }
      const promptJson = JSON.stringify(essentialData, null, 2)
      navigator.clipboard.writeText(promptJson)
      return true
    } catch (error) {
      return false
    }
  }

  async importFromFile(file: File): Promise<Prompt[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string
          const prompts = JSON.parse(content) as any[]
          const importedPrompts: Prompt[] = []
          for (const prompt of prompts) {
            if (!prompt.name || !prompt.value) {
              continue
            }
            const newPrompt = await this.create({
              name: prompt.name,
              value: prompt.value,
              is_favorite: false, // Por defecto no es favorito
              category_id: prompt.category_id || null,
              moodle_course_id: BaseApiService.moodle_course_id,
              moodle_user_id: BaseApiService.moodle_user_id
            })
            importedPrompts.push(newPrompt)
          }
          resolve(importedPrompts)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'))
      }
      reader.readAsText(file)
    })
  }

  async getAll(): Promise<Prompt[]> {
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

  async importFromText(jsonText: string): Promise<Prompt[]> {
    try {
      const cleanJson = jsonText.trim()
      let parsedData
      try {
        parsedData = JSON.parse(cleanJson)
      } catch (error) {
        throw new Error('El texto no es un JSON válido. Por favor, revisa el formato.')
      }
      const isSinglePrompt =
        !Array.isArray(parsedData) &&
        typeof parsedData === 'object' &&
        parsedData !== null &&
        'name' in parsedData &&
        'value' in parsedData
      return this.importPrompts(parsedData, isSinglePrompt)
    } catch (error) {
      throw error
    }
  }

  async importPrompts(data: any, isSingle: boolean = false): Promise<Prompt[]> {
    try {
      if (!data) {
        throw new Error('No se proporcionaron datos para importar')
      }
      let promptsToImport = isSingle ? [data] : data
      if (!Array.isArray(promptsToImport)) {
        throw new Error('El formato de los datos no es válido para importar prompts')
      }
      const importedPrompts: Prompt[] = []
      let importErrors = 0
      for (const prompt of promptsToImport) {
        if (!prompt.name || !prompt.value) {
          importErrors++
          continue
        }
        try {
          const newPrompt = await this.create({
            name: prompt.name,
            value: prompt.value,
            is_favorite: false, // Por defecto no es favorito
            category_id: prompt.category_id || null,
            moodle_course_id: BaseApiService.moodle_course_id,
            moodle_user_id: BaseApiService.moodle_user_id
          })
          importedPrompts.push(newPrompt)
        } catch (promptError) {
          console.error('Error al importar un prompt específico:', promptError)
          importErrors++
        }
      }
      if (importErrors > 0 && importedPrompts.length === 0) {
        throw new Error(`No se pudo importar ningún prompt. Verifica el formato.`)
      } else if (importErrors > 0) {
        console.warn(
          `Se importaron ${importedPrompts.length} prompts, pero ${importErrors} fallaron.`
        )
      }
      return importedPrompts
    } catch (error) {
      throw error
    }
  }
  exportToFile(prompts: Prompt[]): void {
    try {
      if (!prompts || prompts.length === 0) {
        return
      }
      const essentialData = prompts.map((p) => ({
        name: p.name,
        value: p.value,
        category_id: p.category_id
      }))
      const dataStr = JSON.stringify(essentialData, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompts_export_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Error al exportar prompts:', error)
    }
  }

  async generatePrompt(instructions: string): Promise<string> {
    try {
      const apiUrl = `/api/v1/middleware/5/v1/workflows/run?moodle_user_id=${BaseApiService.moodle_user_id}`
      const payload = {
        inputs: {
          moodle_user_id: BaseApiService.moodle_user_id,
          prompt_query: instructions,
          workflow_function: 'improvePrompts'
        },
        response_mode: 'blocking',
        user: `${BaseApiService.getUserId()}`
      }
      const response = await this.post(apiUrl, payload)
      if (!response || !response.data || !response.data.outputs || !response.data.outputs.result) {
        throw new Error('Respuesta inválida del servidor')
      }
      const resultString = JSON.parse(response.data.outputs.result)
      return resultString.result.replace(/\"/g, '')
    } catch (error) {
      throw error
    }
  }

  async uploadSyllabusFileToServer(file: File): Promise<any> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const validExtensions = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'csv', 'pptx', 'ppt']
      if (!(fileExtension && validExtensions.includes(fileExtension))) {
        throw new Error(
          'Formato de archivo no admitido. Formatos admitidos: PDF, XLSX, XLS, DOCX, CSV, PPTX, PPT'
        )
      }
      const formData = new FormData()
      formData.append('user', BaseApiService.getUserId())
      formData.append('file', file)
      const response = await this.post(
        `/api/v1/middleware/5/v1/files/upload?moodle_user_id=${BaseApiService.moodle_user_id}`,
        formData
      )
      if (!response || !response.id) {
        throw new Error('No se pudo obtener el ID del archivo subido')
      }
      return response
    } catch (error) {
      throw error
    }
  }

  async generateSyllabus(
    config: {
      periods_count: number
      days_per_period: number
      init_date: string
    },
    file?: File
  ): Promise<string> {
    try {
      const apiUrl = `/api/v1/middleware/5/v1/workflows/run?moodle_user_id=${BaseApiService.moodle_user_id}`
      const payload = {
        inputs: {
          moodle_course_id: BaseApiService.moodle_course_id,
          prompt_query: 'Genera el Silabo',
          moodle_ammount_periods: config.periods_count,
          moodle_days_per_period: config.days_per_period,
          moodle_init_date: config.init_date,
          workflow_function: 'planification'
        },
        response_mode: 'blocking',
        user: BaseApiService.getUserId()
      }
      if (file) {
        const result = await this.uploadSyllabusFileToServer(file)
        const documentSummary = {
          transfer_method: 'local_file',
          upload_file_id: result.id,
          type: 'document'
        }
        payload.inputs.moodle_document_summary = documentSummary
      }
      const response = await this.post(apiUrl, payload)
      if (!response || !response.data || !response.data.outputs || !response.data.outputs.result) {
        throw new Error('Respuesta inválida del servidor')
      }
      const resultString = JSON.parse(response.data.outputs.result)
      return resultString.result.replace(/\"/g, '')
    } catch (error) {
      throw error
    }
  }

  // Método para extraer parámetros de un prompt
  extractParameters(promptText: string): PromptParameter[] {
    if (!promptText) return []
    const regex = /\[(.*?)\]/g
    const params: PromptParameter[] = []
    const uniqueParams = new Set<string>()
    let match
    while ((match = regex.exec(promptText)) !== null) {
      const paramName = match[1].trim()
      if (paramName && !uniqueParams.has(paramName)) {
        uniqueParams.add(paramName)
        params.push({
          name: paramName,
          value: ''
        })
      }
    }

    return params
  }
}

export const promptService = PromptService.getInstance()
export default promptService
