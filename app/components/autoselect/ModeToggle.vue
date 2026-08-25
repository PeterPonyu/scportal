<template>
  <div class="flex flex-wrap gap-2" role="group" aria-label="AutoSelect mode">
    <button
      type="button"
      class="min-h-11 rounded-xl border px-5 py-3 text-sm font-medium transition-colors"
      :class="mode === 'quick'
        ? 'border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
        : 'border-dark-300 text-dark-700 hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800'"
      :aria-pressed="mode === 'quick'"
      @click="emit('update:mode', 'quick')"
    >
      Quick
    </button>
    <button
      type="button"
      class="min-h-11 rounded-xl border px-5 py-3 text-sm font-medium transition-colors"
      :class="mode === 'advanced'
        ? 'border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-200'
        : 'border-dark-300 text-dark-700 hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800'"
      :aria-pressed="mode === 'advanced'"
      @click="emit('update:mode', 'advanced')"
    >
      Advanced
    </button>
  </div>
</template>

<script setup lang="ts">
import type { AutoSelectMode } from '../../autoselect/state'

defineProps<{
  mode: AutoSelectMode
}>()

const emit = defineEmits<{
  'update:mode': [value: AutoSelectMode]
}>()
</script>
