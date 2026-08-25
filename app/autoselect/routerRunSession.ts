export interface RouterRunSession {
  readonly requestId: string
  cancel(): { shouldPostCancel: boolean }
  shouldPostRoute(): boolean
  markPosted(): boolean
}

export function createRouterRunSession(requestId: string): RouterRunSession {
  let cancelled = false
  let posted = false
  return {
    requestId,
    cancel() {
      cancelled = true
      return { shouldPostCancel: posted }
    },
    shouldPostRoute() {
      return !cancelled
    },
    markPosted() {
      if (cancelled) return false
      posted = true
      return true
    },
  }
}
