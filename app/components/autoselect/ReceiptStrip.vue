<template>
  <section class="rounded-2xl border border-dark-200 bg-dark-50/70 p-4 dark:border-dark-800 dark:bg-dark-950/40" aria-label="Router receipt">
    <h2 class="text-sm font-semibold text-dark-900 dark:text-white">Receipt</h2>
    <dl class="mt-3 grid gap-3 text-sm">
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Profile fingerprint</dt>
        <dd class="mt-1 break-all font-mono text-dark-900 dark:text-white">{{ receipt.profileFingerprint }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Release id</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ receipt.release.id }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Synthetic</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ receipt.release.synthetic ? 'true' : 'false' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Config digest</dt>
        <dd class="mt-1 break-all font-mono text-dark-900 dark:text-white">{{ receipt.release.configDigest }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Evidence digest</dt>
        <dd class="mt-1 break-all font-mono text-dark-900 dark:text-white">{{ receipt.release.evidenceDigest }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import type { RouterReceipt } from '../../core/router/types'

defineProps<{
  receipt: RouterReceipt
}>()
</script>
