import { releaseEvidenceDigest } from '../../app/core/router/release-digest.ts'

export function withSyntheticRelease<T extends Record<string, unknown>>(input: T, id: string): T & { release: { id: string; synthetic: boolean; description: string; configDigest: string; evidenceDigest: string } } {
  const { evidenceVersion: _evidenceVersion, ...bundle } = input
  const release = { id, synthetic: true, description: 'Synthetic test evidence; no biological claims.' }
  const configDigest = 'c'.repeat(64)
  const evidenceDigest = releaseEvidenceDigest(bundle as Parameters<typeof releaseEvidenceDigest>[0], release, configDigest)
  return { ...bundle, release: { ...release, configDigest, evidenceDigest } }
}
