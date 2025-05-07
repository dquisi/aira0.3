<template>
  <div class="chat-with-sidebar">
    <!-- Contenido principal del chat -->
    <div class="chat-main">
      <div class="container">
        <div class="header">
          <!-- Solo mostrar botón de historial en móvil -->
          <button class="btn-icon d-md-none" @click="toggleHistoryPanel">
            <i class="bi bi-clock-history"></i>
          </button>
          <button v-if="!isManager" class="btn-icon d-md-none" @click="toggleConfigPanel">
            <i class="bi bi-gear"></i>
          </button>
        </div>
      </div>
      <!-- Panel móvil que aparece como overlay -->
      <div v-if="showHistory" class="history-overlay" @click.self="toggleHistoryPanel">
        <div class="history-panel">
          <div class="history-panel-header">
            <h3>{{ $t('chats.history.title') }}</h3>
            <button class="btn-icon" @click="toggleHistoryPanel">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <ChatHistory :selected-id="currentConversationId" @select="selectConversation" @new="newChat" />
        </div>
      </div>
      <div v-if="showConfig" class="config-popup config-sidebar">
        <div class="config-popup-header">
          <h3>{{ $t('chats.config.title') }}</h3>
          <button class="btn-icon" @click="toggleConfigPanel">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="config-selectors" v-if="showConfigOptions && !isManager">
          <div class="selector-group">
            <label>{{ $t('chats.config.course') }}</label>
            <select v-model="selectedCourseId" @change="loadResources" class="form-control">
              <option value="">{{ $t('chats.config.allCourses') }}</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
          </div>
          <div class="selector-group">
            <label>{{ $t('chats.config.resource') }}</label>
            <select v-model="selectedResourceId" class="form-control" :disabled="!resources.length">
              <option value="">{{ $t('chats.config.allResources') }}</option>
              <option v-for="resource in resources" :key="resource.id" :value="resource.id">
                {{ resource.name }}
              </option>
            </select>
          </div>
          <button class="btn-primary btn-config-apply" @click="applyConfigAndClose">
            {{ $t('chats.config.apply') }}
          </button>
        </div>
        <div v-else class="config-not-available">
          <p>{{ $t('chats.config.notAvailable') }}</p>
          <button class="btn-primary" @click="toggleConfigPanel">
            {{ $t('chats.config.close') }}
          </button>
        </div>
      </div>
      <div class="messages-container" ref="messagesContainer">
        <div v-if="!messages.length" class="welcome-message">
          <h2>{{ $t('chats.welcome.title') }}</h2>
          <p>{{ $t('chats.welcome.message') }}</p>
        </div>
        <div v-for="(message, index) in messages" :key="index" class="message" :class="{
          'user-message': message.sender === 'user',
          'assistant-message': message.sender === 'assistant',
          'temp-message': message.isTemporary
        }">
          <div class="message-avatar">
            <i :class="message.sender === 'user' ? 'bi bi-person' : 'bi bi-robot'"></i>
          </div>
          <div class="message-content" :class="{
            'user-content': message.sender === 'user',
            'assistant-content': message.sender === 'assistant',
            'temp-content': message.isTemporary
          }">
            <div class="message-actions" v-if="message.sender === 'assistant' && !message.isTemporary">
              <button class="audio-btn" @click="playMessageAudio(message.content, message.message_id)"
                :disabled="audioState.status === 'playing' || audioState.status === 'loading'"
                :class="{ 'playing': audioState.status === 'playing' && audioState.currentMessageId === message.message_id }"
                title="Escuchar mensaje">
                <i
                  :class="audioState.status === 'playing' && audioState.currentMessageId === message.message_id ? 'bi bi-pause-fill' : 'bi bi-volume-up'"></i>
                <span v-if="audioState.status === 'loading' && audioState.currentMessageId === message.message_id"
                  class="loading-indicator"></span>
              </button>
              <button class="copy-btn" @click="copyToClipboard(message.content)" title="Copiar al portapapeles">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
            <div v-if="message.sender === 'assistant'" class="markdown-content">
              <!-- Procesar contenido markdown -->
              <div v-if="message.isTemporary" class="processing-message">
                <div v-html="renderMarkdown(message.content)"></div>
                <div class="processing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div v-else v-html="renderMarkdown(message.content)"></div>

              <!-- Mostrar adjuntos inmediatamente después del contenido -->
              <div v-if="message.attachments && message.attachments.length" class="attachments">
                <div v-for="(attachment, i) in message.attachments" :key="i" class="file-preview assistant-attachment"
                  @click="openAttachment(attachment)">
                  <div class="file-preview-icon">
                    <img v-if="isImageType(attachment)" :src="attachment.url" :alt="attachment.name"
                      class="preview-thumbnail no-zoom" />
                    <i v-else :class="getFileIconClass(attachment)"></i>
                  </div>
                  <div class="file-preview-info">
                    <div class="file-name-container">
                      <span class="file-name">{{ attachment.name }}</span>
                    </div>
                    <div class="file-actions">
                      <button v-if="isImageType(attachment)" class="file-preview-action"
                        @click.stop="openAttachment(attachment)" title="Ampliar">
                        <i class="bi bi-arrows-fullscreen"></i>
                      </button>
                      <button class="file-preview-action" @click.stop="downloadAttachment(attachment)" title="Descargar">
                        <i class="bi bi-download"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="user-message-content">
              {{ message.content }}

              <!-- Adjuntos del usuario -->
              <div v-if="message.attachments && message.attachments.length" class="attachments">
                <div v-for="(attachment, i) in message.attachments" :key="i" class="file-preview user-attachment">
                  <div class="file-preview-icon">
                    <i :class="getFileIconClass(attachment)"></i>
                  </div>
                  <div class="file-preview-info">
                    <div class="file-name-container">
                      <span class="file-name">{{ attachment.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="message-time">{{ formatTime(message.time) }}</div>
          </div>
        </div>
        <div v-if="isLoading" class="message assistant-message loading-message">
          <div class="message-avatar">
            <i class="bi bi-robot"></i>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="suggestions.length && !isLoading" class="suggestions">
        <button v-for="(suggestion, index) in suggestions" :key="index" class="suggestion-chip"
          @click="sendMessage(suggestion)">
          <span class="suggestion-text">{{ suggestion }}</span>
        </button>
      </div>
      <div class="input-container">
        <div class="input-wrapper">
          <button class="btn-icon" @click="toggleRecording" :class="{ 'recording': isRecording }"
            :disabled="audioState.status === 'playing' || isAudioProcessing">
            <i :class="isRecording ? 'bi bi-stop-fill' : 'bi bi-mic'"></i>
          </button>
          <textarea v-model="inputMessage" class="message-input" :placeholder="$t('chats.input.placeholder')"
            @keydown.enter.exact.prevent="sendMessage()"
            :disabled="audioState.status === 'playing' || isAudioProcessing"></textarea>
          <button class="btn-icon" @click="triggerFileInput"
            :disabled="audioState.status === 'playing' || isAudioProcessing">
            <i class="bi bi-paperclip"></i>
          </button>
          <input type="file" ref="fileInput" @change="handleFileSelect" class="file-input" multiple
            :disabled="audioState.status === 'playing' || isAudioProcessing" />
          <button class="btn-icon" @click="sendMessage()"
            :disabled="!canSendMessage || isLoading || audioState.status === 'playing' || isAudioProcessing">
            <i class="bi bi-send"></i>
          </button>
        </div>
        <div v-if="selectedFiles.length" class="selected-files">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-preview">
            <div class="file-preview-icon">
              <img v-if="isImageType(file)" :src="getFilePreviewUrl(file)" :alt="file.name" class="preview-thumbnail" />
              <i v-else :class="getFileIconClass(file)"></i>
            </div>
            <div class="file-preview-info">
              <div class="file-name-container">
                <span class="file-name">{{ file.name }}</span>
              </div>
              <button class="file-preview-remove" @click="removeFile(index)" title="Eliminar">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div> <!-- Cierre de chat-main -->
  </div> <!-- Cierre de chat-with-sidebar -->
  <div v-if="showImageModal && currentImage" class="fullscreen-image-modal" @click.self="closeImageModal"
    @keydown.esc="closeImageModal">
    <div class="image-modal-container">
      <div class="image-modal-header">
        <h3 class="image-modal-title">{{ currentImage.name }}</h3>
        <div class="image-modal-actions">
          <button class="btn-icon" @click="downloadAttachment(currentImage)" title="Descargar"
            :disabled="isAudioProcessing">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn-icon" @click="closeImageModal" title="Cerrar">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
      <div class="image-modal-body">
        <img v-if="isImageType(currentImage)" :src="currentImage.url" :alt="currentImage.name" class="image-modal-image"
          @click="toggleImageZoom" :class="{ 'zoomed': isImageZoomed }" />
        <div v-else class="file-preview-container">
          <i :class="getFileIconClass(currentImage)" style="font-size: 3rem;"></i>
          <p>{{ currentImage.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { marked } from 'marked'
import 'highlight.js/styles/github.css'
import ChatService from '@/services/ChatService'
import { BaseApiService } from '@/services/BaseApiService'
import ChatHistory from '@/components/ChatHistory.vue'
import type { Message, FileAttachment } from '@/types'
import { handleError, showNotification } from '@/utils/notifications'
const chatService = ChatService.getInstance()
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const selectedFiles = ref<FileAttachment[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const suggestions = ref<string[]>([])
const currentConversationId = ref('')
const showConfig = ref(false)
const showHistory = ref(false)
const courses = ref<any[]>([])
const resources = ref<any[]>([])
const selectedCourseId = ref('')
const selectedResourceId = ref('')
const showImageModal = ref(false)
const currentImage = ref<any>(null)
const isImageZoomed = ref(false)
const apiIntegrationId = ref(null)
const audioState = ref({
  status: 'idle',
  currentMessageId: '',
  currentAudio: null as HTMLAudioElement | null
})

const toggleImageZoom = () => {
  isImageZoomed.value = !isImageZoomed.value
}
const isTeacher = computed(() => BaseApiService.role === 'teacher')
const isStudent = computed(() => BaseApiService.role === 'student')
const isManager = computed(() => BaseApiService.role === 'manager')
const showConfigOptions = computed(() => isTeacher.value || isStudent.value)

const canSendMessage = computed(() => {
  return inputMessage.value.trim() !== '' || selectedFiles.value.length > 0
})

const renderMarkdown = (text: string) => {
  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
      smartLists: true,
      smartypants: false,
      highlight: function (code, language) {
        try {
          return code;
        } catch (e) {
          console.error('Error highlighting code:', e);
          return code;
        }
      }
    });

    let rendered = marked(text);

    // Añadir clases para mejorar estilos
    rendered = rendered
      .replace(/<table>/g, '<table class="md-table">')
      .replace(/<pre><code>/g, '<pre class="code-block"><code>')
      .replace(/<ul>/g, '<ul class="md-list">');

    // Añadir target="_blank" y rel="noopener noreferrer" a todos los <a>
    rendered = rendered.replace(
      /<a\s+href="([^"]+)"(.*?)>/g,
      '<a href="$1"$2 target="_blank" rel="noopener noreferrer">'
    );

    return rendered;
  } catch (error) {
    handleError(error, 'renderizar markdown');
    return text;
  }
};

