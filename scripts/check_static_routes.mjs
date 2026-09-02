#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checks = [
  ['/', 'index.html', 'https://peterponyu.github.io/scportal/'],
  ['/datasets/', 'datasets/index.html', 'https://peterponyu.github.io/scportal/datasets/'],
  ['/explorer/', 'explorer/index.html', 'https://peterponyu.github.io/scportal/explorer/'],
  ['/benchmarks/', 'benchmarks/index.html', 'https://peterponyu.github.io/scportal/benchmarks/'],
  ['/models/', 'models/index.html', 'https://peterponyu.github.io/scportal/models/'],
  ['/about/', 'about/index.html', 'https://peterponyu.github.io/scportal/about/'],
  ['/autoselect/', 'autoselect/index.html', 'https://peterponyu.github.io/scportal/autoselect/'],
]

const assetChecks = [
  ['router-data/thesis-bridge.json', ['"publicationCount": 13', '"chain":', '"runtime":']],
  ['router-evidence/claim-status.json', ['"evidenceVersion":', '"status":']],
  ['router-evidence/manifest.json', ['"evidenceVersion":', '"files":']],
  ['router-evidence/report.md', ['router-validation-v1', 'software_resource']],
]

let failed = false
for (const [route, file, canonical] of checks) {
  const path = resolve(root, '.output/public', file)
  if (!existsSync(path)) {
    console.error(`FAIL ${route}: missing ${file}`)
    failed = true
    continue
  }
  const html = readFileSync(path, 'utf8')
  if (!html.includes('<main')) {
    console.error(`FAIL ${route}: missing <main`)
    failed = true
  }
  if (html.includes('/scportal/scportal/')) {
    console.error(`FAIL ${route}: duplicated base path`)
    failed = true
  }
  if (!html.includes(`rel="canonical"`) || !html.includes(canonical)) {
    console.error(`FAIL ${route}: missing canonical ${canonical}`)
    failed = true
  }
}

for (const [file, required] of assetChecks) {
  const path = resolve(root, '.output/public', file)
  if (!existsSync(path)) {
    console.error(`FAIL asset ${file}: missing generated public asset`)
    failed = true
    continue
  }
  const contents = readFileSync(path, 'utf8')
  for (const marker of required) {
    if (!contents.includes(marker)) {
      console.error(`FAIL asset ${file}: missing marker ${marker}`)
      failed = true
    }
  }
}

const autoselectPath = resolve(root, '.output/public/autoselect/index.html')
if (existsSync(autoselectPath)) {
  const autoselect = readFileSync(autoselectPath, 'utf8').toLowerCase()
  for (const marker of ['thirteen published method identities', 'synthetic candidates', 'model router', 'local infrastructure']) {
    if (!autoselect.includes(marker)) {
      console.error(`FAIL asset autoselect/index.html: missing marker ${marker}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log('static route checks passed')
