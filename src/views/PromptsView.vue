<template>
  <div class="container">
    <div class="header">
      <div class="controls-container">
        <div class="search-box"> <input v-model="filters.query" type="text" class="search-input"
            :placeholder="t('common.search')" />
          <span class="search-icon">🔍</span>
        </div>
        <v-select class="search-box" v-model="filters.category" :options="categoryOptions"
          :placeholder="t('prompts.filter')">
          <template #option="{ label, color }">
            <div class="category-option">
              <span class="color-dot" :style="{ backgroundColor: color }"></span>
              {{ label }}
            </div>
          </template>
          <template #selected-option="{ label, color }">
            <div class="category-option">
              <span class="color-dot" :style="{ backgroundColor: color }"></span>
              {{ label }}
            </div>
          </template>
          <template #no-options>
            <span>{{ t('categories.empty') }}</span>
          </template>
        </v-select>
        <button class="btn-secondary" :class="{ active: filters.favorites }"
          @click="filters.favorites = !filters.favorites">
          <i class="bi bi-star-fill"></i>
          {{ t('prompts.filters.favorites') }}
        </button>
        <div class="action-buttons">
          <button v-for="btn in headerActions" :key="btn.type" class="btn-icon" @click="openSpecial(btn.type)"
            :title="btn.title">
            <i :class="btn.icon"></i>
          </button>
        </div>
      </div>
    </div>
    <div v-if="state.loading" class="loading">
      <div class="spinner"></div>
    </div>
    <div v-else-if="!state.prompts.length" class="empty text-center">
      <p>{{ t('prompts.noPrompts') }}</p>
    </div>
    <section v-else class="grid">
      <div v-for="(p, i) in state.prompts" :key="p.id || i" class="card" @click="openView(p)">
        <div class="sidebar-indicator" :style="{ backgroundColor: getCat(p).color }"></div>
        <div class="card-badge" :style="{ backgroundColor: getCat(p).color, color: 'white' }">
          {{ getCat(p).label }}
        </div>
        <div class="card-header">
          <div class="flex justify-between items-center w-full flex-wrap">
            <h3 class="card-title">{{ p.name }}</h3>
          </div>
          <div class="flex items-center gap-1">
            <i class="bi bi-reception-4"></i> {{ p.usage_count || 0 }}
          </div>
        </div>
        <div class="card-body">
          <p class="card-text">{{ truncateText(p.value, 100) }}</p>
        </div>
        <div class="card-actions">
          <div>
            <div v-for="(act, i) in cardActionGroups[0]" :key="i" class="relative">
              <!-- Si es el botón de copiar, mostrar dropdown -->
              <button v-if="act.action === 'copy'" class="btn-icon" @click.stop="toggleCopyMenu(p)">
                <i :class="typeof act.icon === 'function' ? act.icon(p) : act.icon"></i>
              </button>
              <!-- Menú desplegable para el botón de copiar -->
              <div v-if="act.action === 'copy' && activeCopyMenu === p.id" class="copy-menu">
                <button class="copy-option" @click.stop="copyPromptText(p)">
                  <i class="bi bi-clipboard-fill"></i> {{ t('common.copyText') }}
                </button>
                <button class="copy-option" @click.stop="exportPromptJson(p)">
                  <i class="bi bi-download"></i> {{ t('common.export') }}
                </button>
              </div>
              <!-- Otros botones -->
              <button v-else class="btn-icon" @click.stop="act.handler(p)">
                <i :class="typeof act.icon === 'function' ? act.icon(p) : act.icon"></i>
              </button>
            </div>
          </div>
          <div>
            <button v-for="(act, i) in cardActionGroups[1]" :key="i" class="btn-icon" @click="act.handler(p)">
              <i :class="act.icon"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
    <!-- MODAL UNIFICADO -->
    <div v-if="modal.isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal" :class="{ 'modal-lg': ['importExport', 'chat'].includes(modal.type) }">
        <header class="modal-header">
          <h2>
            <template v-if="modal.type === 'view'">
              {{ modal.prompt.name }}
            </template>
            <template v-else>
              {{ modalTitles[modal.type] }}
            </template>
          </h2>
          <div class="flex items-center gap-x-2">
            <template v-if="modal.type === 'view'">
              <button @click="usePrompt(modal.prompt)" :title="t('common.execute', 'Ejecutar')">
                <i class="bi bi-play mr-1"></i>
                <span>{{ t('common.execute', 'Ejecutar') }}</span>
              </button>
            </template>
            <button class="btn-icon" @click="closeModal" :title="t('common.close', 'Cerrar')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </header>
        <div class="modal-body">
          <!-- FORMULARIO -->
          <template v-if="modal.type === 'form'">
            <div class="form-group">
              <label>{{ t('prompts.form.category') }} *</label>
              <v-select v-model="modal.prompt.category_id" :options="categoryOptions" :reduce="o => o.id"
                :placeholder="t('prompts.filter')">
                <template #option="{ label, color }">
                  <div class="category-option">
                    <span class="color-dot" :style="{ backgroundColor: color }"></span>
                    {{ label }}
                  </div>
                </template>
                <template #selected-option="{ label, color }">
                  <div class="category-option">
                    <span class="color-dot" :style="{ backgroundColor: color }"></span>
                    {{ label }}
                  </div>
                </template>
              </v-select>
            </div>
            <div class="form-group">
              <label>{{ t('prompts.form.title') }} *</label>
              <input type="text" v-model="modal.prompt.name" class="form-control" maxlength="50"
                :placeholder="t('prompts.promptTitle')" />
              <small>{{ modal.prompt.name?.length || 0 }}/50</small>
            </div>
            <div class="form-group">
              <label>{{ t('prompts.form.content') }} *</label>
              <textarea v-model="modal.prompt.value" rows="5" class="form-control" maxlength="500"
                :placeholder="t('prompts.promptContent')"></textarea>
              <small>{{ modal.prompt.value?.length || 0 }}/500</small>
            </div>
            <div class="form-group favorite-toggle">
              <label>{{ t('prompts.card.favorite') }}</label>
              <label class="switch">
                <input type="checkbox" v-model="modal.prompt.is_favorite">
                <span class="slider round"></span>
              </label>
            </div>
          </template>
          <!-- VISTA DETALLE -->
          <template v-else-if="modal.type === 'view'">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <strong>{{ t('prompts.form.category') }}:</strong>
                <span class="tag-chip" :style="{ backgroundColor: getCat(modal.prompt).color }">
                  {{ getCat(modal.prompt).label }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <strong>{{ t('common.date') }}:</strong>
                {{ formatDate(modal.prompt.created_at) }}
              </div>
              <div class="flex items-center gap-1">
                <strong>{{ t('prompts.card.useInChat') }}:</strong>
                {{ modal.prompt.usage_count || 0 }}
              </div>
            </div>
            <h4 class="mt-3 font-semibold">{{ t('prompts.form.content') }}: </h4>
            <div class="whitespace-pre-wrap">{{ modal.prompt.value }}</div>
          </template>
          <!-- ELIMINAR -->
          <template v-else-if="modal.type === 'delete'">
            <DeleteConfirmDialog :show="modal.isOpen" :item-name="modal.prompt.name"
              :warning-message="t('common.deleteWarning')" @confirm="remove" @cancel="closeModal" />
          </template>
          <!-- VARIABLES -->
          <template v-else-if="modal.type === 'variables'">
            <div class="preview-container">
              <p>Preview:</p>
              <div class="prompt-preview">{{ getPreviewText() }}</div>
            </div>
            <p>{{ t('prompts.variablesInstruction') }}</p>
            <div v-for="(pr, i) in modal.params" :key="i" class="form-group">
              <label>{{ pr.name }}</label>
              <input type="text" v-model="modal.params[i].value" class="form-control" maxlength="150" />
              <small>{{ modal.params[i].value?.length || 0 }}/150</small>
            </div>
          </template>
          <!-- CHAT -->
          <template v-else-if="modal.type === 'chat'">
            <ChatView :customPrompt="modal.processed" :apiIntegrationId="modal.apiId" />
          </template>
          <!-- GENERADOR DE PROMPTS -->
          <template v-else-if="modal.type === 'generator'">
            <PromptGenerator @generated="useGenerated" />
          </template>
          <!-- GENERADOR DE SÍLABOS -->
          <template v-else-if="modal.type === 'syllabus'">
            <SyllabusGenerator @close="closeModal" @generated="useSyllabus" />
          </template>
          <!-- IMPORT/EXPORT -->
          <template v-else-if="modal.type === 'importExport'">
            <ImportExportPrompts @close="closeModalAndReload" @import-complete="closeModalAndReload"
              @export-complete="() => showNotification(t('prompts.exportSuccess'), 'success')" />
          </template>
        </div>
        <footer class="modal-footer">
          <button v-if="modal.type === 'form'" class="btn-primary" @click="save()">
            {{ t('common.save') }}
          </button>
          <button v-if="modal.type === 'variables'" class="btn-primary" @click="sendVariables()">
            {{ t('common.send') }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  reactive,
  onMounted,
  watch,
  nextTick,
  computed
} from 'vue';
import { useI18n } from 'vue-i18n';
import vSelect from 'vue-select';
import promptService from '@/services/PromptService';
import { BaseApiService } from '@/services/BaseApiService';
import categoryService from '@/services/CategoryService';
import { showNotification, handleError } from '@/utils/notifications';
import type { Prompt, PromptParameter, Category } from '@/types';
import ChatView from '@/views/ChatView.vue';
import PromptGenerator from '@/components/PromptGenerator.vue';
import SyllabusGenerator from '@/components/SyllabusGenerator.vue';
import ImportExportPrompts from '@/components/ImportExportPrompts.vue';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue';

const { t } = useI18n();

const state = reactive({
  prompts: [] as Prompt[],
  categories: [] as Category[],
  loading: true
});

const categoryOptions = computed(() => {
  return state.categories;
});

// --- FILTROS ---
const filters = reactive({
  query: '',
  category: null as Category | null,
  favorites: false
});

// --- MODAL ---
const modal = reactive({
  isOpen: false,
  type: '' as string,
  prompt: {} as Partial<Prompt>,
  params: [] as PromptParameter[],
  processed: '',
  apiId: BaseApiService.getApiIntegrationIdByRole()
});


// --- TÍTULOS DE MODAL ---
const modalTitles: Record<string, string> = {
  form: t('prompts.title'),
  view: t('common.view'),
  delete: t('common.delete'),
  variables: t('prompts.variables'),
  chat: t('chats.title'),
  generator: t('prompts.generator.title'),
  syllabus: t('prompts.syllabus.title'),
  importExport: t('prompts.importExport.title')
};
const headerActions = [
  { type: 'form', icon: 'bi bi-plus-circle', title: t('common.create') },
  { type: 'generator', icon: 'bi bi-magic', title: t('prompts.generator.title') },
  { type: 'syllabus', icon: 'bi bi-file-earmark-text', title: t('prompts.syllabus.title') },
  { type: 'importExport', icon: 'bi bi-arrow-down-up', title: t('prompts.importExport.title') }
];
const activeCopyMenu = ref<string | null>(null);

const toggleCopyMenu = (p: Prompt) => {
  if (activeCopyMenu.value === p.id) {
    activeCopyMenu.value = null;
  } else {
    activeCopyMenu.value = p.id;
    // Cerrar el menú al hacer clic fuera
    setTimeout(() => {
      const closeMenu = () => {
        activeCopyMenu.value = null;
        document.removeEventListener('click', closeMenu);
      };
      document.addEventListener('click', closeMenu);
    }, 100);
  }
};

const copyPromptText = (p: Prompt) => {
  try {
    navigator.clipboard.writeText(p.value);
    showNotification(t('common.copyTextSuccess'), 'success');
  } catch (error) {
    handleError(error, t('common.error'));
  }
  activeCopyMenu.value = null;
};

const exportPromptJson = (p: Prompt) => {
  if (promptService.copyToClipboard(p)) {
    showNotification(t('common.exportSuccess'), 'success');
  }
  activeCopyMenu.value = null;
};

const cardActionGroups = [
  [
    { icon: (p: Prompt) => p.is_favorite ? 'bi bi-star-fill' : 'bi bi-star', handler: toggleFav, action: 'favorite' },
    { icon: 'bi bi-clipboard', handler: toggleCopyMenu, action: 'copy' },
    { icon: 'bi bi-play-circle', handler: usePrompt, action: 'use' }
  ],
  [
    { icon: 'bi bi-pencil', handler: openForm },
    { icon: 'bi bi-trash', handler: confirmDelete },
    { icon: 'bi bi-eye', handler: openView }
  ]
];
// --- HELPERS ---
function getCat(p: Prompt) {
  return state.categories.find(c => c.id === p.category_id)
    || { label: t('prompts.noCategory'), color: '#ccc', api_integration_id: 2 };
}
function formatDate(s: string) {
  return s ? new Date(s).toLocaleString() : '';
}

function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
// --- CARGA DE DATOS ---
async function loadData() {
  state.loading = true;
  try {
    if (!state.categories.length) {
      const cats = await categoryService.getAll();
      state.categories = cats.map(c => ({
        id: c.id,
        label: c.name,
        color: c.color,
        api_integration_id: c.api_integration_id
      }));
    }
    await loadAllPrompts();
  } catch (e) {
    handleError(e, t('common.noData'));
  } finally {
    state.loading = false;
  }
}

async function loadAllPrompts() {
  try {
    let allPrompts = await promptService.getAll();
    const currentMoodleUserId = BaseApiService.moodle_user_id;
    const roleApiIntegrationId = BaseApiService.getApiIntegrationIdByRole();
    let relevantPrompts = allPrompts.filter(p => {
      const isOwnPrompt = p.moodle_user_id === currentMoodleUserId;

      let isRoleCategoryPrompt = false;
      const categoryOfPrompt = state.categories.find(cat => cat.id === p.category_id);
      if (categoryOfPrompt && categoryOfPrompt.api_integration_id !== undefined) {
        isRoleCategoryPrompt = categoryOfPrompt.api_integration_id === roleApiIntegrationId;
      }
      const isPublicOrGeneralPrompt = p.moodle_user_id === 0 || p.general === true;

      return isOwnPrompt || isRoleCategoryPrompt || isPublicOrGeneralPrompt;
    });

    if (filters.query) {
      const query = filters.query.toLowerCase();
      relevantPrompts = relevantPrompts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.value && p.value.toLowerCase().includes(query))
      );
    }
    if (filters.category && filters.category.id) {
      relevantPrompts = relevantPrompts.filter(p =>
        p.category_id === filters.category.id
      );
    }
    if (filters.favorites) {
      relevantPrompts = relevantPrompts.filter(p => p.is_favorite);
    }

    state.prompts = relevantPrompts;

  } catch (e) {
    handleError(e, t('common.noData'));
  }
}
// --- ACCIONES DE TARJETA ---
function copyPrompt(p: Prompt) {
  if (promptService.copyToClipboard(p)) {
    showNotification(t('common.copySuccess'), 'success');
  }
}
async function toggleFav(p: Prompt) {
  try {
    await promptService.toggleFavorite(p);
    p.is_favorite = !p.is_favorite;
  } catch (e) {
    handleError(e, t('common.error'));
  }
}
function usePrompt(p: Prompt) {
  modal.prompt = { ...p, tags: [...(p.tags || [])] };
  modal.params = promptService.extractParameters(p.value);
  if (modal.params.length) {
    modal.type = 'variables';
    modal.isOpen = true;
  } else {
    sendVariables();
  }
}
// --- MODAL: ABRIR / CERRAR y OPERACIONES ---
function openForm(p?: Prompt) {
  modal.type = 'form';
  modal.isOpen = true;
  modal.prompt = p
    ? { ...p }
    : { name: '', value: '', category_id: state.categories[0]?.id, is_favorite: false };
  modal.newTag = '';
  modal.params = [];
}
function openView(p: Prompt) {
  modal.type = 'view';
  modal.isOpen = true;
  modal.prompt = { ...p };
}
function confirmDelete(p: Prompt) {
  modal.type = 'delete';
  modal.isOpen = true;
  modal.prompt = { ...p };
}
function openSpecial(type: string) {
  modal.type = type;
  modal.isOpen = true;
  modal.prompt = {};
  modal.params = [];
}
function closeModal() {
  modal.isOpen = false;
}
function closeModalAndReload() {
  closeModal();
  loadData();
}