const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return ''
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Enviar mensaje al chat
const sendMessage = async (msgText?: string) => {
  const messageText = msgText || inputMessage.value.trim();
  if (!messageText && selectedFiles.value.length === 0) return;
  suggestions.value = [];
  inputMessage.value = '';
  isLoading.value = true;
  const messageTime = new Date().toISOString();
  const userMessage: Message = {
    content: messageText,
    sender: 'user',
    time: messageTime,
    conversation_id: currentConversationId.value,
    attachments: selectedFiles.value.length > 0
      ? selectedFiles.value.map(f => ({
        name: f.name || 'archivo',
        type: f.type,
        size: f.size || 0,
        url: f.file ? URL.createObjectURL(f.file) : f.url || ''
      }))
      : undefined
  };

  messages.value.push(userMessage);
  scrollToBottom();

  const unsubscribe = chatService.subscribe((message: Message) => {
    // Manejar acción para eliminar mensajes temporales
    if (message.action === 'remove_all_temp') {
      messages.value = messages.value.filter(m => !m.isTemporary);
      scrollToBottom();
      return;
    }
    if (message.action === 'remove_temp' && message.tempId) {
      messages.value = messages.value.filter(m => m.tempId !== message.tempId);
      scrollToBottom();
      return;
    }

    const existingIndex = messages.value.findIndex(m =>
      (m.message_id && m.message_id === message.message_id) ||
      (m.sender === message.sender && m.time === message.time && m.message_id === message.message_id)
    );
    if (existingIndex >= 0) {
      messages.value[existingIndex] = { ...messages.value[existingIndex], ...message };
    } else {
      messages.value.push({ ...message });
    }
    scrollToBottom();
  });
  try {
    let apiFiles = [];
    if (selectedFiles.value.length > 0) {
      apiFiles = await chatService.uploadFiles(selectedFiles.value);
      selectedFiles.value = [];
    }
    const inputParams = {
      moodle_course_id: selectedCourseId.value || "",
      moodle_resource_id: selectedResourceId.value || "",
      api_integration_id: apiIntegrationId.value
    };

    const { messageId, conversationId, lastMessage: responseLastMessage } = await chatService.sendMessageStream(
      messageText,
      inputParams,
      apiFiles,
      currentConversationId.value
    );
    lastMessage.value = responseLastMessage || '';
    if (conversationId && !currentConversationId.value) {
      currentConversationId.value = conversationId;
      const userMessageIndex = messages.value.findIndex(m =>
        m.sender === 'user' && m.time === messageTime
      );
      if (userMessageIndex >= 0) {
        messages.value[userMessageIndex].conversation_id = conversationId;
      }
    }
    if (messageId) {
      suggestions.value = await chatService.getSuggestedQuestions(messageId, apiIntegrationId.value);
    }
  } catch (error) {
    let errorMessage = 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.';
    handleError(error, 'enviar mensaje');
    messages.value.push({
      content: errorMessage,
      sender: 'assistant',
      time: new Date().toISOString()
    });
  } finally {
    isLoading.value = false;
    unsubscribe();
    await scrollToBottom();
  }
};

