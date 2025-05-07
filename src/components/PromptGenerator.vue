<template>
  <div class="prompt-generator">
    <div class="generator-body">
      <div class="generator-options">
        <!-- Selección de categoría -->
        <div class="form-group">
          <label>{{ t('prompts.generator.category') }}</label>
          <div class="category-select-container">
            <v-select class="category-filter" v-model="selectedCategory" :options="categoryOptions"
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
        </div>
        <!-- Instrucciones -->
        <div class="form-group">
          <label>{{ t('prompts.generator.instructions') }}</label>
          <textarea v-model="instructions" class="form-control" rows="6"
            :placeholder="t('prompts.generator.instructionsPlaceholder')"></textarea>
        </div>
        
        <!-- Plantillas de prueba -->
        <div class="generator-templates">
          <p class="templates-title">{{ t('prompts.generator.tryIt') }}</p>
          <div class="templates-grid">
            <button v-for="item in templateItems" :key="item.key" class="template-btn" @click="useTemplate(item.key)">
              <i :class="icons[item.key]"></i>
              <span>{{ item.key }}</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Vista previa -->
      <div class="generator-preview">
        <div v-if="generatedPrompt" class="preview-content">
          <h4>{{ t('prompts.generator.preview') }}</h4>
          <div class="preview-prompt">{{ generatedPrompt }}</div>
          <div class="preview-actions">
            <button class="btn-primary" @click="savePromptDirectly" :disabled="isSaving">
              <i class="bi bi-save"></i> {{ t('common.save') }}
            </button>
          </div>
        </div>
        <div v-else class="preview-placeholder">
          <div class="placeholder-icon"><i class="bi bi-stars"></i></div>
          <p>{{ t('prompts.generator.emptyPreview') }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="generator-footer">
      <button class="btn-secondary" @click="$emit('close')">
        {{ t('common.cancel') }}
      </button>
      <button class="btn-primary" @click="generatePrompt" :disabled="!instructions.trim() || isGenerating">
        <i class="bi bi-magic" v-if="!isGenerating"></i>
        <div class="spinner-sm" v-else></div>
        {{ isGenerating
          ? t('prompts.generator.generating')
          : t('prompts.generator.generate')
        }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import vSelect from 'vue-select';
import promptService from '@/services/PromptService';
import categoryService from '@/services/CategoryService';
import { showNotification } from '@/utils/notifications';
import type { Category } from '@/types';
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'generated', payload: any): void;
}>();
const { t } = useI18n();
interface Option { label: string; value: number; color: string; }
const categories = ref<Category[]>([]);
const selectedCategory = ref<Option | null>(null);
const instructions = ref('');

const generatedPrompt = ref('');
const isGenerating = ref(false);
const isSaving = ref(false);
const loadingCategories = ref(false);
const categoryOptions = computed<Option[]>(() =>
  categories.value.map(c => ({ label: c.name, value: c.id, color: c.color }))
);
const templateKeys = [
  'Examen',
  'Retroalimentacion',
  'Rubrica',
  'Explicacion',
  'Ejercicios',
  'Investigacion'
] as const;
const icons: Record<typeof templateKeys[number], string> = {
  Examen: 'bi bi-file-earmark-text',
  Retroalimentacion: 'bi bi-chat-square-text',
  Rubrica: 'bi bi-card-checklist',
  Explicacion: 'bi bi-lightbulb',
  Ejercicios: 'bi bi-journal-check',
  Investigacion: 'bi bi-search'
};
const templateItems = computed(() =>
  templateKeys.map(key => ({
    key,
    label: t(`prompts.generator.templates.${key}`)
  }))
);
// uso en el método
const useTemplate = (key: typeof templateKeys[number]) => {
  instructions.value = t(`prompts.generator.templates.${key}`);
};
const loadCategories = async () => {
  loadingCategories.value = true;
  try {
    categories.value = await categoryService.getAll();
  } catch {
    showNotification(t('prompts.generator.loadCategoriesError'), 'error');
  } finally {
    loadingCategories.value = false;
  }
};

// --- Generar prompt ---
const generatePrompt = async () => {
  if (!instructions.value.trim()) return;
  isGenerating.value = true;
  try {
    generatedPrompt.value = await promptService.generatePrompt(instructions.value);
  } catch {
    showNotification(t('prompts.generator.generateError'), 'error');
  } finally {
    isGenerating.value = false;
  }
};
// --- Guardar directamente ---
const savePromptDirectly = async () => {
  if (!generatedPrompt.value.trim()) return;
  isSaving.value = true;
  try {
    const words = generatedPrompt.value.trim().split(/\s+/);
    const title = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    const payload = {
      name: title,
      value: generatedPrompt.value,
      category_id: selectedCategory.value?.value,
      is_favorite: false
    };
    const saved = await promptService.create(payload);
    emit('generated', { ...saved, saved: true });
    emit('close');
  } catch {
    showNotification(t('prompts.generator.saveError'), 'error');
  } finally {
    isSaving.value = false;
  }
};
onMounted(loadCategories);
</script>

<style scoped>
.templates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.template-btn {
  background-color: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.template-btn i {
  font-size: 1.5rem;
  color: var(--primary-color);
}
</style>
