import { createRouterRunSession, type RouterRunSession } from '../autoselect/routerRunSession.ts'
import type { RouterInput, RouterOutcome, TaskProfile } from '../core/router/types.ts'
import { ROUTER_VERSION, loadObservationGroups, loadRouterCatalog, loadRouterRelease } from '../services/routerData.ts'
import type { RouterWorkerRequest, RouterWorkerResponse } from '../workers/router-protocol.ts'

const ROUTER_OBSERVATION_GROUPS = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
] as const

export interface RouterWorkerState {
  status: 'idle' | 'loading' | 'success' | 'refused' | 'error'
  outcome: RouterOutcome | null
  message: string | null
  submittedProfile: TaskProfile | null
}

let worker: Worker | null = null
const ignoredRequestIds = new Set<string>()
let applyResponse: ((response: RouterWorkerResponse) => void) | null = null
let applyWorkerFailure: ((message: string) => void) | null = null
let currentSession: RouterRunSession | null = null
let pendingSubmittedProfile: TaskProfile | null = null

function ensureWorker(): Worker {
  if (worker) return worker
  const instance = new Worker(new URL('../workers/router.worker.ts', import.meta.url), { type: 'module' })
  instance.addEventListener('message', (event: MessageEvent<RouterWorkerResponse>) => {
    applyResponse?.(event.data)
  })
  // A worker that fails to load, or throws before replying, never sends a message.
  // Without these the wizard stays in `loading` forever with nothing on screen to
  // explain why. Dropping the reference lets the next run build a fresh worker
  // instead of posting into a dead one, and the identity check keeps a late error
  // from a discarded worker from clearing its replacement.
  const fail = (message: string) => {
    // A discarded worker may report an error after a replacement has started.
    // Its event must not overwrite the replacement run's state.
    if (worker !== instance) return
    worker = null
    applyWorkerFailure?.(message)
  }
  instance.addEventListener('error', (event) => {
    fail(event.message || 'The Router worker failed to start.')
  })
  instance.addEventListener('messageerror', () => {
    fail('The Router worker sent a response that could not be read.')
  })
  worker = instance
  return instance
}

function idleState(): RouterWorkerState {
  return { status: 'idle', outcome: null, message: null, submittedProfile: null }
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
      state.value = { status: 'error', outcome: null, message: response.message, submittedProfile: null }
      return
    }
    state.value = {
      status: response.outcome.status === 'OK' ? 'success' : 'refused',
      outcome: response.outcome,
      message: null,
      submittedProfile: pendingSubmittedProfile,
    }
  }

  applyWorkerFailure = (message) => {
    if (!activeRequestId.value) return
    if (currentSession) {
      ignoredRequestIds.add(currentSession.requestId)
      currentSession = null
    }
    activeRequestId.value = null
    state.value = { status: 'error', outcome: null, message, submittedProfile: null }
  }

  async function run(profile: TaskProfile) {
    if (currentSession) {
      ignoredRequestIds.add(currentSession.requestId)
      currentSession.cancel()
    } else if (activeRequestId.value) {
      ignoredRequestIds.add(activeRequestId.value)
    }
    const session = createRouterRunSession(crypto.randomUUID())
    currentSession = session
    activeRequestId.value = session.requestId
    pendingSubmittedProfile = profile
    state.value = { status: 'loading', outcome: null, message: null, submittedProfile: null }
    try {
      const [catalog, release, observations] = await Promise.all([
        loadRouterCatalog(),
        loadRouterRelease(),
        loadObservationGroups([...ROUTER_OBSERVATION_GROUPS]),
      ])
      if (!session.shouldPostRoute()) return
      const input: RouterInput = {
        profile,
        datasets: catalog.datasets,
        methods: catalog.methods,
        metrics: catalog.metrics,
        observations,
        routerVersion: ROUTER_VERSION,
        release,
      }
      if (!import.meta.client) {
        if (!session.shouldPostRoute()) return
        state.value = { status: 'error', outcome: null, message: 'Router worker is only available in the browser.', submittedProfile: null }
        return
      }
      if (!session.markPosted()) return
      const request: RouterWorkerRequest = { type: 'ROUTE', requestId: session.requestId, input }
      ensureWorker().postMessage(request)
    } catch (error) {
      if (!session.shouldPostRoute()) return
      state.value = {
        status: 'error',
        outcome: null,
        message: error instanceof Error ? error.message : 'Failed to load Router evidence.',
        submittedProfile: null,
      }
    }
  }

  function cancel() {
    const session = currentSession
    const requestId = session?.requestId ?? activeRequestId.value
    if (!requestId) return
    ignoredRequestIds.add(requestId)
    const { shouldPostCancel } = session?.cancel() ?? { shouldPostCancel: Boolean(worker) }
    if (shouldPostCancel && worker) {
      const request: RouterWorkerRequest = { type: 'CANCEL', requestId }
      worker.postMessage(request)
    }
    currentSession = null
    activeRequestId.value = null
    state.value = idleState()
  }

  return { state, run, cancel }
}
