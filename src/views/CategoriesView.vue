<template>
  <div class="container">
    <div class="header">
      <div class="controls-container">
        <div class="search-box">
          <input v-model="state.searchQuery" type="text" class="search-input" :placeholder="t('common.search')" />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn-icon" @click="openAddModal()" :title="t('common.new')">
          <i class="bi bi-plus-circle"></i>
        </button>
      </div>
    </div>
    <div v-if="state.loading" class="loading">
      <div class="spinner"></div>
      <p>{{ t('common.loading') }}</p>
    </div>
    <div v-else class="grid">
      <div v-for="category in  filteredCategories " :key="category.id" class="card">
        <div class="sidebar-indicator" :style="{ backgroundColor: category.color }"></div>
        <div class="card-header">
          <h3 class="card-title">{{ category.name }}</h3>
          <div class="color-option" :style="{ backgroundColor: category.color }"></div>
        </div>
        <div class="card-body">
          <p class="card-text">
            {{ category.description || t('common.noDescription') }}
          </p>
          <p class="card-text">
            <span> <strong>{{ t('categories.status') }}: </strong> {{ Number(category.active) }}</span>
          </p>
          <p v-if="category.api_integration_id" class="card-text">
            <strong>{{ t('categories.apiIntegration') }}:</strong>
            {{ getApiIntegrationName(category.api_integration_id) }}
          </p>
        </div>
        <div class="card-actions" v-if="category.moodle_user_id !== 0">
          <button class=" btn-icon" @click="editCategory(category)" :title="t('common.edit')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-icon" @click="confirmDelete(category)" :title="t('common.delete')">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn-icon" @click="viewCategory(category)" :title="t('common.view')">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Crear/Editar -->
    <div v-if="state.showModal" class="modal-overlay" @click.self="state.showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>
            {{ state.editMode ? t('common.edit') : t('common.new') }}
            {{ t('categories.title') }}
          </h3>
          <button class="btn-icon" @click="state.showModal = false">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="name">{{ t('categories.name') }} *</label>
            <input id="name" v-model="state.currentCategory.name" type="text" class="form-control" maxlength="50"
              required />
            <small>{{ state.currentCategory.name.length }}/50</small>
          </div>
          <div class="form-group">
            <label for="description">{{ t('categories.description') }}</label>
            <textarea id="description" v-model="state.currentCategory.description" class="form-control" maxlength="250"
              rows="3"></textarea>
            <small>{{ state.currentCategory.description?.length || 0 }}/250</small>
          </div>
          <div class="form-group">
            <label>{{ t('categories.color') }} *</label>
            <input type="color" v-model="state.currentCategory.color" class="form-control"
              style="height: 40px; padding: 5px;" />
          </div>
          <div class="form-group">
            <label>{{ t('categories.apiIntegration') }} *</label>
            <select v-model="state.currentCategory.api_integration_id" class="form-control">
              <option v-for=" api  in  state.apiIntegrations " :key="api.id" :value="api.id">
                {{ api.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="active-toggle">{{ t('categories.status') }}</label>
            <div>
              <input type="checkbox" id="active-toggle" v-model="state.currentCategory.active" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="state.showModal = false">
            {{ t('common.cancel') }}
          </button>
          <button class="btn-primary" @click="saveCategory()">
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Ver -->
    <div v-if="state.showViewModal" class="modal-overlay" @click.self="state.showViewModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3> {{ state.currentCategory.name }}</h3>
          <button class="btn-icon" @click="state.showViewModal = false">
            ✖️
          </button>
        </div>
        <div class="modal-body">
          <p><strong>{{ t('categories.description') }}:</strong> {{ state.currentCategory.description || '-' }}</p>
          <p v-if="state.currentCategory.api_integration_id">
            <strong>{{ t('categories.apiIntegration') }}:</strong>
            {{ getApiIntegrationName(state.currentCategory.api_integration_id) }}
          </p>
          <p>
            <strong>{{ t('categories.status') }}:</strong>
            {{ state.currentCategory.active }}
          </p>
          <p :style="{ backgroundColor: state.currentCategory.color }">
            <strong>{{ t('categories.color') }} </strong>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="state.showViewModal = false">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Eliminar -->
    <DeleteConfirmDialog :show="state.showDeleteConfirm" :item-name="state.currentCategory.name"
      :warning-message="t('common.deleteWarning')" @confirm="deleteCategory" @cancel="state.showDeleteConfirm = false" />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { categoryService } from '@/services/CategoryService'
import { apiIntegrationService } from '@/services/ApiIntegrationService'
import { showNotification, handleError } from '@/utils/notifications'
import { Category } from '@/types'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'

// Estilos CSS añadidos en <style> al final del archivo

const { t } = useI18n()

const state = reactive({
  categories: [] as Category[],
  apiIntegrations: [] as { id: string; name: string }[],
  loading: true,
  showModal: false,
  showViewModal: false,
  showDeleteConfirm: false,
  editMode: false,
  searchQuery: '',
  currentCategory: {} as Category
})

const filteredCategories = computed(() => {
  const q = state.searchQuery.trim().toLowerCase()
  return q
    ? state.categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    )
    : state.categories
})

const loadCategories = async () => {
  state.loading = true
  try {
    const [cats, apiInts] = await Promise.all([
      categoryService.getAll(),
      apiIntegrationService.getAll()
    ])
    state.categories = cats
    state.apiIntegrations = apiInts
  } catch (e) {
    handleError(e, t('categories.loadError'))
  } finally {
    state.loading = false
  }
}

const openAddModal = () => {
  state.currentCategory = {
    active: true // Por defecto, las nuevas categorías están activas
  }
  state.editMode = false
  state.showModal = true
}

const viewCategory = (category: Category) => {
  state.currentCategory = { ...category }
  state.showViewModal = true
}

const saveCategory = async () => {
  try {
    if (!state.currentCategory.name) {
      showNotification(t('common.requiredField', { field: t('categories.name') }), 'error')
      return
    }
    if (!state.currentCategory.color) {
      showNotification(t('common.requiredField', { field: t('categories.color') }), 'error')
      return
    }
    if (!state.currentCategory.api_integration_id) {
      showNotification(t('common.requiredField', { field: t('categories.apiIntegration') }), 'error')
      return
    }
    if (state.editMode && state.currentCategory.id != null) {
      await categoryService.update(state.currentCategory)
      showNotification(t('common.updated'), 'success')
    } else {
      await categoryService.create(state.currentCategory)
      showNotification(t('common.created'), 'success')
    }
    state.showModal = false
    loadCategories()
  } catch (e) {
    handleError(e, t('common.saveError'))
  }
}

const editCategory = (category: Category) => {
  state.currentCategory = { ...category }
  state.editMode = true
  state.showModal = true
}

const confirmDelete = (category: Category) => {
  state.currentCategory = { ...category }
  state.showDeleteConfirm = true
}

const deleteCategory = async () => {
  const id = state.currentCategory.id
  if (id == null) return
  try {
    await categoryService.remove(id)
    showNotification(t('common.deleted'), 'success')
    state.showDeleteConfirm = false
    loadCategories()
  } catch (e) {
    handleError(e, t('common.deleteError'))
  }
}

const getApiIntegrationName = (id: string) => {
  const api = state.apiIntegrations.find(a => a.id === id)
  return api?.name || t('categories.unknownIntegration')
}

onMounted(() => {
  loadCategories()
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (state.showModal) state.showModal = false
      if (state.showViewModal) state.showViewModal = false
      if (state.showDeleteConfirm) state.showDeleteConfirm = false
    }
  }
  window.addEventListener('keydown', handleEscKey)
  return () => {
    window.removeEventListener('keydown', handleEscKey)
  }
})
</script>

<style scoped></style>
