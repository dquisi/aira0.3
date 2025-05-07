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
            <div class="preview-form">
              <div class="form-group">
                <label>{{ t('prompts.form.title') }} *</label>
                <input v-model="promptName" class="form-control" type="text" required />
              </div>
              <div class="form-group">
                <label>{{ t('prompts.form.category') }} *</label>
                <div v-if="selectedCategory">
                  <div class="category-option selected">
                    <span class="color-dot" :style="{ backgroundColor: selectedCategory.color }"></span>
                    {{ selectedCategory.label }}
                  </div>
                </div>
                <div v-else class="text-error">
                  {{ t('prompts.form.category') + ' ' + t('common.required') }}
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('common.description') }}</label>
                <textarea v-model="promptDescription" class="form-control" rows="2"></textarea>
              </div>
              <div class="form-group favorite-toggle">
                <label>{{ t('prompts.card.favorite') }}</label>
                <label class="switch">
                  <input type="checkbox" v-model="isFavorite">
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
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
import { showNotification, handleError } from '@/utils/notifications';
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
const promptName = ref('');
const promptDescription = ref('');
const isFavorite = ref(false);
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
  if (!instructions.value.trim()) {
    showNotification(t('prompts.generator.instructions') + ' ' + t('common.required'), 'error');
    return;
  }
  
  if (!selectedCategory.value) {
    showNotification(t('prompts.form.category') + ' ' + t('common.required'), 'error');
    return;
  }
  
  isGenerating.value = true;
  try {
    generatedPrompt.value = await promptService.generatePrompt(instructions.value);
  } catch (error) {
    handleError(error, t('prompts.generator.generateError'));
  } finally {
    isGenerating.value = false;
  }
};
// --- Guardar directamente ---
const savePromptDirectly = async () => {
  if (!generatedPrompt.value.trim()) {
    showNotification(t('prompts.form.content') + ' ' + t('common.required'), 'error');
    return;
  }
  
  if (!selectedCategory.value) {
    showNotification(t('prompts.form.category') + ' ' + t('common.required'), 'error');
    return;
  }

  if (!promptName.value.trim()) {
    showNotification(t('prompts.form.title') + ' ' + t('common.required'), 'error');
    return;
  }
  
  isSaving.value = true;
  try {
    // Si no se proporciona un nombre, usar los primeros 3 palabras del prompt como título
    const name = promptName.value.trim() || (() => {
      const words = generatedPrompt.value.trim().split(/\s+/);
      return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    })();
    
    const payload = {
      name: name,
      value: generatedPrompt.value,
      description: promptDescription.value,
      category_id: selectedCategory.value?.value,
      is_favorite: isFavorite.value
    };
    
    const saved = await promptService.create(payload);
    emit('generated', { ...saved, saved: true });
    emit('close');
  } catch (error) {
    handleError(error, t('prompts.generator.saveError'));
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

.preview-form {
  margin: 1rem 0;
  border-top: 1px solid var(--card-border);
  padding-top: 1rem;
}

.preview-form .form-group {
  margin-bottom: 0.75rem;
}

.preview-form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.preview-form input[type="text"],
.preview-form textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  background-color: var(--card-background);
  color: var(--text-color);
}

.favorite-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.text-error {
  color: #ff5252;
  font-size: 0.9rem;
}
</style>
