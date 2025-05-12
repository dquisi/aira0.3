<template>
  <div class="container">
    <div class="header">
      <div class="controls-container">
        <div class="status-filter">
          <button v-for="opt in filterOptions" :key="opt.key" :class="{ active: activeFilter === opt.key }"
            @click="activeFilter = opt.key">
            {{ opt.label }}
          </button>
        </div>
        <div class="search-box">
          <input v-model="searchQuery" type="text" class="search-input" :placeholder="t('common.search')" />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn-icon" @click="openAddModal" :title="t('common.new')">
          <i class="bi bi-plus-circle"></i>
        </button>
      </div>
    </div>
    <!-- CARGANDO / VACÍO -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ t('common.loading') }}</p>
    </div>
    <div v-else-if="!filteredEvents.length" class="empty">
      <p>{{ t('common.noData') }}</p>
    </div>
    <!-- GRID DE EVENTOS -->
    <div v-else class="grid">
      <div v-for="event in filteredEvents" :key="event.id" class="card">
        <div class="sidebar-indicator" :style="{ backgroundColor: getStatusColor(event.status) }"></div>
        <div class="card-header">
          <h3 class="card-title">{{ event.name }}</h3>
          <div class="card-badge" :style="{ backgroundColor: getStatusColor(event.status) }">
            {{ getStatusText(event.status) }}
          </div>
        </div>
        <div class="card-body">
          <p v-if="event.prompt?.name">
            <strong>{{ t('events.prompt') }}:</strong> {{ event.prompt.name }}
          </p>
          <p v-if="event.cron">
            <strong>{{ t('events.schedule') }}:</strong> {{ formatCron(event.cron) }}
          </p>
          <p v-else-if="event.next_execution">
            <strong>{{ t('events.nextExecution') }}:</strong>
            {{ formatDate(event.next_execution) }}
          </p>
          <p v-if="event.end_date">
            <strong>{{ t('events.endDate') }}:</strong>
            {{ formatDate(event.end_date) }}
          </p>
          <div v-if="event.inputs && Object.keys(event.inputs).length" class="parameters-list">
            <h4 class="parameters-title">{{ t('events.parameters') }}</h4>
            <div v-for="(val, key) in event.inputs" :key="key" class="parameter-item">
              <span class="parameter-name">{{ key }}:</span>
              <span class="parameter-value">{{ val }}</span>
            </div>
          </div>
        </div>
        <!-- ACCIONES -->
        <div class="card-actions">
          <button v-for="act in cardActions" :key="act.key" class="btn-icon" @click="act.handler(event)"
            :title="typeof act.title === 'function' ? act.title(event) : act.title">
            <i :class="act.icon(event)"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL CREAR/EDITAR -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <header class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="btn-icon" @click="showModal = false">✖️</button>
        </header>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ t('events.name') }} *</label>
            <input v-model="currentEvent.name" type="text" class="form-control" maxlength="50" required />
            <small v-if="currentEvent.name">{{ currentEvent.name.length || 0 }}/50</small>
          </div>
          <div class="form-group">
            <label>{{ t('common.description') }}</label>
            <textarea v-model="currentEvent.description" class="form-control" maxlength="250" rows="3"></textarea>
            <small v-if="currentEvent.description">{{ currentEvent.description.length || 0 }}/250</small>
          </div>
          <div class="form-group">
            <label>{{ t('events.prompt') }} *</label>
            <v-select v-model="currentEvent.prompt_id" :options="promptOptions" :reduce="o => o.id"
              @update:modelValue="onPromptChange" />
          </div>
          <div v-if="promptInputs.length" class="form-group prompt-inputs">
            <h4>{{ t('events.promptParameters') }}</h4>
            <div v-for="param in promptInputs" :key="param.name" class="input-parameter">
              <label>{{ param.name }}</label>
              <input v-model="currentEvent.inputs[param.name]" type="text" class="form-control"
                :placeholder="t('events.enterValue', { param: param.name })" />
            </div>
          </div>
          <div class="form-group">
            <label>{{ t('events.scheduleType') }}</label>
            <select v-model="scheduleType" class="form-control">
              <option value="single">{{ t('events.singleExecution') }}</option>
              <option value="recurring">{{ t('events.recurringExecution') }}</option>
            </select>
          </div>
          <div v-if="scheduleType === 'single'" class="form-group">
            <label>{{ t('events.executionDate') }}</label>
            <input v-model="currentEvent.next_execution" type="datetime-local" class="form-control" required />
          </div>
          <div v-else class="form-group">
            <label>{{ t('events.cronExpression') }}</label>
            <cron-light v-model="currentEvent.cron" @error="cronError = $event" :locale="locale" />
            <small>{{ t('events.cronHelp') }}</small>
          </div>
          <div v-if="scheduleType === 'recurring'" class="form-group">
            <label>{{ t('events.endDate') }}</label>
            <input v-model="currentEvent.end_date" type="datetime-local" class="form-control" />
          </div>
          <div class="form-check">
            <input id="active" v-model="currentEvent.active" type="checkbox" class="form-check-input" />
            <label for="active" class="form-check-label">
              {{ t('events.active') }}
            </label>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="btn-secondary" @click="showModal = false">
            {{ t('common.cancel') }}
          </button>
          <button class="btn-primary" @click="saveEvent">
            {{ t('common.save') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL VER DETALLE -->
    <div v-if="showViewModal" class="modal-overlay" @click.self="showViewModal = false">
      <div class="modal">
        <header class="modal-header">
          <h3>{{ t('common.view') }} {{ t('events.title') }}</h3>
          <button class="btn-icon" @click="showViewModal = false">✖️</button>
        </header>
        <div class="modal-body event-details">
          <div v-for="field in viewFields" :key="field.key" class="event-detail">
            <strong>{{ field.label }}:</strong>
            <span v-if="field.format">{{ field.format(currentEvent[field.key]) }}</span>
            <span v-else>{{ currentEvent[field.key] }}</span>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="btn-primary" @click="showViewModal = false">
            {{ t('common.close') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- CONFIRMACIÓN ELIMINAR -->
    <DeleteConfirmDialog :show="showDeleteConfirm" :item-name="currentEvent.name"
      :warning-message="t('common.deleteWarning')" @confirm="deleteEvent" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import vSelect from 'vue-select'
import { CronLight } from '@vue-js-cron/light'
import { eventService } from '@/services/EventService'
import { promptService } from '@/services/PromptService'
import { showNotification, handleError } from '@/utils/notifications'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import type { Event, Prompt } from '@/types'

const { t, locale } = useI18n()
const events = ref<Event[]>([])
const prompts = ref<Prompt[]>([])
const promptInputs = ref<{ name: string; value: string }[]>([])
const loading = ref(true)
const showModal = ref(false)
const showViewModal = ref(false)
const showDeleteConfirm = ref(false)
const editMode = ref(false)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
const scheduleType = ref<'single' | 'recurring'>('single')
const cronError = ref<string | null>(null)

const currentEvent = ref<Partial<Event>>({
  id: null,
  name: '',
  description: '',
  prompt_id: null,
  next_execution: new Date(Date.now() + 3600000)
    .toISOString()
    .slice(0, 16),
  cron: '0 0 * * *',
  end_date: '',
  status: 'pending',
  active: true,
  inputs: {}
})

// Opciones
const filterOptions = computed(() => [
  { key: 'all', label: t('common.all') },
  { key: 'active', label: t('events.activeOnly') },
  { key: 'inactive', label: t('events.inactiveOnly') }
])

const cardActions = computed(() => [
  {
    key: 'edit',
    icon: () => 'bi bi-pencil',
    title: t('common.edit'),
    handler: editEvent
  },
  {
    key: 'delete',
    icon: () => 'bi bi-trash',
    title: t('common.delete'),
    handler: confirmDelete
  },
  {
    key: 'toggle',
    icon: (e: Event) =>
      e.active ? 'bi bi-pause-circle' : 'bi bi-play-circle',
    title: (e: Event) =>
      e.active ? t('events.deactivate') : t('events.activate'),
    handler: toggleActive
  },
  {
    key: 'view',
    icon: () => 'bi bi-eye',
    title: t('common.view'),
    handler: viewEvent
  }
])

const promptOptions = computed(() =>
  prompts.value.map(p => ({ label: p.name, id: p.id }))
)

const viewFields = computed(() => [
  { key: 'name', label: t('common.name') },
  {
    key: 'prompt',
    label: t('events.prompt'),
    format: (v: any) => v?.name || currentEvent.value.prompt_id
  },
  {
    key: 'next_execution',
    label: t('events.nextExecution'),
    format: formatDate
  },
  {
    key: 'cron',
    label: t('events.schedule'),
    format: formatCron
  },
  {
    key: 'end_date',
    label: t('events.endDate'),
    format: formatDate
  },
  {
    key: 'status',
    label: t('events.status'),
    format: (s: string) => getStatusText(s)
  },
  {
    key: 'active',
    label: t('events.active'),
    format: (a: boolean) => (a ? t('common.yes') : t('common.no'))
  },
  {
    key: 'inputs',
    label: t('events.parameters'),
    format: (inp: Record<string, any>) =>
      Object.entries(inp)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
  },
  { key: 'description', label: t('events.description') }
])

// Filtrado
const filteredEvents = computed(() =>
  events.value
    .filter(e =>
      activeFilter.value === 'all'
        ? true
        : activeFilter.value === 'active'
          ? e.active
          : !e.active
    )
    .filter(e =>
      e.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
)

// Helpers
function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleString() : ''
}

function formatCron(expr: string) {
  const map: Record<string, string> = {
    '0 0 * * *': t('events.everyDay'),
    '0 * * * *': t('events.everyHour')
  }
  return map[expr] || expr
}

function getStatusColor(s: string) {
  const c: Record<string, string> = {
    pending: '#FFA500',
    scheduled: '#2196F3',
    running: '#4CAF50',
    completed: '#9E9E9E',
    failed: '#F44336'
  }
  return c[s] || '#999'
}

function getStatusText(s: string) {
  const m: Record<string, string> = {
    pending: t('events.pending'),
    scheduled: t('events.scheduled'),
    running: t('events.running'),
    completed: t('events.completed'),
    failed: t('events.failed')
  }
  return m[s] || s
}

const modalTitle = computed(() =>
  `${editMode.value ? t('common.edit') : t('common.new')} ${t('events.title')}`
)

// CRUD & lógica
async function loadData() {
  loading.value = true
  try {
    const [evs, prs] = await Promise.all([
      eventService.getAll(),
      promptService.getAll()
    ])
    events.value = evs
    prompts.value = prs
  } catch (err) {
    handleError(err, t('errors.loadData'))
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  currentEvent.value = {
    id: null,
    name: '',
    description: '',
    prompt_id: null,
    next_execution: new Date(Date.now() + 3600000)
      .toISOString()
      .slice(0, 16),
    cron: '0 0 * * *',
    end_date: '',
    status: 'pending',
    active: true,
    inputs: {}
  }
  promptInputs.value = []
  scheduleType.value = 'single'
  editMode.value = false
  showModal.value = true
}

async function onPromptChange() {
  const id = currentEvent.value.prompt_id
  if (!id) {
    promptInputs.value = []
    return
  }
  const prm = prompts.value.find(p => p.id === id)
  if (!prm) return
  const params = promptService.extractParameters(prm.value)
  promptInputs.value = params
  currentEvent.value.inputs = params.reduce(
    (acc, param) => ({ ...acc, [param.name]: '' }),
    {}
  )
}

async function saveEvent() {
  try {
    if (!currentEvent.value.name?.trim()) {
      showNotification(t('common.requiredField', { field: t('events.name') }), 'error')
      return
    }
    if (!currentEvent.value.prompt_id) {
      showNotification(t('common.requiredField', { field: t('events.prompt') }), 'error')
      return
    }

    if (scheduleType.value === 'single') {
      currentEvent.value.cron = ""
      delete currentEvent.value.end_date
    } else {
      delete currentEvent.value.next_execution
    }

    if (editMode.value && currentEvent.value.id) {
      await eventService.update(currentEvent.value as Event)
      showNotification(t('common.updated'), 'success')
    } else {
      await eventService.create(currentEvent.value as Event)
      showNotification(t('common.created'), 'success')
    }
    showModal.value = false
    await loadData()
  } catch (err) {
    handleError(err, t('common.error'))
  }
}

function editEvent(e: Event) {
  currentEvent.value = {
    ...e,
    next_execution: e.next_execution
      ? new Date(e.next_execution).toISOString().slice(0, 16)
      : '',
    end_date: e.end_date
      ? new Date(e.end_date).toISOString().slice(0, 16)
      : ''
  }
  scheduleType.value = e.cron ? 'recurring' : 'single'
  editMode.value = true
  onPromptChange()
  showModal.value = true
}

function confirmDelete(e: Event) {
  currentEvent.value = { ...e }
  showDeleteConfirm.value = true
}

async function deleteEvent() {
  if (!currentEvent.value.id) return
  try {
    await eventService.remove(currentEvent.value.id)
    showNotification(t('common.delete'), 'success')
    showDeleteConfirm.value = false
    await loadData()
  } catch (err) {
    handleError(err, t('common.error'))
  }
}

async function toggleActive(e: Event) {
  try {
    await eventService.update({ ...e, active: !e.active })
    showNotification(
      t(e.active ? 'events.deactivate' : 'events.activate'),
      'success'
    )
    await loadData()
  } catch (err) {
    handleError(err, t('common.error'))
  }
}

function viewEvent(e: Event) {
  currentEvent.value = { ...e }
  showViewModal.value = true
}
onMounted(() => {
  loadData()
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showModal.value) showModal.value = false
      if (showViewModal.value) showViewModal.value = false
      if (showDeleteConfirm.value) showDeleteConfirm.value = false
    }
  }
  window.addEventListener('keydown', handleEscKey)
  return () => {
    window.removeEventListener('keydown', handleEscKey)
  }
})
</script>