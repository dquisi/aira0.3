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
    <!-- CARGA / VACÍO -->
    <div v-if="state.loading" class="loading">
      <div class="spinner"></div>
    </div>
    <div v-else-if="!state.prompts.length" class="empty text-center">
      <p>{{ t('prompts.noPrompts') }}</p>
    </div>
    <section v-else class="grid">
      <div v-for="p in state.prompts" :key="p.id" class="card">
        <div class="sidebar-indicator" :style="{ backgroundColor: getCat(p).color }"></div>
        <div class="category-badge" :style="{ backgroundColor: getCat(p).color, color: 'white' }">
          {{ getCat(p).label }}
        </div>
        <div class="card-header">
          <div class="flex justify-between items-center w-full flex-wrap">
            <h3 class="card-title">{{ p.name }}</h3>
          </div>
          <div class="flex items-center gap-1">
            <i class="bi bi-play-circle"></i> {{ p.usage_count || 0 }}
          </div>
        </div>
        <div class="card-body">
          <p class="card-text">{{ truncateText(p.value, 100) }}</p>
        </div>
        <div class="card-actions">
          <div>
            <button v-for="(act, i) in cardActionGroups[0]" :key="i" class="btn-icon" @click="act.handler(p)">
              <i :class="typeof act.icon === 'function' ? act.icon(p) : act.icon"></i>
            </button>
          </div>
          <div>
            <button v-for="(act, i) in cardActionGroups[1]" :key="i" class="btn-icon" @click="act.handler(p)">
              <i :class="act.icon"></i>
            </button>
          </div>
        </div>
      </div>
      <!-- Eliminado el lazy loading -->
    </section>
    <!-- MODAL UNIFICADO -->
    <div v-if="modal.isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal" :class="{ 'modal-lg': ['importExport', 'chat'].includes(modal.type) }">
        <header class="modal-header">
          <h2>{{ modalTitles[modal.type] }}</h2>
          <button class="btn-icon" @click="closeModal">
            <i class="bi bi-x-lg"></i>
          </button>
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
              <input type="text" v-model="modal.prompt.name" class="form-control"
                :placeholder="t('prompts.promptTitle')" />
            </div>
            <div class="form-group">
              <label>{{ t('prompts.form.content') }} *</label>
              <textarea v-model="modal.prompt.value" rows="5" class="form-control"
                :placeholder="t('prompts.promptContent')"></textarea>
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
            <h3>{{ t('prompts.form.title') }}: </h3>{{ modal.prompt.name }}
            <h4>{{ t('prompts.form.content') }}: </h4>{{ modal.prompt.value }}
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <strong>{{ t('prompts.form.category') }}:</strong>
                <span class="tag" :style="{ backgroundColor: getCat(modal.prompt).color }">
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
          </template>
          <!-- ELIMINAR -->
          <template v-else-if="modal.type === 'delete'">
            <DeleteConfirmDialog :show="modal.isOpen" :item-name="modal.prompt.name"
              :warning-message="t('common.deleteWarning')" @confirm="remove" @cancel="closeModal" />
          </template>
          <!-- VARIABLES -->
          <template v-else-if="modal.type === 'variables'">
            <p>{{ t('prompts.variablesInstruction') }}</p>
            <div v-for="(pr, i) in modal.params" :key="i" class="form-group">
              <label>{{ pr.name }}</label>
              <input type="text" v-model="modal.params[i].value" class="form-control" />
            </div>
          </template>
          <!-- CHAT -->
          <template v-else-if="modal.type === 'chat'">
            <ChatView :customPrompt="modal.processed" :apiIntegrationId="modal.apiId" />
          </template>
          <!-- GENERADOR DE PROMPTS -->
          <template v-else-if="modal.type === 'generator'">
            <PromptGenerator @close="closeModal" @generated="useGenerated" />
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
          <button v-if="modal.type === 'form'" class="btn-primary" @click="save()" :disabled="!isFormValid">
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
  ref,
  computed,
  onMounted,
  watch,
  nextTick
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

// --- OPCIONES DE CATEGORÍA ---
const categoryOptions = computed(() => state.categories);

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
const cardActionGroups = [
  [
    { icon: (p: Prompt) => p.is_favorite ? 'bi bi-star-fill' : 'bi bi-star', handler: toggleFav },
    { icon: 'bi bi-clipboard', handler: copyPrompt },
    { icon: 'bi bi-chat-dots', handler: usePrompt }
  ],
  [
    { icon: 'bi bi-pencil', handler: openForm },
    { icon: 'bi bi-trash', handler: confirmDelete },
    { icon: 'bi bi-eye', handler: openView }
  ]
];
const isFormValid = computed(() =>
  !!modal.prompt.name?.trim() &&
  !!modal.prompt.value?.trim() &&
  !!modal.prompt.category_id
);
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
    if (filters.query) {
      const query = filters.query.toLowerCase();
      allPrompts = allPrompts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.value.toLowerCase().includes(query)
      );
    }
    if (filters.category) {
      allPrompts = allPrompts.filter(p =>
        p.category_id === filters.category.id
      );
    }
    if (filters.favorites) {
      allPrompts = allPrompts.filter(p => p.is_favorite);
    }
    state.prompts = allPrompts;
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

async function save() {
  // Validar todos los campos obligatorios de una vez
  const missingFields = [];
  
  if (!modal.prompt.category_id) {
    missingFields.push(t('prompts.form.category'));
  }
  
  if (!modal.prompt.name?.trim()) {
    missingFields.push(t('prompts.form.title'));
  }
  
  if (!modal.prompt.value?.trim()) {
    missingFields.push(t('prompts.form.content'));
  }
  
  if (missingFields.length > 0) {
    showNotification(missingFields.join(', ') + ' ' + t('common.required'), 'error');
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
.search-filter-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-badge {
  position: absolute;
  top: 5px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 400;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.card {
  padding-top: 8px;
}

.text-error {
  color: #ff5252;
  font-size: 0.9rem;
  margin-top: 4px;
}

.favorite-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--card-border);
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>