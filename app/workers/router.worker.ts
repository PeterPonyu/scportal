import { routeMethods } from '../core/router/index.ts'
import type { RouterWorkerRequest, RouterWorkerResponse } from './router-protocol.ts'

export function handleRouterWorkerRequest(
  request: RouterWorkerRequest,
  cancelledIds: Iterable<string>,
): RouterWorkerResponse {
  const cancelled = cancelledIds instanceof Set ? cancelledIds : new Set(cancelledIds)
  if (request.type === 'CANCEL' || cancelled.has(request.requestId)) {
    return { type: 'CANCELLED', requestId: request.requestId }
  }
  try {
    return {
      type: 'RESULT',
      requestId: request.requestId,
      outcome: routeMethods(request.input),
    }
  } catch (error) {
    return {
      type: 'ERROR',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Router worker failed',
    }
  }
}

const cancelledIds = new Set<string>()

function onWorkerMessage(event: MessageEvent<RouterWorkerRequest>) {
  const request = event.data
  if (request.type === 'CANCEL') cancelledIds.add(request.requestId)
  self.postMessage(handleRouterWorkerRequest(request, cancelledIds))
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.addEventListener('message', onWorkerMessage)
}
