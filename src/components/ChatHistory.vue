<template>
  <div class="chat-history">
    <div class="history-search">
      <div class="search-input-wrapper">
        <i class="bi bi-search"></i>
        <input type="text" v-model="searchTerm" :placeholder="$t('common.search')" class="search-input" />
        <i v-if="searchTerm" @click="searchTerm = ''" class="bi bi-x-circle clear-search"></i>
      </div>
    </div>
    <div v-if="loading" class="loading-history">
      <div class="spinner"></div>
      <p>{{ $t('chats.history.loading') }}</p>
    </div>
    <div v-else-if="!filteredConversations.length" class="empty-history">
      <i class="bi bi-chat-square-text"></i>
      <p v-if="searchTerm">{{ $t('chats.history.noSearchResults') }}</p>
      <p v-else>{{ $t('chats.history.empty') }}</p>
    </div>
    <div v-else class="conversations-list">
      <div v-for="conv in filteredConversations" :key="conv.id" class="conversation-item"
        :class="{ 'selected': selectedId === conv.id }" @click="selectConversation(conv.id)">
        <div class="conversation-name">
          <i class="bi bi-chat-dots"></i>
          <span>{{ formatConversationName(conv) }}</span>
        </div>
        <div class="conversation-meta">
          <span class="conversation-date">{{ formatDate(conv.updated_at) }}</span>
        </div>
        <div class="conversation-actions">
          <button class="btn-icon-mini" @click.stop="confirmDelete(conv.id, formatConversationName(conv))"
            title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="history-actions">
      <button class="new-chat-btn" @click="$emit('new')">
        <i class="bi bi-plus-circle"></i> {{ $t('chats.history.new') }}
      </button>
      <button v-if="conversations.length > 0" class="refresh-btn" @click="loadConversations">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>
    <!-- Modal de confirmación para eliminar -->
    <DeleteConfirmDialog :show="showDeleteConfirm" :item-name="conversationNameToDelete"
      :warning-message="$t('common.deleteWarning')" @confirm="deleteConversation" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import ChatService from '@/services/ChatService'
import type { Conversation } from '@/types'
import { showNotification } from '@/utils/notifications'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'

const chatService = ChatService.getInstance()
const conversations = ref<Conversation[]>([])
const loading = ref(false)
const searchTerm = ref('')

const props = defineProps({
  selectedId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'new'])

const filteredConversations = computed(() => {
  if (!searchTerm.value) return conversations.value;

  const searchLower = searchTerm.value.toLowerCase();
  return conversations.value.filter(conv => {
    const name = formatConversationName(conv).toLowerCase();
    return name.includes(searchLower);
  });
})

const loadConversations = async () => {
  loading.value = true;
  try {
    const result = await chatService.getConversations();
    conversations.value = result;
  } catch (error) {
    conversations.value = [];
    showNotification('Error al cargar las conversaciones', 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(loadConversations);

watch(() => props.selectedId, () => {
  if (props.selectedId && !conversations.value.some(conv => conv.id === props.selectedId)) {
    loadConversations();
  }
});

// Actualizar conversaciones cada minuto
const autoRefreshInterval = setInterval(loadConversations, 60000);

onUnmounted(() => {
  clearInterval(autoRefreshInterval);
});

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatConversationName(conversation: Conversation) {
  if (conversation.name) return conversation.name;

  if (conversation.created_at) {
    const date = new Date(conversation.created_at * 1000);
    return `Conversación del ${date.toLocaleDateString()}`;
  }

  return 'Conversación sin título';
}

function selectConversation(convId: string) {
  emit('select', convId);
}

const showDeleteConfirm = ref(false);
const conversationToDelete = ref('');
const conversationNameToDelete = ref('');

function confirmDelete(convId: string, convName: string) {
  conversationToDelete.value = convId;
  conversationNameToDelete.value = convName || 'Conversación';
  showDeleteConfirm.value = true;
}

async function deleteConversation() {
  const convId = conversationToDelete.value;
  if (!convId) return;

  try {
    const success = await chatService.deleteConversation(convId);
    if (success) {
      await loadConversations();
      if (props.selectedId === convId) {
        emit('new');
      }
      showNotification('Conversación eliminada con éxito', 'success');
    } else {
      showNotification('Error al eliminar la conversación', 'error');
    }
  } catch (error) {
    showNotification('Error al eliminar la conversación', 'error');
  } finally {
    showDeleteConfirm.value = false;
  }
}
</script>

<style scoped>

</style>