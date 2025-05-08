
<template>
  <div>
    <div class="tabs mb-3">
      <button class="tab-btn" :class="{ active: activeTab === 'import' }" @click="activeTab = 'import'">
        {{ $t('prompts.importExport.import') }}
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'export' }" @click="activeTab = 'export'; loadPrompts()">
        {{ $t('prompts.importExport.export') }}
      </button>
    </div>
    <div v-if="activeTab === 'import'" class="import-section">
      <div class="tabs mb-2">
        <button class="tab-btn" :class="{ active: importMode === 'file' }" @click="importMode = 'file'">
          {{ $t('prompts.importExport.importFile') }}
        </button>
        <button class="tab-btn" :class="{ active: importMode === 'text' }" @click="importMode = 'text'">
          {{ $t('prompts.importExport.importText') }}
        </button>
      </div>
      <div v-if="importMode === 'file'" class="file-import">
        <div class="file-drop-area p-3 mb-3" @dragover.prevent @drop.prevent="onFileDrop"
          :class="{ 'drag-over': isDragging }" @dragenter.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false">
          <input type="file" ref="fileInput" accept=".json" @change="handleFileUpload" style="display: none">
          <div class="text-center">
            <button class="btn-primary" @click="$refs.fileInput.click()">
              <i class="bi bi-upload mr-1"></i> {{ $t('prompts.importExport.selectFile') }}
            </button>
            <p class="mt-2">O arrastra y suelta un archivo JSON aquí</p>
            <p v-if="selectedFile" class="mt-1">
              <strong>Archivo:</strong> {{ selectedFile.name }}
            </p>
          </div>
        </div>
        <button class="btn-primary" :disabled="!selectedFile" @click="importFromFile">
          {{ $t('prompts.importExport.import') }}
        </button>
      </div>
      <div v-else class="json-import">
        <div class="text-center">
          <p class="mb-2">Pega el JSON Prompt</p>
          <textarea v-model="jsonText" rows="8"></textarea>
        </div>
        <button class="btn-primary" @click="importFromText" :disabled="!jsonText.trim()">
          {{ $t('prompts.importExport.import') }}
        </button>
      </div>
    </div>
    <!-- Pestaña de exportación -->
    <div v-else class="export-section">
      <div class="flex items-center justify-between mb-2">
        <div class="checkbox-container">
          <input type="checkbox" id="select-all" :checked="selectAll" @change="toggleSelectAll" />
          <label for="select-all" class="ml-1">
            {{ selectAll ? $t('prompts.importExport.deselectAll') : $t('prompts.importExport.selectAll') }}
          </label>
        </div>
        <span>{{ selectedPrompts.length }} seleccionados</span>
      </div>
      <div class="prompt-list-export">
        <div v-if="isLoadingPrompts" class="text-center p-3">
          <div class="spinner-sm"></div>
          <p class="mt-2">Cargando prompts...</p>
        </div>
        <div v-else-if="prompts.length === 0" class="text-center p-3">
          {{ $t('prompts.noPrompts') }}
        </div>
        <div v-else>
          <div v-for="prompt in prompts" :key="prompt.id" class="prompt-export-item p-2">
            <div class="checkbox-container flex items-center">
              <input type="checkbox" :id="`prompt-${prompt.id}`" v-model="selectedPrompts" :value="prompt.id" />
              <label :for="`prompt-${prompt.id}`" class="prompt-export-title ml-1">
                {{ prompt.name }}
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-3">
        <button class="btn-primary" @click="exportSelected" :disabled="selectedPrompts.length === 0">
          <i class="bi bi-file-export mr-1"></i>
          {{ $t('prompts.importExport.exportFile') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import promptService from '@/services/PromptService'
import type { Prompt } from '@/types'
import { showNotification, handleError } from '@/utils/notifications'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const emit = defineEmits(['close'])
const fileInput = ref<HTMLInputElement | null>(null)
const activeTab = ref('import')
const importMode = ref('file')
const jsonText = ref('')
const prompts = ref<Prompt[]>([])
const selectedPrompts = ref<string[]>([])
const selectedFile = ref<File | null>(null)
const selectAll = ref(false)
const isDragging = ref(false)
const isLoadingPrompts = ref(false)

// Cargar prompts al iniciar o cambiar a la pestaña de exportación
const loadPrompts = async () => {
  if (activeTab.value === 'export' && prompts.value.length === 0) {
    isLoadingPrompts.value = true
    try {
      const result = await promptService.getAll()
      prompts.value = result || []
    } catch (error) {
      handleError(error, 'Error al cargar prompts')
    } finally {
      isLoadingPrompts.value = false
    }
  }
}
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedPrompts.value = []
  } else {
    selectedPrompts.value = prompts.value.map(p => p.id)
  }
  selectAll.value = !selectAll.value
}
watch(selectedPrompts, (newValue) => {
  const allSelected = newValue.length > 0 && newValue.length === prompts.value.length
  if (selectAll.value !== allSelected) {
    selectAll.value = allSelected
  }
})
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}
const onFileDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      selectedFile.value = file
    } else {
      showNotification('Solo se permiten archivos JSON', 'error')
    }
  }
}
const importFromFile = async () => {
  if (!selectedFile.value) {
    showNotification('No hay archivo seleccionado', 'error')
    return
  }
  try {
    const importedPrompts = await promptService.importFromFile(selectedFile.value)
    showNotification(`${importedPrompts.length} prompts importados correctamente`, 'success')
    emit('close')
  } catch (error) {
    handleError(error, 'Error al importar prompts')
  }
}
const importFromText = async () => {
  if (!jsonText.value.trim()) {
    showNotification('No hay contenido para importar', 'error')
    return
  }
  try {
    const importedPrompts = await promptService.importFromText(jsonText.value)
    showNotification(`${importedPrompts.length} prompts importados correctamente`, 'success')
    emit('close')
  } catch (error) {
    handleError(error, 'Error al importar prompts')
  }
}
const exportSelected = () => {
  if (selectedPrompts.value.length === 0) {
    showNotification('No hay prompts seleccionados', 'warning')
    return
  }
  const selectedPromptsData = prompts.value
    .filter(p => selectedPrompts.value.includes(p.id))
  promptService.exportToFile(selectedPromptsData)
  showNotification('Prompts exportados correctamente', 'success')
}
</script>

