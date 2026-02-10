<template>
  <div
    class="group relative overflow-hidden rounded-2xl border border-dark-200/80 dark:border-dark-800 bg-white/90 dark:bg-dark-900/90 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 cursor-pointer"
    @click="handleClick"
  >
    <!-- Icon -->
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
      :class="iconBgClass"
    >
      <slot name="icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      </slot>
    </div>

    <!-- Content -->
    <h3 class="mb-2 text-lg font-semibold text-dark-900 dark:text-white">
      {{ title }}
    </h3>
    <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
      {{ description }}
    </p>

    <!-- Stats -->
    <div v-if="stats.length" class="flex flex-wrap gap-4 mb-4">
      <div v-for="stat in stats" :key="stat.label" class="text-center">
        <div class="text-2xl font-semibold text-primary-600 dark:text-primary-400 tracking-tight">
          {{ stat.value }}
        </div>
        <div class="text-[0.7rem] uppercase tracking-widest text-dark-500">
          {{ stat.label }}
        </div>
      </div>
    </div>

    <!-- Link indicator -->
    <span
      class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 transition-colors"
    >
      {{ linkText }}
      <svg v-if="to" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
      <svg v-else-if="href" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" x2="21" y1="14" y2="3" />
      </svg>
    </span>

    <!-- Decorative gradient -->
    <div
      class="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
      :class="gradientClass"
    />
  </div>
</template>

<script setup lang="ts">
interface Stat {
  label: string
  value: string | number
}

interface Props {
  title: string
  description: string
  to?: string
  href?: string
  linkText?: string
  variant?: 'primary' | 'accent' | 'emerald' | 'purple'
  stats?: Stat[]
}

const props = withDefaults(defineProps<Props>(), {
  linkText: 'Learn more',
  variant: 'primary',
  stats: () => []
})

const router = useRouter()

function handleClick() {
  if (props.to) {
    router.push(props.to)
  } else if (props.href) {
    window.open(props.href, '_blank', 'noopener,noreferrer')
  }
}

const iconBgClass = computed(() => {
  const variants = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600',
    accent: 'bg-gradient-to-br from-accent-500 to-accent-600',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    purple: 'bg-gradient-to-br from-purple-500 to-indigo-600'
  }
  return variants[props.variant]
})

const gradientClass = computed(() => {
  const variants = {
    primary: 'bg-primary-500',
    accent: 'bg-accent-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500'
  }
  return variants[props.variant]
})
</script>
