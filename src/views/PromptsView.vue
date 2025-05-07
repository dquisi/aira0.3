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
            <span>{{t('categories.empty')}}</span>
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
        <div class="card-header">
          <div class="flex justify-between items-center w-full flex-wrap">
            <h3 class="card-title">{{ p.name }}</h3>
            <span class="tag" :style="{ backgroundColor: getCat(p).color }">
              {{ getCat(p).label }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <i class="bi bi-play-circle"></i> {{ p.usage_count || 0 }}
          </div>
        </div>
        <div class="card-body">
          <p class="card-text">{{ p.value }}</p>
          <div class="flex gap-1 flex-wrap">
            <span v-for="tag in p.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
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
      <div class="lazy-loading-observer" ref="observerEl"></div>
      <div v-if="state.loadingMore" class="text-center mt-2">
        <div class="spinner"></div>
      </div>
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
              <label>{{ t('prompts.form.title') }}</label>
              <input type="text" v-model="modal.prompt.name" class="form-control"
                :placeholder="t('prompts.promptTitle')" />
            </div>
            <div class="form-group">
              <label>{{ t('prompts.form.content') }}</label>
              <textarea v-model="modal.prompt.value" rows="5" class="form-control"
                :placeholder="t('prompts.promptContent')"></textarea>
            </div>
            <div class="form-group">
              <label>{{ t('prompts.form.category') }}</label>
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
              <label>{{ t('prompts.form.tags') }}</label>
              <div class="tags-input">
                <span v-for="(tag, i) in modal.prompt.tags" :key="i" class="tag">
                  {{ tag }}<i class="bi bi-x" @click="modal.prompt.tags.splice(i, 1)"></i>
                </span>
                <input type="text" v-model="modal.newTag" @keyup.enter="addTag()" class="tag-input"
                  :placeholder="t('prompts.form.addTag')" />
              </div>
            </div>
          </template>
          <!-- VISTA DETALLE -->
          <template v-else-if="modal.type === 'view'">
            <h3>{{ t('prompts.form.title') }}: {{ modal.prompt.name }}</h3>
            <h4>{{ t('prompts.form.content') }}: {{ modal.prompt.value }}</h4>
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
              <div v-if="modal.prompt.tags?.length">
                <strong>{{ t('prompts.form.tags') }}:</strong>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(tag, i) in modal.prompt.tags" :key="i" class="tag">{{ tag }}</span>
                </div>
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
  loading: true,
  loadingMore: false,
  hasMore: true
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
  prompt: { tags: [] } as Partial<Prompt> & { tags: string[] },
  newTag: '',
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
    state.prompts = [];
    state.hasMore = true;
    await loadMore();
  } catch (e) {
    handleError(e, t('errors.loadData'));
  } finally {
    state.loading = false;
  }
}
async function loadMore() {
  if (state.loadingMore || !state.hasMore) return;
  state.loadingMore = true;
  try {
    const fltrs: any[] = [];
    if (filters.query) fltrs.push({ field: 'name', operator: 'ilike', value: filters.query });
    if (filters.category) fltrs.push({ field: 'category_id', operator: '=', value: filters.category.id });
    if (filters.favorites) fltrs.push({ field: 'is_favorite', operator: '=', value: true });
    const res = await promptService.search({
      skip: state.prompts.length,
      limit: 10,
      filters: fltrs
    });
    const items = res.answer || [];
    state.prompts.push(...items);
    state.hasMore = items.length === 10;
    if (!state.hasMore) observer.value?.disconnect();
  } catch (e) {
    handleError(e, t('errors.loadPrompts'));
  } finally {
    state.loadingMore = false;
  }
}
// --- OBSERVER PARA INFINITE SCROLL ---
const observer = ref<IntersectionObserver>();
const observerEl = ref<HTMLElement>();
function setupObserver() {
  observer.value?.disconnect();
  observer.value = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && state.hasMore) loadMore();
  }, { rootMargin: '0px 0px 200px', threshold: 0.1 });
  if (observerEl.value) observer.value.observe(observerEl.value);
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
    handleError(e, t('errors.toggleFav'));
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
    ? { ...p, tags: [...(p.tags || [])] }
    : { name: '', value: '', tags: [], category_id: state.categories[0]?.id };
  modal.newTag = '';
  modal.params = [];
}
function openView(p: Prompt) {
  modal.type = 'view';
  modal.isOpen = true;
  modal.prompt = { ...p, tags: [...(p.tags || [])] };
}
function confirmDelete(p: Prompt) {
  modal.type = 'delete';
  modal.isOpen = true;
  modal.prompt = { ...p, tags: [...(p.tags || [])] };
}
function openSpecial(type: string) {
  modal.type = type;
  modal.isOpen = true;
  modal.prompt = { tags: [] };
  modal.newTag = '';
  modal.params = [];
}
function closeModal() {
  modal.isOpen = false;
}
function closeModalAndReload() {
  closeModal();
  loadData();
}
function addTag() {
  const tag = modal.newTag.trim();
  if (tag && !modal.prompt.tags.includes(tag)) {
    modal.prompt.tags.push(tag);
  }
  modal.newTag = '';
}
async function save() {
  if (!isFormValid.value) {
    showNotification(t('prompts.error'), 'error');
    return
  }
  try {
    if (modal.prompt.id) {
      await promptService.update(modal.prompt as Prompt);
      showNotification(t('prompts.updateSuccess'), 'success');
    } else {
      await promptService.create(modal.prompt);
      showNotification(t('prompts.createSuccess'), 'success');
    }
    closeModalAndReload();
  } catch (e) {
    handleError(e, t('errors.save'));
  }
}
async function remove() {
  if (!modal.prompt.id) return;
  try {
    await promptService.remove(modal.prompt.id);
    showNotification(t('prompts.deleteSuccess'), 'success');
    closeModalAndReload();
  } catch (e) {
    handleError(e, t('errors.delete'));
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
  modal.apiId = getCat(modal.prompt).api_integration_id.toString() || '2';
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
    category_id: state.categories[0]?.id
  };
  closeModal();
  openForm();
}
onMounted(() => {
  loadData();
  nextTick(setupObserver);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.isOpen) closeModal();
  });
});
watch(
  () => [filters.query, filters.category, filters.favorites],
  () => {
    state.prompts = [];
    state.hasMore = true;
    loadMore();
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
</style>