const resetChat = () => {
  messages.value = []
  suggestions.value = []
  selectedFiles.value = []
  inputMessage.value = ''
}

const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  Array.from(input.files).forEach(file => {
    selectedFiles.value.push({
      file,
      name: file.name,
      type: file.type,
      size: file.size
    })
  })
  if (fileInput.value) fileInput.value.value = ''
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const openAttachment = (attachment: any) => {
  if (!attachment?.url) return
  if (isImageType(attachment)) {
    currentImage.value = attachment
    showImageModal.value = true
  } else {
    showNotification(`Archivo: ${attachment.name}`, 'info')
  }
}

const closeImageModal = () => {
  showImageModal.value = false
  currentImage.value = null
  isImageZoomed.value = false
}

const downloadAttachment = (attachment) => {
  if (!attachment?.url) return

  try {
    fetch(attachment.url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name || 'archivo';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        const tipoArchivo = isImageType(attachment) ? 'Imagen' : 'Archivo';
        showNotification(`${tipoArchivo} descargado correctamente`, 'success');
      })
      .catch(error => {
        handleError(error, 'descargar archivo');
      });
  } catch (error) {
    handleError(error, 'descargar archivo');
  }
}

const getFileIconClass = (attachment) => {
  if (attachment.type === 'application/pdf') {
    return 'bi bi-file-pdf'
  } else if (attachment.type?.includes('url') || attachment.url?.includes('http')) {
    return 'bi bi-link-45deg'
  } else if (attachment.type?.includes('text')) {
    return 'bi bi-file-text'
  } else if (attachment.type?.includes('json')) {
    return 'bi bi-file-code'
  } else {
    return 'bi bi-file-earmark'
  }
}
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])

