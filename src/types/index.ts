export interface Prompt {
  id: string
  name: string
  value: string
  is_favorite: boolean
  active: boolean
  moodle_user_id: number
  course_id: number
  category_id: number
  usage_count: number
  course: any
  category: any
  created_at: string
  instance_id: number
  general: boolean

}

export interface Category {
  id: number
  name: string
  color: string
  description: string
  active: boolean
  instance_id: number | null
  api_integration_id: number
  moodle_user_id: number
}

export interface FileAttachment {
  name: string
  type: string
  size: number
  content?: string // Base64 contenido del archivo
  url?: string // URL para mostrar/descargar
}

export interface Message {
  content: string
  sender: 'user' | 'assistant'
  time: string
  conversation_id?: string
  message_id?: string
  attachments?: FileAttachment[]
  isTemporary?: boolean
  tempId?: string
  action?: 'remove_temp' | 'remove_all_temp'
}

export interface Conversation {
  id: string
  name: string
  inputs?: Record<string, any>
  status: string
  created_at: number
  updated_at: number
  introduction?: string
}

export interface ChatConfig {
  url: string
  moodle_course_id: number
  moodle_user_id: string
  role: string
  api_integration_id?: string
}

export interface Event {
  id: number
  name: string
  prompt_id: string
  prompt: any
  cron: string
  next_execution: string
  end_date?: string
  status: string
  description?: string
  color?: string
}

export interface PromptParameter {
  name: string
  value: string
}

export interface StreamEvent {
  event: string // 'message', 'message_end', 'error', 'agent_message', 'agent_thought'
  task_id?: string
  message_id?: string
  conversation_id?: string
  answer?: string
  message?: string // Para mensajes de error
  created_at?: number
  status?: number // Código de estado HTTP en errores
  code?: string // Código de error
  id?: string // ID del evento
  position?: number // Posición para agent_thought
  thought?: string // Contenido del pensamiento del agente
  observation?: string // Observación del agente (string JSON)
  tool?: string // Herramienta utilizada por el agente
  tool_input?: string // Entrada de la herramienta
  tool_labels?: any // Etiquetas de herramientas
  metadata?: any // Metadatos adicionales (para message_end)
  message_files?: any[] // Archivos adjuntos al mensaje
}

export interface AgentObservation {
  [key: string]: string // Formato clave-valor para cualquier tipo de observación
}

export interface ObservationFileData {
  file: ObservationFile[]
}

export interface ObservationFile {
  dify_model_identity?: string
  id?: string | null
  tenant_id?: string
  type?: string
  transfer_method?: string
  remote_url?: string | null
  related_id?: string
  filename?: string
  extension?: string
  mime_type?: string
  size?: number
  url?: string
  tool_file_id?: string
  is_chart?: boolean
}

export interface ChatMessage {
  text: string
  isUser: boolean
  attachments?: FileAttachment[]
}

export interface PromptParameter {
  name: string
  value: string
}

export interface Event {
  id: number
  name: string
  prompt_id: number
  prompt?: {
    id: number
    name: string
    value: string
  }
  next_execution: string
  cron: string
  end_date?: string
  status: 'pending' | 'running' | 'scheduled' | 'completed' | 'failed'
  color?: string
  moodle_user_id: number
  active?: boolean
  inputs?: Record<string, any>
}

export interface SpeechOptions {
  model: string
  voice: string
  input: string
  response_format: string
  instructions?: string
}

export interface ApiIntegration {
  id: string
  name: string
  description?: string
  type?: string
  active?: boolean
}
