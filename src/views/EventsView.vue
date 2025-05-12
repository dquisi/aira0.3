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
          <!-- Campo de descripción eliminado -->
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
          <div class="schedule-section">
            <div class="schedule-header">
              <h4>{{ t('events.schedule') }}</h4>
              <div class="schedule-type-toggle">
                <button 
                  class="schedule-type-btn" 
                  :class="{ active: scheduleType === 'single' }" 
                  @click="scheduleType = 'single'"
                >
                  <i class="bi bi-calendar-event"></i> {{ t('events.singleExecution') }}
                </button>
                <button 
                  class="schedule-type-btn" 
                  :class="{ active: scheduleType === 'recurring' }" 
                  @click="scheduleType = 'recurring'"
                >
                  <i class="bi bi-calendar-check"></i> {{ t('events.recurringExecution') }}
                </button>
              </div>
            </div>
            
            <div v-if="scheduleType === 'single'" class="schedule-content">
              <div class="schedule-row inline-schedule">
                <label>{{ t('events.executionDate') }}:</label>
                <div class="schedule-input-with-icon">
                  <i class="bi bi-calendar"></i>
                  <input 
                    v-model="currentEvent.next_execution_date" 
                    type="date" 
                    class="form-control date-picker" 
                    required 
                  />
                </div>
              </div>
              <div class="schedule-row inline-schedule">
                <label>Hora de ejecución:</label>
                <div class="time-picker-container">
                  <div class="time-display" @click="showTimePickerModal = true">
                    <span>{{ selectedHour.toString().padStart(2, '0') }}:{{ selectedMinute.toString().padStart(2, '0') }}</span>
                    <i class="bi bi-clock"></i>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="schedule-content">
              <!-- Interfaz de cron mejorada -->
              <div class="schedule-row">
                <label>{{ t('events.schedule') }}:</label>
                <div class="friendly-schedule-selector">
                  <!-- Selector de frecuencia principal -->
                  <div class="schedule-option-group">
                    <div class="schedule-selector-label">Frecuencia:</div>
                    <div class="frequency-options">
                      <button 
                        v-for="option in frequencyOptions" 
                        :key="option.value" 
                        class="frequency-option-btn" 
                        :class="{ active: selectedFrequency === option.value }"
                        @click="selectFrequency(option.value)">
                        <i :class="option.icon"></i> {{ option.label }}
                      </button>
                    </div>
                  </div>
                  
                  <!-- Opciones específicas según la frecuencia seleccionada -->
                  <div class="specific-options">
                    <!-- Diario -->
                    <div v-if="selectedFrequency === 'daily'" class="specific-option-group">
                      <div class="option-selector">
                        <div class="option-label">Cada día a las:</div>
                        <div class="time-picker-container">
                          <div class="time-display" @click="showTimePickerModal = true">
                            <span>{{ selectedHour.toString().padStart(2, '0') }}:{{ selectedMinute.toString().padStart(2, '0') }}</span>
                            <i class="bi bi-clock"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Semanal -->
                    <div v-if="selectedFrequency === 'weekly'" class="specific-option-group">
                      <div class="option-selector">
                        <div class="option-label">Día de la semana:</div>
                        <div class="date-picker-container">
                          <select v-model="selectedDayOfWeek" class="day-selector" @change="updateCronExpression">
                            <option v-for="(day, index) in weekDays" :key="index" :value="index">
                              {{ day }}
                            </option>
                          </select>
                          <i class="bi bi-calendar-week"></i>
                        </div>
                      </div>
                      <div class="option-selector">
                        <div class="option-label">A las:</div>
                        <div class="time-picker-container">
                          <div class="time-display" @click="showTimePickerModal = true">
                            <span>{{ selectedHour.toString().padStart(2, '0') }}:{{ selectedMinute.toString().padStart(2, '0') }}</span>
                            <i class="bi bi-clock"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Mensual -->
                    <div v-if="selectedFrequency === 'monthly'" class="specific-option-group">
                      <div class="option-selector">
                        <div class="option-label">Día del mes:</div>
                        <div class="date-picker-container">
                          <select v-model="selectedDayOfMonth" class="day-selector" @change="updateCronExpression">
                            <option v-for="day in 31" :key="day" :value="day">
                              {{ day }}
                            </option>
                          </select>
                          <i class="bi bi-calendar-date"></i>
                        </div>
                      </div>
                      <div class="option-selector">
                        <div class="option-label">A las:</div>
                        <div class="time-picker-container">
                          <div class="time-display" @click="showTimePickerModal = true">
                            <span>{{ selectedHour.toString().padStart(2, '0') }}:{{ selectedMinute.toString().padStart(2, '0') }}</span>
                            <i class="bi bi-clock"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Por hora -->
                    <div v-if="selectedFrequency === 'hourly'" class="specific-option-group">
                      <div class="option-selector">
                        <div class="option-label">Cada:</div>
                        <select v-model="selectedHourInterval" class="interval-selector" @change="updateCronExpression">
                          <option value="1">1 hora</option>
                          <option value="2">2 horas</option>
                          <option value="3">3 horas</option>
                          <option value="4">4 horas</option>
                          <option value="6">6 horas</option>
                          <option value="12">12 horas</option>
                        </select>
                      </div>
                    </div>
                    
                    <!-- Personalizado -->
                    <div v-if="selectedFrequency === 'custom'" class="specific-option-group">
                      <div class="custom-cron-input">
                        <div class="option-label">Expresión Cron:</div>
                        <input 
                          v-model="currentEvent.cron" 
                          type="text" 
                          class="form-control"
                          placeholder="0 12 * * *"
                        />
                        <div class="cron-hint">Formato: minuto hora día-mes mes día-semana</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Previsualización de la expresión -->
                  <div class="cron-preview">
                    <div class="cron-preview-label">Programado para:</div>
                    <div class="cron-preview-value">{{ formatCronDescription(currentEvent.cron) }}</div>
                    <div v-if="cronError" class="cron-error">
                      <i class="bi bi-exclamation-triangle"></i> {{ cronError }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="schedule-row quick-schedule inline-schedule">
                <label>{{ t('common.quickOptions') }}:</label>
                <div class="quick-options-grid">
                  <button class="quick-option-tile" @click="setQuickOption('0 0 * * *')">
                    <i class="bi bi-calendar-day"></i>
                    <span>{{ t('events.everyDay') }}</span>
                  </button>
                  <button class="quick-option-tile" @click="setQuickOption('0 * * * *')">
                    <i class="bi bi-clock"></i>
                    <span>{{ t('events.everyHour') }}</span>
                  </button>
                  <button class="quick-option-tile" @click="setQuickOption('0 12 * * *')">
                    <i class="bi bi-sun"></i>
                    <span>{{ t('events.everyNoon') }}</span>
                  </button>
                  <button class="quick-option-tile" @click="setQuickOption('0 0 * * 1')">
                    <i class="bi bi-calendar-week"></i>
                    <span>{{ t('events.everyWeek') }}</span>
                  </button>
                  <button class="quick-option-tile" @click="setQuickOption('0 9 * * 1-5')">
                    <i class="bi bi-briefcase"></i>
                    <span>{{ t('events.workingHours') }}</span>
                  </button>
                  <button class="quick-option-tile" @click="setQuickOption('0 8,17 * * *')">
                    <i class="bi bi-alarm"></i>
                    <span>{{ t('events.twiceDaily') }}</span>
                  </button>
                </div>
              </div>
              
              <div class="schedule-row inline-schedule">
                <label>{{ t('events.endDate') }}:</label>
                <div class="schedule-input-with-icon">
                  <i class="bi bi-calendar-x"></i>
                  <input 
                    v-model="currentEvent.end_date" 
                    type="date" 
                    class="form-control date-picker"
                  />
                </div>
              </div>
            </div>
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
    
    <!-- SELECTOR DE TIEMPO MODAL -->
    <div v-if="showTimePickerModal" class="modal-overlay" @click.self="showTimePickerModal = false">
      <div class="time-picker-modal">
        <div class="time-picker-header">
          <h3>Seleccionar Hora</h3>
          <button class="btn-icon" @click="showTimePickerModal = false">✖️</button>
        </div>
        <div class="time-picker-body">
          <div class="time-picker-clock">
            <div class="time-picker-section">
              <div class="time-picker-label">Hora</div>
              <div class="time-picker-wheel">
                <button 
                  v-for="hour in 24" 
                  :key="hour-1" 
                  :class="['time-picker-value', {'active': selectedHour === hour-1}]"
                  @click="selectedHour = hour-1; updateCronExpression();"
                >
                  {{ (hour-1).toString().padStart(2, '0') }}
                </button>
              </div>
            </div>
            <div class="time-picker-section">
              <div class="time-picker-label">Minutos</div>
              <div class="time-picker-wheel">
                <button 
                  v-for="min in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]" 
                  :key="min" 
                  :class="['time-picker-value', {'active': selectedMinute === min}]"
                  @click="selectedMinute = min; updateCronExpression();"
                >
                  {{ min.toString().padStart(2, '0') }}
                </button>
              </div>
            </div>
          </div>
          <div class="time-picker-preview">
            <div class="time-display-large">
              {{ selectedHour.toString().padStart(2, '0') }}:{{ selectedMinute.toString().padStart(2, '0') }}
            </div>
          </div>
        </div>
        <div class="time-picker-footer">
          <button class="btn-secondary" @click="showTimePickerModal = false">
            Cancelar
          </button>
          <button class="btn-primary" @click="showTimePickerModal = false">
            Aceptar
          </button>
        </div>
      </div>
    </div>
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
const selectedFrequency = ref('daily')
const selectedHour = ref(9)
const selectedMinute = ref(0)
const selectedDayOfWeek = ref(1) // Lunes
const selectedDayOfMonth = ref(1)
const selectedHourInterval = ref('1')
const showTimePickerModal = ref(false)
const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const frequencyOptions = [
  { value: 'daily', label: 'Diario', icon: 'bi bi-calendar-day' },
  { value: 'weekly', label: 'Semanal', icon: 'bi bi-calendar-week' },
  { value: 'monthly', label: 'Mensual', icon: 'bi bi-calendar-month' },
  { value: 'hourly', label: 'Por hora', icon: 'bi bi-clock' },
  { value: 'custom', label: 'Personalizado', icon: 'bi bi-sliders' }
]

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

function selectFrequency(frequency: string) {
  selectedFrequency.value = frequency
  updateCronExpression()
}

function updateCronExpression() {
  switch (selectedFrequency.value) {
    case 'daily':
      currentEvent.value.cron = `${selectedMinute.value} ${selectedHour.value} * * *`
      break
    case 'weekly':
      currentEvent.value.cron = `${selectedMinute.value} ${selectedHour.value} * * ${selectedDayOfWeek.value}`
      break
    case 'monthly':
      currentEvent.value.cron = `${selectedMinute.value} ${selectedHour.value} ${selectedDayOfMonth.value} * *`
      break
    case 'hourly':
      if (selectedHourInterval.value === '1') {
        currentEvent.value.cron = `${selectedMinute.value} * * * *`
      } else {
        currentEvent.value.cron = `${selectedMinute.value} */${selectedHourInterval.value} * * *`
      }
      break
  }
}

function setQuickOption(cronExpression: string) {
  currentEvent.value.cron = cronExpression
  
  // Actualizar el selector de frecuencia basado en la expresión cron seleccionada
  if (cronExpression === '0 0 * * *') {
    selectedFrequency.value = 'daily'
    selectedHour.value = 0
  } else if (cronExpression === '0 * * * *') {
    selectedFrequency.value = 'hourly'
    selectedHourInterval.value = '1'
  } else if (cronExpression === '0 12 * * *') {
    selectedFrequency.value = 'daily'
    selectedHour.value = 12
  } else if (cronExpression === '0 0 * * 1') {
    selectedFrequency.value = 'weekly'
    selectedDayOfWeek.value = 1
    selectedHour.value = 0
  } else if (cronExpression === '0 9 * * 1-5') {
    selectedFrequency.value = 'custom'
  } else if (cronExpression === '0 8,17 * * *') {
    selectedFrequency.value = 'custom'
  }
}

function formatCronDescription(cronExpression: string): string {
  const map: Record<string, string> = {
    '0 0 * * *': t('events.everyDay') + ' a medianoche',
    '0 * * * *': t('events.everyHour'),
    '0 12 * * *': t('events.everyNoon'),
    '0 0 * * 1': t('events.everyWeek') + ' (Lunes)',
    '0 9 * * 1-5': t('events.workingHours') + ' (9:00)',
    '0 8,17 * * *': t('events.twiceDaily') + ' (8:00 y 17:00)'
  }
  
  // Si no está en el mapa, generar una descripción personalizada
  if (!map[cronExpression]) {
    const parts = cronExpression.split(' ')
    if (parts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
      
      // Formato con intervalo de horas (*/X)
      if (minute.match(/^\d+$/) && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        const interval = hour.substring(2);
        const formattedMinute = minute.padStart(2, '0');
        return `Cada ${interval} horas en el minuto ${formattedMinute}`;
      }
      
      // Formato diario
      if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        const formattedHour = hour.padStart(2, '0');
        const formattedMinute = minute.padStart(2, '0');
        return `Diariamente a las ${formattedHour}:${formattedMinute}`;
      }
      
      // Formato cada hora
      if (minute.match(/^\d+$/) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `Cada hora en el minuto ${minute}`;
      }
      
      // Formato semanal
      if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth === '*' && month === '*' && dayOfWeek.match(/^\d+$/)) {
        const day = weekDays[parseInt(dayOfWeek)];
        const formattedHour = hour.padStart(2, '0');
        const formattedMinute = minute.padStart(2, '0');
        return `Cada ${day} a las ${formattedHour}:${formattedMinute}`;
      }
      
      // Formato mensual
      if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth.match(/^\d+$/) && month === '*' && dayOfWeek === '*') {
        const formattedHour = hour.padStart(2, '0');
        const formattedMinute = minute.padStart(2, '0');
        return `El día ${dayOfMonth} de cada mes a las ${formattedHour}:${formattedMinute}`;
      }
    }
  }
  
  return map[cronExpression] || cronExpression;
}

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
  }
  // Campo de descripción eliminado
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
  // Obtener fecha actual en formato YYYY-MM-DD
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  
  // Establecer hora actual
  selectedHour.value = today.getHours();
  selectedMinute.value = today.getMinutes();
  
  currentEvent.value = {
    id: null,
    name: '',
    prompt_id: null,
    next_execution_date: formattedDate, // Usamos next_execution_date para el campo de fecha
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
      // Combinar fecha y hora para ejecución única
      if (currentEvent.value.next_execution_date) {
        const formattedHour = selectedHour.value.toString().padStart(2, '0');
        const formattedMinute = selectedMinute.value.toString().padStart(2, '0');
        const dateString = `${currentEvent.value.next_execution_date}T${formattedHour}:${formattedMinute}:00`;
        currentEvent.value.next_execution = dateString;
      }
      currentEvent.value.cron = ""
      delete currentEvent.value.end_date
      delete currentEvent.value.next_execution_date // Eliminar propiedad temporal
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
    end_date: e.end_date
      ? new Date(e.end_date).toISOString().split('T')[0]
      : ''
  }
  
  // Manejar fecha y hora por separado para ejecución única
  if (e.next_execution) {
    const nextExecDate = new Date(e.next_execution);
    currentEvent.value.next_execution_date = nextExecDate.toISOString().split('T')[0];
    selectedHour.value = nextExecDate.getHours();
    selectedMinute.value = nextExecDate.getMinutes();
  }
  
  scheduleType.value = e.cron ? 'recurring' : 'single'
  
  // Configurar los selectores basados en la expresión cron existente
  if (e.cron) {
    // Analizar la expresión cron para establecer los valores de los selectores
    const parts = e.cron.split(' ')
    if (parts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
      
      // Expresiones diarias (0 X * * *)
      if (minute === '0' && hour.match(/^\d+$/) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        selectedFrequency.value = 'daily'
        selectedHour.value = parseInt(hour)
      } 
      // Expresiones semanales (0 X * * Y)
      else if (minute === '0' && hour.match(/^\d+$/) && dayOfMonth === '*' && month === '*' && dayOfWeek.match(/^\d+$/)) {
        selectedFrequency.value = 'weekly'
        selectedHour.value = parseInt(hour)
        selectedDayOfWeek.value = parseInt(dayOfWeek)
      }
      // Expresiones mensuales (0 X Y * *)
      else if (minute === '0' && hour.match(/^\d+$/) && dayOfMonth.match(/^\d+$/) && month === '*' && dayOfWeek === '*') {
        selectedFrequency.value = 'monthly'
        selectedHour.value = parseInt(hour)
        selectedDayOfMonth.value = parseInt(dayOfMonth)
      }
      // Expresiones horarias (0 * * * *)
      else if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        selectedFrequency.value = 'hourly'
        selectedHourInterval.value = '1'
      }
      // Intervalo de horas (0 */X * * *)
      else if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        selectedFrequency.value = 'hourly'
        selectedHourInterval.value = hour.substring(2)
      }
      // Si no coincide con ningún patrón, usar el modo personalizado
      else {
        selectedFrequency.value = 'custom'
      }
    } else {
      selectedFrequency.value = 'custom'
    }
  }
  
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