const toggleRecording = async () => {
  if (isRecording.value) {
    isRecording.value = false
    if (mediaRecorder.value) {
      mediaRecorder.value.stop()
    }
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.value = []
      mediaRecorder.value = new MediaRecorder(stream)
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data)
        }
      }
      mediaRecorder.value.onstop = async () => {
        try {
          isLoading.value = true
          const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
          const text = await chatService.convertSpeechToText(audioBlob)
          if (text) {
            inputMessage.value = text
          }
          stream.getTracks().forEach(track => track.stop())
        } catch (error) {
          handleError(error, 'Convertir audio a texto')
        } finally {
          isLoading.value = false
        }
      }
      mediaRecorder.value.start()
      isRecording.value = true
    } catch (error) {
      handleError(error, 'iniciar grabación')
    }
  }
}
// Audio actualmente en reproducción
const isAudioProcessing = ref(false)
// Reproducir o pausar audio de un mensaje
const playMessageAudio = async (text: string, messageId?: string) => {
  if (audioState.value.status === 'playing' && audioState.value.currentMessageId === messageId) {
    if (audioState.value.currentAudio) {
      audioState.value.currentAudio.pause();
      audioState.value.currentAudio = null;
    }
    audioState.value.status = 'idle';
    audioState.value.currentMessageId = '';
    return;
  }
  if (isAudioProcessing.value) return;
  if (audioState.value.currentAudio) {
    audioState.value.currentAudio.pause();
    audioState.value.currentAudio = null;
    audioState.value.status = 'idle';
  }
  isAudioProcessing.value = true;
  audioState.value.status = 'loading';
  audioState.value.currentMessageId = messageId || '';
  try {
    const textToRead = (lastMessage.value && messageId === messages.value[messages.value.length - 1]?.message_id)
      ? lastMessage.value
      : text;
    const audioBlob = await chatService.convertTextToSpeech(textToRead);
    if (!audioBlob) throw new Error('No se pudo obtener el audio');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioState.value.currentAudio = audio;
    audio.onloadeddata = () => {
      audioState.value.status = 'playing';
      isAudioProcessing.value = false;
    };
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      audioState.value.status = 'idle';
      audioState.value.currentMessageId = '';
      isAudioProcessing.value = false;
      audioState.value.currentAudio = null;
    };
    audio.onerror = audio.onabort = () => {
      URL.revokeObjectURL(audioUrl);
      audioState.value.status = 'idle';
      audioState.value.currentMessageId = '';
      isAudioProcessing.value = false;
      audioState.value.currentAudio = null;
    };

    await audio.play();
  } catch (error) {
    audioState.value.status = 'idle';
    isAudioProcessing.value = false;
    audioState.value.currentAudio = null;
  }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => showNotification('Texto copiado al portapapeles', 'success'))
    .catch(err => handleError(err, 'Copiar texto'))
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showConfig.value) showConfig.value = false
    if (showHistory.value) showHistory.value = false
    if (showImageModal.value) closeImageModal()
  }
}

