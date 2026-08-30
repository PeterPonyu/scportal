#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, '.output/public/autoselect/index.html')
const canonical = 'https://peterponyu.github.io/scportal/autoselect/'
const analyticsHosts = ['google-analytics', 'plausible.io', 'umami']

if (!existsSync(file)) {
  console.error('FAIL /autoselect/: missing .output/public/autoselect/index.html')
  process.exit(1)
}

const html = readFileSync(file, 'utf8')
let failed = false

function fail(message) {
  failed = true
  console.error(`FAIL /autoselect/: ${message}`)
}

if (!html.includes(canonical)) {
  fail(`missing canonical ${canonical}`)
}

if (!html.includes('index,follow') && !html.includes('name="robots"')) {
  fail('missing index,follow or site-wide robots')
}

if (!/<title>[^<]*AutoSelect/i.test(html)) {
  fail('title must contain AutoSelect')
}

if (!html.includes('No expression matrix')) {
  fail('missing privacy sentence No expression matrix')
}

if (!html.includes('Quick')) {
  fail('missing Quick label')
}

if (!html.includes('Advanced')) {
  fail('missing Advanced label')
}

if (!html.includes('Synthetic evidence preview')) {
  fail('missing Synthetic evidence preview')
}

if (!html.includes('Thirteen publications, one traceable application layer')) {
  fail('missing thesis integration heading')
}

if (!html.includes('Resolved identities')) {
  fail('missing thesis identity summary')
}

if (!html.includes('Admitted score cells')) {
  fail('missing thesis evidence summary')
}

if (!html.includes('Config templates')) {
  fail('missing thesis configuration summary')
}

if (!html.includes('Pinned distributions')) {
  fail('missing thesis pin summary')
}

if (!html.includes('Pin contract matches')) {
  fail('missing thesis contract summary')
}

if (!html.includes('Study groups')) {
  fail('missing thesis study-group summary')
}

if (!html.includes('Evaluable holdouts')) {
  fail('missing thesis holdout summary')
}

if (!html.includes('software_resource')) {
  fail('missing fail-closed author claim status')
}

if (!html.includes('scRL receipt:') || !html.includes('scrl-adapter-v1')) {
  fail('missing structured scRL adapter runtime receipt')
}

if (!html.includes('compiler binding:') || !html.includes('source_bound')) {
  fail('missing verified source-bound scRL compiler binding')
}

if (!html.includes('execution:') || !html.includes('PASS')) {
  fail('missing source-bound scRL execution receipt')
}

if (/type\s*=\s*["']file["']/.test(html)) {
  fail('found type="file"')
}

if (html.includes('enctype=')) {
  fail('found enctype=')
}

for (const host of analyticsHosts) {
  if (html.toLowerCase().includes(host)) {
    fail(`found analytics host ${host}`)
  }
}

if (html.includes('/scportal/scportal/')) {
  fail('found duplicated /scportal/scportal/')
}

if (failed) process.exit(1)
console.log('rendered AutoSelect checks passed')
