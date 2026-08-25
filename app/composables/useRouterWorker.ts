import { requiredObservationGroups } from '../autoselect/groups.ts'
import type { RouterInput, RouterOutcome, TaskProfile } from '../core/router/types.ts'
import { ROUTER_VERSION, loadObservationGroups, loadRouterCatalog, loadRouterRelease } from '../services/routerData.ts'
import type { RouterWorkerRequest, RouterWorkerResponse } from '../workers/router-protocol.ts'

export interface RouterWorkerState {
  status: 'idle' | 'loading' | 'success' | 'refused' | 'error'
  outcome: RouterOutcome | null
  message: string | null
}

let worker: Worker | null = null
const ignoredRequestIds = new Set<string>()
let applyResponse: ((response: RouterWorkerResponse) => void) | null = null

function ensureWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('../workers/router.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<RouterWorkerResponse>) => {
    applyResponse?.(event.data)
  })
  return worker
}

function idleState(): RouterWorkerState {
  return { status: 'idle', outcome: null, message: null }
}

export function useRouterWorker() {
  const state = useState<RouterWorkerState>('autoselect-router-worker', idleState)
  const activeRequestId = useState<string | null>('autoselect-router-worker-request', () => null)

  applyResponse = (response) => {
    if (ignoredRequestIds.has(response.requestId) || response.requestId !== activeRequestId.value) return
    if (response.type === 'CANCELLED') {
      state.value = idleState()
      return
    }
    if (response.type === 'ERROR') {
      state.value = { status: 'error', outcome: null, message: response.message }
      return
    }
    state.value = {
      status: response.outcome.status === 'OK' ? 'success' : 'refused',
      outcome: response.outcome,
      message: null,
    }
  }

  async function run(profile: TaskProfile) {
    if (activeRequestId.value) ignoredRequestIds.add(activeRequestId.value)
    state.value = { status: 'loading', outcome: null, message: null }
    try {
      const groups = requiredObservationGroups(profile.goals, profile.weights)
      const [catalog, release, observations] = await Promise.all([
        loadRouterCatalog(),
        loadRouterRelease(),
        loadObservationGroups(groups),
      ])
      const input: RouterInput = {
        profile,
        datasets: catalog.datasets,
        methods: catalog.methods,
        metrics: catalog.metrics,
        observations,
        routerVersion: ROUTER_VERSION,
        release,
      }
      const requestId = crypto.randomUUID()
      activeRequestId.value = requestId
      if (!import.meta.client) {
        state.value = { status: 'error', outcome: null, message: 'Router worker is only available in the browser.' }
        return
      }
      const request: RouterWorkerRequest = { type: 'ROUTE', requestId, input }
      ensureWorker().postMessage(request)
    } catch (error) {
      state.value = {
        status: 'error',
        outcome: null,
        message: error instanceof Error ? error.message : 'Failed to load Router evidence.',
      }
    }
  }

  function cancel() {
    const requestId = activeRequestId.value
    if (!requestId) return
    ignoredRequestIds.add(requestId)
    if (worker) {
      const request: RouterWorkerRequest = { type: 'CANCEL', requestId }
      worker.postMessage(request)
    }
    activeRequestId.value = null
    state.value = idleState()
  }

  return { state, run, cancel }
}