const loadCourses = async () => {
  try {
    const coursesData = await chatService.loadCourses()
    courses.value = coursesData || []
  } catch (error) {
    handleError(error, 'cargar cursos')
  }
}

const loadResources = async () => {
  resources.value = []
  if (!selectedCourseId.value) return
  try {
    const resourcesData = await chatService.loadResources(Number(selectedCourseId.value))
    resources.value = resourcesData || []
  } catch (error) {
    handleError(error, 'cargar recursos')
  }
}

const toggleConfigPanel = () => {
  showConfig.value = !showConfig.value
  if (showConfig.value) showHistory.value = false
}

const toggleHistoryPanel = () => {
  showHistory.value = !showHistory.value
  if (showHistory.value) showConfig.value = false
}

const applyConfigAndClose = () => {
  resetChat()
  let configMessage = '';

  if (selectedCourseId.value || selectedResourceId.value) {
    const courseName = selectedCourseId.value ?
      courses.value.find(c => c.id === selectedCourseId.value)?.name : ''
    const resourceName = selectedResourceId.value ?
      resources.value.find(r => r.id === selectedResourceId.value)?.name : ''

    configMessage = `Filtros aplicados: ${courseName ? `Curso: ${courseName}` : ''}${resourceName ? ` | Recurso: ${resourceName}` : ''}`
  }

  if (configMessage) {
    messages.value.push({
      content: configMessage,
      sender: 'assistant',
      time: new Date().toISOString()
    })
  }

  toggleConfigPanel()
}

const selectConversation = async (conversationId: string) => {
  if (conversationId === currentConversationId.value) return

  currentConversationId.value = conversationId
  await loadConversationMessages(conversationId)

  if (window.innerWidth < 768) {
    showHistory.value = false
  }
}

const loadConversationMessages = async (conversationId: string) => {
  if (!conversationId) return

  resetChat()
  isLoading.value = true

  try {
    const conversationMessages = await chatService.getConversationMessages(conversationId)

    if (conversationMessages.length > 0) {
      messages.value = conversationMessages
    } else {
      messages.value = [{
        content: '¿En qué puedo ayudarte hoy?',
        sender: 'assistant',
        time: new Date().toISOString()
      }]
    }
  } catch (error) {
    handleError(error, 'cargar mensajes')
    messages.value = [{
      content: 'Error al cargar los mensajes. Por favor, intenta de nuevo.',
      sender: 'assistant',
      time: new Date().toISOString()
    }]
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const newChat = async () => {
  resetChat()
  currentConversationId.value = ''
  if (window.innerWidth < 768) {
    showHistory.value = false
  }
  messages.value = [{
    content: '¿En qué puedo ayudarte hoy?',
    sender: 'assistant',
    time: new Date().toISOString()
  }]
  await scrollToBottom()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  loadCourses()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const props = defineProps({
  customPrompt: {
    type: [String, Object],
    default: null
  },
  apiIntegrationId: {
    type: String,
    default: ""
  }
})

watch(() => props.customPrompt, (newPrompt) => {
  if (newPrompt) {
    inputMessage.value = newPrompt
    apiIntegrationId.value = props.apiIntegrationId || null
    setTimeout(() => {
      sendMessage(newPrompt)
    }, 100)
  }
}, { immediate: true })

const isImageType = (file: any) => {
  if (!file) return false
  return (
    file.type?.startsWith('image/') ||
    (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ||
    file.isGraphic === true
  )
}

const getFilePreviewUrl = (file: any) => {
  if (file.file && file.file instanceof File) {
    return URL.createObjectURL(file.file)
  }
  return file.url || ''
}
const isRecording = ref(false)
const lastMessage = ref('')
</script>