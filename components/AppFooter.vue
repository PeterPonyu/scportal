<template>
  <footer class="bg-dark-50 dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Brand -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="8" opacity="0.5" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span class="text-lg font-bold text-dark-900 dark:text-white">SCPortal Hub</span>
          </div>
          <p class="text-sm text-dark-600 dark:text-dark-400 max-w-md mb-4">
            A unified platform combining iAODE Dataset Browser and LAIOR Benchmarking Dashboard
            for comprehensive single-cell analysis exploration.
          </p>
          <div class="flex gap-4">
            <a
              v-for="social in socialLinks"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-dark-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              :aria-label="social.label"
            >
              <component :is="social.icon" class="h-5 w-5" />
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li v-for="link in quickLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Resources -->
        <div>
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Resources</h3>
          <ul class="space-y-2">
            <li v-for="resource in resources" :key="resource.href">
              <a
                :href="resource.href"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                {{ resource.label }}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="mt-8 pt-8 border-t border-dark-200 dark:border-dark-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p class="text-sm text-dark-500 dark:text-dark-500">
          © {{ new Date().getFullYear() }} SCPortal Hub. Built with ❤️ for the single-cell community.
        </p>
        <p class="text-sm text-dark-500 dark:text-dark-500">
          Powered by <a href="https://nuxt.com" target="_blank" rel="noopener" class="text-primary-600 dark:text-primary-400 hover:underline">Nuxt</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// GitHub Icon Component
const GitHubIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'currentColor' }, [
      h('path', { d: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' })
    ])
  }
})

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/PeterPonyu/scportal', icon: GitHubIcon }
]

const quickLinks = [
  { to: '/datasets', label: 'Browse Datasets' },
  { to: '/explorer', label: 'Continuity Explorer' },
  { to: '/benchmarks', label: 'Benchmarking Results' },
  { to: '/models', label: 'Model Catalog' },
  { to: '/about', label: 'About' }
]

const resources = [
  { label: 'iAODE GitHub', href: 'https://github.com/PeterPonyu/iAODE' },
  { label: 'LAIOR GitHub', href: 'https://github.com/PeterPonyu/Liora' },
  { label: 'NCBI GEO', href: 'https://www.ncbi.nlm.nih.gov/geo/' },
  { label: '10X Genomics', href: 'https://www.10xgenomics.com/' }
]
</script>
