import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { importObservations } from './import-observations.ts'

const root = resolve(import.meta.dirname, '../..')
const observations = await importObservations(root)
await writeFile(resolve(root, 'data/router/author/observations.json'), `${JSON.stringify(observations, null, 2)}\n`)
