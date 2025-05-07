
<template>
  <div v-if="show" class="modal-overlay" @click.self="cancel">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ $t('common.confirmDelete') }}</h3>
        <button class="btn-icon" @click="cancel">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>{{ $t('common.deleteConfirmMessage') }} "{{ itemName }}"?</p>
        <p v-if="warningMessage" class="text-danger">{{ warningMessage }}</p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="cancel">
          {{ $t('common.cancel') }}
        </button>
        <button class="btn-danger" @click="confirm">
          {{ $t('common.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  warningMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.text-danger {
  color: #dc3545;
}
</style>
