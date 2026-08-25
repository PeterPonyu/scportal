<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Candidate methods</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Optional allowlist from the method catalog. Unknown method ids cannot enter the profile.
      Leave every method unchecked to keep the full catalog.
    </p>
    <div class="grid gap-3">
      <label
        v-for="method in methods"
        :key="method.id"
        class="flex cursor-pointer items-start gap-3 rounded-2xl border border-dark-200 bg-white px-4 py-3 text-sm dark:border-dark-800 dark:bg-dark-900"
      >
        <input
          type="checkbox"
          class="mt-1 h-4 w-4 shrink-0 accent-primary-600"
          :value="method.id"
          :checked="isSelected(method.id)"
          @change="onToggle(method.id, ($event.target as HTMLInputElement).checked)"
        >
        <span class="grid min-w-0 flex-1 gap-1">
          <span class="flex flex-wrap items-center gap-2">
            <span class="font-mono font-medium text-dark-900 dark:text-white">{{ method.id }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="method.executable
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'"
            >
              {{ method.executable ? 'executable' : 'not executable' }}
            </span>
          </span>
          <span class="text-xs text-dark-500 dark:text-dark-400">
            modality {{ method.modalities.join(', ') }}
            · goals {{ method.supportedGoals.join(', ') }}
            · resource tier {{ method.resourceTier }}
          </span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import methodsJson from '../../../data/router/methods.json'
import type { MethodCapability } from '../../core/router/types'

const props = defineProps<{
  modelValue?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[] | undefined]
}>()

const methods = methodsJson as MethodCapability[]
const knownIds = new Set(methods.map((method) => method.id))

function allowedIds(ids: string[] | undefined): string[] {
  return (ids ?? []).filter((id) => knownIds.has(id))
}

function isSelected(id: string): boolean {
  return allowedIds(props.modelValue).includes(id)
}

function onToggle(id: string, checked: boolean) {
  if (!knownIds.has(id)) return
  const current = allowedIds(props.modelValue)
  const next = checked
    ? (current.includes(id) ? current : [...current, id])
    : current.filter((entry) => entry !== id)
  emit('update:modelValue', next.length === 0 ? undefined : next)
}
</script>
