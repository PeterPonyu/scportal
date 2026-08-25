<template>
  <fieldset class="space-y-3 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
    <legend class="px-1 text-sm font-semibold text-dark-900 dark:text-white">
      {{ legend }}
    </legend>
    <p v-if="description" class="text-sm text-dark-600 dark:text-dark-400">
      {{ description }}
    </p>
    <div class="grid gap-2">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-200 px-3 py-3 text-sm transition-colors hover:border-primary-300 hover:bg-primary-50/60 dark:border-dark-700 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
        :class="isSelected(option.value) ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/40' : ''"
      >
        <input
          :type="multiple ? 'checkbox' : 'radio'"
          :name="groupName"
          :value="option.value"
          :checked="isSelected(option.value)"
          :disabled="isDisabled(option.value)"
          class="mt-1 h-4 w-4 shrink-0 accent-primary-600"
          @change="onChange(option.value, ($event.target as HTMLInputElement).checked)"
        >
        <span>
          <span class="block font-medium text-dark-900 dark:text-white">{{ option.label }}</span>
          <span v-if="option.help" class="mt-0.5 block text-xs text-dark-500 dark:text-dark-400">{{ option.help }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
interface ChoiceOption {
  value: string
  label: string
  help?: string
}

const props = withDefaults(defineProps<{
  legend: string
  description?: string
  options: ChoiceOption[]
  multiple?: boolean
  max?: number
  modelValue: string | string[] | null
}>(), {
  description: '',
  multiple: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const groupName = computed(() => `autoselect-${props.legend.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)

function selectedValues(): string[] {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  }
  return typeof props.modelValue === 'string' ? [props.modelValue] : []
}

function isSelected(value: string): boolean {
  return selectedValues().includes(value)
}

function isDisabled(value: string): boolean {
  if (!props.multiple || props.max === undefined) return false
  return selectedValues().length >= props.max && !isSelected(value)
}

function onChange(value: string, checked: boolean) {
  if (!props.multiple) {
    emit('update:modelValue', value)
    return
  }
  const current = selectedValues()
  if (checked) {
    if (props.max !== undefined && current.length >= props.max) return
    if (!current.includes(value)) emit('update:modelValue', [...current, value])
    return
  }
  emit('update:modelValue', current.filter((entry) => entry !== value))
}
</script>
