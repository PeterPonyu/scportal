import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { checkPythonSnippets } from '../../scripts/check_config_python.mjs'

test('fails when the snippet generator exits nonzero even after emitting parseable Python', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'scportal-python-generator-'))
  context.after(async () => { await import('node:fs/promises').then(({ rm }) => rm(directory, { recursive: true, force: true })) })
  const generator = join(directory, 'failing-generator.mjs')
  await writeFile(generator, "import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], 'value = 1\\n'); process.exitCode = 7\n", 'utf8')

  await assert.rejects(
    () => checkPythonSnippets({ generator }),
    /generator.*status 7/i,
  )
})

test('fails when generated Python is not parseable', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'scportal-python-parser-'))
  context.after(async () => { await import('node:fs/promises').then(({ rm }) => rm(directory, { recursive: true, force: true })) })
  const generator = join(directory, 'invalid-generator.mjs')
  await writeFile(generator, "import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], 'def broken(:\\n')\n", 'utf8')

  await assert.rejects(
    () => checkPythonSnippets({ generator }),
    /python parser.*status/i,
  )
})
