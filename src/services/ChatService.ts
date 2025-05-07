import { BaseApiService } from './BaseApiService'
import { Message, StreamEvent, FileAttachment } from '@/types'

class ChatService extends BaseApiService {
  private static instance: ChatService
  private subscribers: ((message: Message) => void)[] = []

  private constructor() {
    super()
  }

  public subscribe(callback: (message: Message) => void) {
    this.subscribers.push(callback)
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback)
    }
  }

  private notifySubscribers(message: Message) {
    this.subscribers.forEach((callback) => callback(message))
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async getConversations(): Promise<any[]> {
    try {
      const apiIntegrationId = BaseApiService.getApiIntegrationIdByRole()
      const url = `/api/v1/middleware/${apiIntegrationId}/v1/conversations`
      const result = await this.get(url, {
        params: { user: BaseApiService.getUserId(), moodle_user_id: BaseApiService.moodle_user_id }
      })
      return result?.data || []
    } catch (error) {
      throw error
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const apiIntegrationId = BaseApiService.getApiIntegrationIdByRole()
      const url = `/api/v1/middleware/${apiIntegrationId}/v1/conversations/${conversationId}`
      const data = { user: BaseApiService.getUserId() }
      const params = { moodle_user_id: BaseApiService.moodle_user_id }
      const result = await this.delete(url, { params, data })
      return !!result
    } catch (error) {
      throw error
    }
  }

  async getConversationMessages(conversationId: string, limit = 20): Promise<Message[]> {
    try {
      const apiIntegrationId = BaseApiService.getApiIntegrationIdByRole()
      const params = {
        moodle_user_id: BaseApiService.moodle_user_id,
        conversation_id: conversationId,
        user: BaseApiService.getUserId(),
        limit: limit
      }
      const url = `/api/v1/middleware/${apiIntegrationId}/v1/messages`
      const result = await this.get(url, { params })
      if (!result?.data) return []
      return result.data
        .flatMap((msg: any) => {
          const items: any[] = []
          if (msg.query) {
            const attachments = Array.isArray(msg.message_files)
              ? msg.message_files.map((file: any) => ({
                  name: file.filename || file.id || 'archivo',
                  type: file.type || 'file',
                  size: file.size || 0,
                  url: file.url || '',
                  isGraphic:
                    file.type === 'image' ||
                    (file.url && file.url.match(/\.(png|jpg|jpeg|gif|webp)$/i)),
                  belongs_to: file.belongs_to || 'user'
                }))
              : []
            items.push({
              content: msg.query,
              sender: 'user',
              time: new Date(msg.created_at * 1000).toISOString(),
              conversation_id: msg.conversation_id,
              message_id: msg.id,
              attachments,
              agent_thoughts: msg.agent_thoughts || [],
              parent_message_id: msg.parent_message_id || '',
              retrieve_resources: msg.retrieve_resources || [],
              status: msg.status || 'normal',
              error: msg.error || null,
              feedback: msg.feedback || null
            })
          }
          if (msg.answer) {
            const attachments = Array.isArray(msg.message_files)
              ? msg.message_files.map((file: any) => ({
                  name: file.filename || file.id || 'archivo',
                  type: file.type || 'file',
                  size: file.size || 0,
                  url: file.url || '',
                  isGraphic:
                    file.type === 'image' ||
                    (file.url && file.url.match(/\.(png|jpg|jpeg|gif|webp)$/i)),
                  belongs_to: file.belongs_to || 'assistant'
                }))
              : []
            items.push({
              content: msg.answer,
              sender: 'assistant',
              time: new Date(msg.created_at * 1000).toISOString(),
              conversation_id: msg.conversation_id,
              message_id: msg.id,
              attachments,
              agent_thoughts: msg.agent_thoughts || [],
              parent_message_id: msg.parent_message_id || '',
              retrieve_resources: msg.retrieve_resources || [],
              status: msg.status || 'normal',
              error: msg.error || null,
              feedback: msg.feedback || null
            })
          }
          return items
        })
        .filter((item) => item != null)
        .reverse()
    } catch (error) {
      throw error
    }
  }

  async sendMessageStream(
    message: string,
    inputsParams: Record<string, any> = {},
    files: any[] = [],
    conversation_id = ''
  ): Promise<{ lastMessage: string; messageId: string; conversationId: string }> {
    const apiIntegrationId =
      inputsParams.api_integration_id || BaseApiService.getApiIntegrationIdByRole()
    const payload = {
      inputs: {
        moodle_course_id: String(BaseApiService.moodle_course_id),
        moodle_user_id: String(BaseApiService.moodle_user_id)
      },
      query: message,
      response_mode: 'streaming',
      conversation_id,
      user: BaseApiService.getUserId(),
      files
    }
    const url = `/api/v1/middleware/${apiIntegrationId}/v1/chat-messages?stream=true&moodle_user_id=${BaseApiService.moodle_user_id}`
    try {
      const response = await this.postStream(url, payload)
      const reader = response.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let lastMessage = ''
      let messageId = ''
      let conversationId = ''
      let streamingMessage: Message = {
        content: '',
        sender: 'assistant',
        time: new Date().toISOString(),
        attachments: []
      }
      let reading = true
      while (reading) {
        try {
          const { value, done } = await reader.read()
          if (done) {
            reading = false
            break
          }
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const raw of lines) {
            if (!raw.startsWith('data: ')) continue
            const d = JSON.parse(raw.slice(6)) as StreamEvent
            if (d.event === 'message_end') {
              messageId = d.message_id || messageId
              conversationId = d.conversation_id || conversationId
              streamingMessage.message_id = messageId
              streamingMessage.conversation_id = conversationId
              if (lastMessage.includes('___')) {
                const parts = lastMessage.split('___')
                if (parts.length > 1) {
                  lastMessage = parts[parts.length - 1].trim()
                }
              }
              this.notifySubscribers({ action: 'remove_all_temp' })
            } else if (d.event === 'agent_thought' && d.tool) {
              const specificTools = {
                Generator_Graphics: {
                  message: 'Generando gráficos',
                  icon: 'bi-bar-chart-line',
                  time: 20,
                  type: 'graphics'
                },
                generate_text_activities: {
                  message: 'Generando actividades',
                  icon: 'bi-list-check',
                  time: 40,
                  type: 'document'
                },
                Generate_content_resources: {
                  message: 'Generando recursos',
                  icon: 'bi-file-earmark-text',
                  time: 40,
                  type: 'document'
                }
              }
              
              if (d.tool in specificTools) {
                const toolInfo = specificTools[d.tool]
                // Crear mensaje temporal con ID único para poder eliminarlo después
                const tempId = 'temp_' + Date.now()
                const tempStreamingMessage = {
                  content: `<div class="processing-visual ${toolInfo.type}">
                    <i class="bi ${toolInfo.icon}"></i>
                    <div class="processing-info">
                      <div class="processing-title">${toolInfo.message}</div>
                      <div class="processing-time">Este proceso tardará ${toolInfo.time} segundos aproximadamente</div>
                    </div>
                  </div>`,
                  sender: 'assistant',
                  time: new Date().toISOString(),
                  isTemporary: true,
                  isHtml: true,
                  tempId: tempId
                }
                this.notifySubscribers({ ...tempStreamingMessage })
                setTimeout(() => {
                  this.notifySubscribers({
                    action: 'remove_temp',
                    tempId: tempId
                  })
                }, 8000)
              }
            } else if (d.event === 'agent_message' && d.answer) {
              if (streamingMessage.content) {
                streamingMessage.content += d.answer
              } else {
                streamingMessage.content = d.answer
              }
              this.notifySubscribers({ ...streamingMessage })
              lastMessage = streamingMessage.content
            } else if (d.event === 'message_file' && d.url) {
              if (!streamingMessage.attachments) {
                streamingMessage.attachments = []
              }
              let fileName = d.id || 'archivo'
              if (d.url) {
                const urlParts = d.url.split('/')
                const lastPart = urlParts[urlParts.length - 1]
                if (lastPart && lastPart.length > 0 && !lastPart.startsWith('?')) {
                  fileName = decodeURIComponent(lastPart.split('?')[0])
                }
              }
              const fileAttachment = {
                name: fileName,
                type: d.type || 'application/octet-stream',
                size: 0,
                url: d.url,
                isGraphic: d.type === 'image' || d.url.match(/\.(png|jpg|jpeg|gif|webp)$/i),
                belongs_to: d.belongs_to || 'assistant'
              }
              const isDuplicate = streamingMessage.attachments.some(
                (att: any) => att.url === fileAttachment.url
              )
              if (!isDuplicate) {
                streamingMessage.attachments.push(fileAttachment)
                this.notifySubscribers({ ...streamingMessage })
              }
            } else if (d.event === 'error') {
              throw 'Error al procesar la solicitud intente nuevamente o cambie de pregunta'
            }
          }
        } catch (error) {
          reading = false
          throw error
        }
      }
      return { lastMessage, messageId, conversationId }
    } catch (error) {
      throw error
    }
  }

  async getSuggestedQuestions(messageId: string, directApiId?: string = null): Promise<string[]> {
    try {
      const userId = BaseApiService.getUserId()
      const apiIntegrationId = directApiId || BaseApiService.getApiIntegrationIdByRole()
      const url = `/api/v1/middleware/${apiIntegrationId}/v1/messages/${messageId}/suggested`
      const result = await this.get(url, {
        params: { user: userId, moodle_user_id: BaseApiService.moodle_user_id },
        data: { user: userId }
      })
      return result?.data || []
    } catch (error) {
      throw error
    }
  }

  async uploadFile(file: File): Promise<any> {
    try {
      const formData = new FormData()
      formData.append('user', BaseApiService.getUserId())
      formData.append('file', file)
      const response = await this.post(
        `/api/v1/middleware/5/v1/files/upload?moodle_user_id=${BaseApiService.moodle_user_id}`,
        formData
      )
      if (response.id) {
        return {
          upload_file_id: response.id,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          transfer_method: 'local_file'
        }
      }
    } catch (error) {
      throw error
    }
  }

  async uploadFiles(attachments: FileAttachment[]): Promise<any[]> {
    const files = []
    try {
      for (const attachment of attachments) {
        if (attachment.file) {
          const fileData = await this.uploadFile(attachment.file)
          if (fileData) {
            fileData.filename = attachment.name || attachment.file.name
            files.push(fileData)
          }
        }
      }
    } catch (error) {
      throw error
    }
    return files
  }

  async convertSpeechToText(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      const audioTextInput = JSON.stringify({
        api_integration_id: 7,
        moodle_user_id: BaseApiService.getUserId()
      })
      formData.append('audio_text_input', audioTextInput)
      const response = await this.post('/api/v1/ai/speech-to-text', formData)
      return response.answer || ''
    } catch (error) {
      throw error
    }
  }

  async convertTextToSpeech(text: string): Promise<Blob | null> {
    try {
      const data = {
        api_integration_id: 7,
        moodle_user_id: BaseApiService.getUserId(),
        input: text.substring(0, 2000),
        voice: 'alloy',
        response_format: 'mp3',
        speed: 1
      }
      const response = await this.post('/api/v1/ai/text-to-speech', data, {
        responseType: 'blob'
      })
      return response || null
    } catch (error) {
      throw error
    }
  }

  // Course and resource methods removed
}

export default ChatService
