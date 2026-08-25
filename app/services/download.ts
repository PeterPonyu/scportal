import type { AdapterName, CompiledArtifacts, CompileConfigInput } from '../core/config/types.ts'
import type { EvidenceLink, MethodCapability } from '../core/router/types.ts'

export type DownloadIo = {
  document: Pick<Document, 'createElement' | 'body'>
  URL: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
}

export type CompileConfigFn = (input: CompileConfigInput) => CompiledArtifacts

export interface EvidenceGroup {
  paperId: string
  locator: string
  datasetId: string
  synthetic: boolean
  links: EvidenceLink[]
}

export const DEFAULT_ADAPTERS: AdapterName[] = []

export function canDownload(method: Pick<MethodCapability, 'executable'>): boolean {
  return method.executable === true
}

export function compileIfDownloadable(
  method: Pick<MethodCapability, 'executable'>,
  input: CompileConfigInput,
  compile: CompileConfigFn,
): CompiledArtifacts | null {
  if (!canDownload(method)) return null
  return compile(input)
}

export function declaredAdapters(template: unknown): AdapterName[] {
  const downstream = readDownstream(template)
  if (!downstream) return []
  const adapters: AdapterName[] = []
  if (downstream.scFocus) adapters.push('scFocus')
  if (downstream.scRL) adapters.push('scRL')
  return adapters
}

export function groupEvidenceLinks(links: readonly EvidenceLink[]): EvidenceGroup[] {
  const groups: EvidenceGroup[] = []
  const index = new Map<string, EvidenceGroup>()
  for (const link of links) {
    const key = `${link.paperId}\0${link.locator}\0${link.datasetId}`
    let group = index.get(key)
    if (!group) {
      group = {
        paperId: link.paperId,
        locator: link.locator,
        datasetId: link.datasetId,
        synthetic: false,
        links: [],
      }
      index.set(key, group)
      groups.push(group)
    }
    group.links.push(link)
    if (link.synthetic) group.synthetic = true
  }
  return groups
}

export function downloadText(
  filename: string,
  content: string,
  mediaType: string,
  io: DownloadIo,
): void {
  const blob = new Blob([content], { type: mediaType })
  const objectUrl = io.URL.createObjectURL(blob)
  try {
    const anchor = io.document.createElement('a') as HTMLAnchorElement
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = 'noopener'
    if (anchor.style) anchor.style.display = 'none'
    io.document.body.appendChild(anchor)
    anchor.click()
    io.document.body.removeChild(anchor)
  } finally {
    io.URL.revokeObjectURL(objectUrl)
  }
}

export function downloadCompiled(
  artifacts: CompiledArtifacts,
  kind: 'json' | 'yaml' | 'python',
  io: DownloadIo,
): void {
  if (kind === 'json') {
    downloadText(artifacts.filenames.json, artifacts.json, 'application/json', io)
    return
  }
  if (kind === 'yaml') {
    downloadText(artifacts.filenames.yaml, artifacts.yaml, 'application/yaml', io)
    return
  }
  downloadText(artifacts.filenames.python, artifacts.pythonSnippet, 'text/x-python', io)
}

function readDownstream(template: unknown): { scFocus?: unknown; scRL?: unknown } | undefined {
  if (!template || typeof template !== 'object') return undefined
  const record = template as Record<string, unknown>
  if (record.downstream && typeof record.downstream === 'object') {
    return record.downstream as { scFocus?: unknown; scRL?: unknown }
  }
  const nested = record.template
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>
    if (inner.downstream && typeof inner.downstream === 'object') {
      return inner.downstream as { scFocus?: unknown; scRL?: unknown }
    }
  }
  return undefined
}
