<template>
  <section class="space-y-3" aria-label="Local configuration downloads">
    <h4 class="text-sm font-medium text-dark-900 dark:text-white">Local configuration</h4>
    <p
      v-if="method && !canDownload(method)"
      class="text-sm text-dark-600 dark:text-dark-400"
    >
      This catalog method is not executable, so local configuration download is unavailable.
    </p>
    <template v-else-if="artifacts">
      <p class="break-all font-mono text-xs text-dark-600 dark:text-dark-400">
        Profile fingerprint {{ fingerprint }}
      </p>
      <dl class="grid gap-3 text-sm">
        <div>
          <dt class="font-medium text-dark-500 dark:text-dark-400">Install command</dt>
          <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ artifacts.installCommand }}</dd>
        </div>
        <div>
          <dt class="font-medium text-dark-500 dark:text-dark-400">Preprocessing</dt>
          <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ preprocessingLabel }}</dd>
        </div>
        <div>
          <dt class="font-medium text-dark-500 dark:text-dark-400">Output keys</dt>
          <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ outputKeysLabel }}</dd>
        </div>
      </dl>
      <fieldset v-if="availableAdapters.length > 0" class="space-y-2">
        <legend class="text-sm font-medium text-dark-900 dark:text-white">Adapters</legend>
        <label
          v-if="availableAdapters.includes('scFocus')"
          class="flex items-center gap-2 text-sm text-dark-700 dark:text-dark-300"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-primary-600"
            value="scFocus"
            :checked="selectedAdapters.includes('scFocus')"
            @change="onAdapterToggle('scFocus', ($event.target as HTMLInputElement).checked)"
          >
          scFocus
        </label>
        <label
          v-if="availableAdapters.includes('scRL')"
          class="flex items-center gap-2 text-sm text-dark-700 dark:text-dark-300"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-primary-600"
            value="scRL"
            :checked="selectedAdapters.includes('scRL')"
            @change="onAdapterToggle('scRL', ($event.target as HTMLInputElement).checked)"
          >
          scRL
        </label>
      </fieldset>
      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="min-h-11 rounded-xl border border-dark-300 px-5 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800"
          @click="onDownload('json')"
        >
          Download JSON
        </button>
        <button
          type="button"
          class="min-h-11 rounded-xl border border-dark-300 px-5 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800"
          @click="onDownload('yaml')"
        >
          Download YAML
        </button>
        <button
          type="button"
          class="min-h-11 rounded-xl border border-dark-300 px-5 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800"
          @click="onDownload('python')"
        >
          Download Python
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import methodsJson from '../../../data/router/methods.json'
import templatesJson from '../../../data/router/config-templates.json'
import { currentBoundProfile, boundRunFromWorkerState } from '../../autoselect/resultBinding'
import type { AdapterName } from '../../core/config/types'
import type { MethodCapability, Recommendation, RouterOutcome, TaskProfile } from '../../core/router/types'
import {
  canDownload,
  compileIfDownloadable,
  declaredAdapters,
  DEFAULT_ADAPTERS,
  downloadCompiled,
  type CompileConfigFn,
} from '../../services/download'

const { compileConfig } = await import('../../core/config/compiler.ts' as string) as {
  compileConfig: CompileConfigFn
}

const props = defineProps<{
  recommendation: Recommendation
}>()

const methods = methodsJson as MethodCapability[]
const templates = templatesJson as unknown[]
const { state: router } = useRouterWorker()
const selectedAdapters = ref<AdapterName[]>([...DEFAULT_ADAPTERS])

const method = computed(() => methods.find((entry) => entry.id === props.recommendation.methodId))
const template = computed(() => templates.find((entry) => {
  return Boolean(entry && typeof entry === 'object' && 'methodId' in entry && entry.methodId === props.recommendation.methodId)
}))
const availableAdapters = computed(() => declaredAdapters(template.value))
const okOutcome = computed((): Extract<RouterOutcome, { status: 'OK' }> | null => {
  const outcome = router.value.outcome
  return outcome?.status === 'OK' ? outcome : null
})
const profile = computed((): TaskProfile | null => {
  return currentBoundProfile(boundRunFromWorkerState(router.value), router.value.submittedProfile)
})
const artifacts = computed(() => {
  if (!import.meta.client) return null
  const currentMethod = method.value
  const outcome = okOutcome.value
  const currentProfile = profile.value
  if (!currentMethod || !canDownload(currentMethod) || !outcome || !currentProfile) return null
  try {
    return compileIfDownloadable(currentMethod, {
      outcome,
      profile: currentProfile,
      role: props.recommendation.roles[0],
      adapters: selectedAdapters.value,
      generatedAt: new Date().toISOString(),
    }, compileConfig)
  }
  catch {
    return null
  }
})
const fingerprint = computed(() => {
  return artifacts.value?.config.provenance.profileFingerprint ?? okOutcome.value?.receipt.profileFingerprint ?? ''
})
const preprocessingLabel = computed(() => {
  const preprocessing = artifacts.value?.config.preprocessing
  if (!preprocessing) return ''
  return `${preprocessing.modality}; ${preprocessing.normalization}; ${preprocessing.featureSelection}`
})
const outputKeysLabel = computed(() => {
  const outputs = artifacts.value?.config.outputs
  if (!outputs) return ''
  return Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('; ')
})

function onAdapterToggle(adapter: AdapterName, checked: boolean) {
  const allowed = new Set(availableAdapters.value)
  if (!allowed.has(adapter)) return
  const next = new Set(selectedAdapters.value)
  if (checked) next.add(adapter)
  else next.delete(adapter)
  selectedAdapters.value = DEFAULT_ADAPTERS.concat([...allowed].filter((name) => next.has(name)))
}

function onDownload(kind: 'json' | 'yaml' | 'python') {
  if (!artifacts.value) return
  downloadCompiled(artifacts.value, kind, { document, URL })
}
</script>