<style scoped>
.tabs {
  display: flex;
  margin-bottom: 1rem;
  width: 100%;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--card-border);
  background-color: var(--card-background);
  color: var(--text-color);
  cursor: pointer;
  flex: 1;
  text-align: center;
  transition: all 0.2s;
}

.tab-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.tab-btn:last-child {
  border-radius: 0 4px 4px 0;
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.import-section, 
.export-section {
  width: 100%;
  max-width: 90%;
  margin: 0 auto;
}

.prompt-export-item {
  padding: 0.75rem;
  border-bottom: 1px solid var(--card-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.prompt-export-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.prompt-export-item:last-child {
  border-bottom: none;
}

.prompt-export-title {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.file-drop-area {
  border: 2px dashed var(--card-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background-color: var(--card-background);
  transition: all 0.2s;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.file-drop-area.drag-over {
  border-color: var(--primary-color);
  background-color: rgba(0, 128, 192, 0.05);
}

.json-import textarea {
  width: 100%;
  min-height: 200px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background-color: var(--card-background);
  color: var(--text-color);
}

.prompt-list-export {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background-color: var(--card-background);
  margin-bottom: 1rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.checkbox-container {
  display: flex;
  align-items: center;
}

.ml-1 {
  margin-left: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.p-2 {
  padding: 0.5rem;
}

.p-3 {
  padding: 0.75rem;
}

.mr-1 {
  margin-right: 0.25rem;
}
</style>
