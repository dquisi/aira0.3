<template>
  <div class="syllabus-generator">
    <div class="generator-body">
      <div class="config-form">
        <div class="form-group">
          <label for="periods_count">{{ t('prompts.syllabus.periods') }}</label>
          <input id="periods_count" type="number" v-model.number="state.config.periods_count" min="1" max="10"
            class="form-control" />
        </div>
        <div class="form-group">
          <label for="days_per_period">{{ t('prompts.syllabus.daysPerPeriod') }}</label>
          <input id="days_per_period" type="number" v-model.number="state.config.days_per_period" min="1" max="100"
            class="form-control" />
        </div>
        <div class="form-group">
          <label for="init_date">{{ t('prompts.syllabus.initDate') }}</label>
          <input id="init_date" type="date" v-model="state.config.init_date" class="form-control" />
        </div>
        <div class="form-group">
          <label for="syllabus-upload">{{ t('prompts.syllabus.document') }}</label>
          <div class="file-upload-wrapper">
            <input id="syllabus-upload" type="file" @change="onFileChange" accept=".pdf,.xlsx,.xls,.docx,.csv,.pptx,.ppt"
              class="file-upload-input" />
            <div class="file-upload-info">
              <span v-if="state.file">{{ state.file.name }}</span>
              <span v-else class="text-muted">{{ t('prompts.syllabus.noFileSelected') }}</span>
            </div>
          </div>
          <small class="text-muted">{{ t('prompts.syllabus.allowedFormats') }}</small>
        </div>
      </div>
      <div class="syllabus-preview">
        <div v-if="state.content" class="preview-content">
          <h4>{{ t('prompts.syllabus.result') }}</h4>
          <div class="preview-prompt" v-html="formattedContent"></div>
        </div>
        <div v-else-if="state.isGenerating" class="preview-placeholder">
          <div class="placeholder-icon">
            <div class="spinner"></div>
          </div>
          <p>{{ t('prompts.syllabus.generating') }}</p>
        </div>
        <div v-else class="preview-placeholder">
          <div class="info-message">
            <p><i class="bi bi-info-circle"></i> {{ t('prompts.syllabus.info') }}</p>
            <p class="warning-text"><i class="bi bi-exclamation-triangle"></i> {{ t('prompts.syllabus.warning') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="generator-footer">
      <button class="btn-secondary" @click="$emit('close')">{{ t('common.cancel') }}</button>
      <button class="btn-primary" @click="generateSyllabus" :disabled="state.isGenerating">
        <i class="bi bi-magic" v-if="!state.isGenerating"></i>
        <div class="spinner-sm" v-else></div>
        {{ state.isGenerating ? t('prompts.syllabus.generating') : t('prompts.syllabus.generate') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import promptService from '@/services/PromptService'
import { showNotification, handleError } from '@/utils/notifications'

const { t } = useI18n()

const state = reactive({
  config: {
    periods_count: 1,
    days_per_period: 30,
    init_date: new Date().toISOString().split('T')[0]
  },
  file: null as File | null,
  isGenerating: false,
  content: ''
})

const formattedContent = computed(() =>
  state.content
    ? state.content
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>')
    : ''
)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] || null
  if (file) {
    const ext = file.name.split('.').pop()!.toLowerCase()
    if (['pdf', 'xlsx', 'xls', 'docx', 'csv', 'pptx', 'ppt'].includes(ext)) {
      state.file = file
      return
    }
  }
  showNotification(t('prompts.syllabus.invalidFile'), 'error')
  state.file = null
}
async function generateSyllabus() {
  if (state.config.periods_count > 0 && state.config.days_per_period > 0) {
    state.isGenerating = true
    try {
      state.content = await promptService.generateSyllabus(state.config, state.file)
      showNotification(t('prompts.syllabus.generated'), 'success')
    } catch (err) {
      handleError(err, t('common.error') || 'Error')
    } finally {
      state.isGenerating = false
    }
  } else {
    showNotification(t('common.invalidNumber'), 'error')
  }
}

</script>

<style scoped>
.text-muted {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  background: var(--card-background);
}

.preview-prompt {
  white-space: pre-wrap;
  max-height: 60vh;
  overflow-y: auto;
  padding: 1rem;
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 4px;
}

.info-message {
  padding: 0.75rem;
  background: rgba(0, 128, 192, 0.05);
  border: 1px solid rgba(0, 128, 192, 0.1);
}

.warning-text {
  color: var(--warning-color);
}

.generator-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
