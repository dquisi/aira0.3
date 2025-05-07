import axios, { AxiosRequestConfig, AxiosError } from 'axios'

export class BaseApiService {
  private static id: string | null = null
  private static token: string = ''
  public static role: string = ''
  public static serviceUrl: string = ''
  public static moodle_course_id: number = 0
  public static moodle_user_id: number = 0
  public static instance_id: number | null = null
  public static header: boolean = false

  public static getApiIntegrationIdByRole(customId?: number): number {
    if (customId) return customId
    let apiIntegrationId = 1
    const role = this.role
    if (role === 'teacher') {
      apiIntegrationId = 2
    } else if (role === 'student') {
      apiIntegrationId = 4
    }
    return apiIntegrationId
  }

  public static getUserId(): string {
    return `${this.instance_id}${this.moodle_user_id}`
  }

  private static initPromise: Promise<void>
  constructor() {
    if (!BaseApiService.initPromise) {
      BaseApiService.initPromise = BaseApiService.getParamsFromUrl()
    }
  }

  static async getParamsFromUrl(): Promise<void> {
    const params = new URLSearchParams(window.location.search)
    BaseApiService.id = params.get('id') || ''
    const encryptedData = params.get('data') || ''
    if (encryptedData) {
      try {
        const decodedData = await this.verifyAndDecodeJwt(encryptedData, BaseApiService.id)
        BaseApiService.token = decodedData.token || ''
        BaseApiService.role = decodedData.role || ''
        BaseApiService.serviceUrl = decodedData.url || window.location.origin
        BaseApiService.moodle_course_id = Number(decodedData.moodle_course_id) || 0
        BaseApiService.moodle_user_id = Number(decodedData.moodle_user_id) || 0
        BaseApiService.instance_id = decodedData.instance_id || 0
        BaseApiService.header = decodedData.header !== false
      } catch (error) {
        console.error('Error decodificando datos:', error)
      }
    }
  }

  static async verifyAndDecodeJwt(jwt: string, id: string): Promise<any> {
    const parts = jwt.split('.')
    if (parts.length !== 3) throw new Error('Formato de token inválido')
    const [headerB64, payloadB64, signatureB64] = parts
    const signingInput = `${headerB64}.${payloadB64}`
    const base64UrlToUint8Array = (str: string): Uint8Array => {
      const base64 =
        str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }
    const encoder = new TextEncoder()
    const signatureBytes = base64UrlToUint8Array(signatureB64)
    const signingInputBytes = encoder.encode(signingInput)
    const keyBytes = encoder.encode(id)
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const valid = await window.crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      signingInputBytes
    )
    if (!valid) throw new Error('Firma del token inválida')
    const payloadBase64 =
      payloadB64.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (payloadB64.length % 4)) % 4)
    const payloadJson = atob(payloadBase64)
    return JSON.parse(payloadJson)
  }

  protected async buildRequestConfig(
    path: string,
    config?: AxiosRequestConfig
  ): Promise<{ url: string; config: AxiosRequestConfig }> {
    await BaseApiService.initPromise
    const serviceUrl = BaseApiService.serviceUrl || window.location.origin
    const url = `${serviceUrl}${path}`
    const headers: Record<string, any> = { ...config?.headers }
    if (!config?.headers) {
      headers.Authorization = `Bearer ${BaseApiService.token}`
    }
    return { url, config: { ...config, headers } }
  }

  protected async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const { url, config: finalConfig } = await this.buildRequestConfig(path, config)
      const response = await axios.get(url, finalConfig)
      return response.data
    } catch (error) {
      const errorData = (error as AxiosError).response?.data
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        throw new Error(errorData.detail as string)
      }
      throw error
    }
  }

  protected async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const { url, config: finalConfig } = await this.buildRequestConfig(path, config)
      const response = await axios.post(url, data, finalConfig)
      return response.data
    } catch (error) {
      const errorData = (error as AxiosError).response?.data
      console.error(`Error en petición POST a ${path}:`, errorData)
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        throw new Error(errorData.detail as string)
      }
      throw error
    }
  }
  protected async postStream(path: string, data?: any): Promise<Response> {
    const { url } = await this.buildRequestConfig(path)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BaseApiService.token}`
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  }

  protected async put<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const { url, config: finalConfig } = await this.buildRequestConfig(path, config)
      const response = await axios.put(url, data, finalConfig)
      return response.data
    } catch (error) {
      const errorData = (error as AxiosError).response?.data
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        throw new Error(errorData.detail as string)
      }
      throw error
    }
  }

  protected async delete<T>(
    path: string,
    config?: AxiosRequestConfig & { data?: any }
  ): Promise<T> {
    try {
      const { url, config: finalConfig } = await this.buildRequestConfig(path, config)
      const response = await axios.delete(url, finalConfig)
      if (response.data) return response.data
      return response
    } catch (error) {
      const errorData = (error as AxiosError).response?.data
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        throw new Error(errorData.detail as string)
      }
      throw error
    }
  }
}
