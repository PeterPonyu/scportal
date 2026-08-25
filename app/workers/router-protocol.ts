import type { RouterInput, RouterOutcome } from '../core/router/types.ts'

export type RouterWorkerRequest =
  | { type: 'ROUTE'; requestId: string; input: RouterInput }
  | { type: 'CANCEL'; requestId: string }

export type RouterWorkerResponse =
  | { type: 'RESULT'; requestId: string; outcome: RouterOutcome }
  | { type: 'ERROR'; requestId: string; message: string }
  | { type: 'CANCELLED'; requestId: string }