function getPreviewText() {
  let txt = modal.prompt.value || '';
  modal.params.forEach(pr => {
    if (pr.value) {
      txt = txt.replace(`[${pr.name}]`, pr.value);
    }
  });
  return txt;
}


async function save() {
  if (!modal.prompt.category_id) {
    showNotification(t('common.requiredField', { field: t('prompts.form.category') }), 'error');
    return;
  }
  if (!modal.prompt.name?.trim()) {
    showNotification(t('common.requiredField', { field: t('prompts.form.title') }), 'error');
    return;
  }
  if (!modal.prompt.value?.trim()) {
    showNotification(t('common.requiredField', { field: t('prompts.form.content') }), 'error');
    return;
  }

  try {
    if (modal.prompt.id) {
      await promptService.update(modal.prompt as Prompt);
      showNotification(t('common.updated'), 'success');
    } else {
      await promptService.create(modal.prompt);
      showNotification(t('common.created'), 'success');
    }
    closeModalAndReload();
  } catch (e) {
    handleError(e, t('common.error'));
  }
}
async function remove() {
  if (!modal.prompt.id) return;
  try {
    await promptService.remove(modal.prompt.id);
    showNotification(t('common.deleted'), 'success');
    closeModalAndReload();
  } catch (e) {
    handleError(e, t('common.error'));
  }
}
function sendVariables() {
  let txt = modal.prompt.value || '';
  modal.params.forEach(pr => {
    txt = txt.replace(`[${pr.name}]`, pr.value);
  });
  if (modal.prompt.id) {
    promptService.incrementUsageCount(modal.prompt.id);
  }
  modal.apiId = getCat(modal.prompt).api_integration_id || 2;
  modal.processed = txt;
  modal.type = 'chat';
  modal.isOpen = true;
}
function useGenerated(data: { value: string; category_id: number; saved: boolean }) {
  if (data.saved) {
    closeModalAndReload();
  } else {
    modal.prompt.value = data.value;
    modal.prompt.category_id = data.category_id;
    closeModal();
    openForm();
  }
}
function useSyllabus(s: { title: string; content: string; tags: string[] }) {
  modal.prompt = {
    name: s.title,
    value: s.content,
    tags: s.tags,
    category_id: state.categories[0]?.id,
    is_favorite: false
  };
  closeModal();
  openForm();
}
onMounted(() => {
  loadData();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.isOpen) closeModal();
  });
});

watch(
  () => [filters.query, filters.category, filters.favorites],
  () => {
    state.loading = true;
    nextTick(async () => {
      try {
        await loadAllPrompts();
      } finally {
        state.loading = false;
      }
    });
  }
);
</script>

<style scoped>
.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.favorite-toggle {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.favorite-toggle label:first-child {
  margin-right: 10px;
}

.preview-container {
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
}

.prompt-preview {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  min-height: 60px;
  max-height: 150px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
  margin-top: 8px;
}

.tag-chip {
  padding: 6px 12px;
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  display: inline-block;
  min-width: 80px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.relative {
  position: relative;
}

.copy-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 5px;
  background-color: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  width: 150px;
}

.copy-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  width: 100%;
  text-align: left;
  transition: background-color 0.2s;
  color: var(--text-color);
}

.copy-option:hover {
  background-color: var(--secondary-color);
}

.copy-option i {
  font-size: 14px;
}
</style>

