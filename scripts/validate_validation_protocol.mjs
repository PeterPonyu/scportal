import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(currentDirectory, '..')

function fail(condition, message) {
  if (!condition) throw new Error(message)
}

function formatErrors(errors) {
  return errors?.map((error) => `${error.instancePath || '$'} ${error.message}`).join('; ') ?? 'unknown schema error'
}

async function readJson(relative) {
  return JSON.parse(await readFile(join(repositoryRoot, relative), 'utf8'))
}

function uniqueStrings(values, label) {
  fail(Array.isArray(values), `${label} must be an array`)
  const unique = [...new Set(values)]
  fail(unique.length === values.length, `${label} must not contain duplicates`)
  return unique
}

export async function validateValidationProtocol({
  protocol,
  splits,
  cases,
  datasets,
  observations,
  schemas,
}) {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validateProtocol = ajv.compile(schemas.protocol)
  const validateSplits = ajv.compile(schemas.splits)
  const validateCases = ajv.compile(schemas.cases)

  fail(validateProtocol(protocol), `protocol schema validation failed: ${formatErrors(validateProtocol.errors)}`)
  fail(validateSplits(splits), `splits schema validation failed: ${formatErrors(validateSplits.errors)}`)
  fail(validateCases(cases), `cases schema validation failed: ${formatErrors(validateCases.errors)}`)

  fail(splits.version === protocol.version, 'splits version must match protocol version')

  const reservedIds = uniqueStrings(cases.map((row) => row.id), 'cases.id')
  const reserved = new Set(reservedIds)
  fail(reserved.has('gse280270_ucb_tpo'), 'cases must reserve gse280270_ucb_tpo')
  fail(reserved.has(protocol.externalHoldoutDatasetId), 'protocol external holdout must be a reserved case id')

  const externalHoldouts = cases.filter((row) => row.role === 'external_holdout')
  fail(externalHoldouts.length === 1, 'cases must contain exactly one external_holdout')
  fail(externalHoldouts[0].id === protocol.externalHoldoutDatasetId, 'external holdout case must match protocol.externalHoldoutDatasetId')

  fail(Array.isArray(datasets), 'datasets must be an array')
  fail(Array.isArray(observations), 'observations must be an array')
  fail(!datasets.some((row) => reserved.has(row.id)), 'reserved case ids must not appear in datasets.json')
  fail(!observations.some((row) => reserved.has(row.datasetId)), 'reserved case ids must not appear in observations')

  const catalogStudyGroups = [...new Set(datasets.map((row) => row.studyGroup))]
  fail(catalogStudyGroups.length > 0, 'datasets must declare at least one study group')
  const expectedStudyGroups = [
    'synthetic-contract-fixture-branch',
    'synthetic-contract-fixture-sparse',
    'synthetic-contract-fixture-linear',
  ]
  fail(
    catalogStudyGroups.length === expectedStudyGroups.length
      && expectedStudyGroups.every((group) => catalogStudyGroups.includes(group)),
    'splits must cover exactly the current synthetic study groups',
  )

  const heldOutOnce = []
  for (const fold of splits.folds) {
    const heldOut = uniqueStrings(fold.heldOutStudyGroups, `${fold.id}.heldOutStudyGroups`)
    const fit = uniqueStrings(fold.fitStudyGroups, `${fold.id}.fitStudyGroups`)
    const overlap = heldOut.filter((group) => fit.includes(group))
    fail(overlap.length === 0, `${fold.id} leaks study groups across fit and holdout: ${overlap.join(', ')}`)

    for (const group of [...heldOut, ...fit]) {
      fail(!reserved.has(group), `${fold.id} must not use reserved case id ${group}`)
      fail(catalogStudyGroups.includes(group), `${fold.id} uses unknown study group ${group}`)
    }

    fail(heldOut.length === 1, `${fold.id} must hold out exactly one study group`)
    const complement = catalogStudyGroups.filter((group) => group !== heldOut[0])
    fail(
      fit.length === complement.length && complement.every((group) => fit.includes(group)),
      `${fold.id} fitStudyGroups must be the leave-one-group-out complement`,
    )
    heldOutOnce.push(heldOut[0])
  }

  fail(splits.folds.length === catalogStudyGroups.length, 'splits must contain one leave-one-group-out fold per study group')
  fail(
    uniqueStrings(heldOutOnce, 'held-out study groups').length === catalogStudyGroups.length
      && catalogStudyGroups.every((group) => heldOutOnce.includes(group)),
    'each study group must be held out by exactly one fold',
  )

  return {
    status: 'VALID',
    version: protocol.version,
    folds: splits.folds.length,
    cases: cases.length,
    studyGroups: catalogStudyGroups.length,
  }
}

export async function validateValidationProtocolFiles() {
  const [protocol, splits, cases, datasets, observations, protocolSchema, splitsSchema, casesSchema] = await Promise.all([
    readJson('validation/protocol.json'),
    readJson('validation/splits.json'),
    readJson('validation/cases.json'),
    readJson('data/router/datasets.json'),
    readJson('data/router/observations.synthetic.json'),
    readJson('validation/schemas/protocol.schema.json'),
    readJson('validation/schemas/splits.schema.json'),
    readJson('validation/schemas/cases.schema.json'),
  ])

  return validateValidationProtocol({
    protocol,
    splits,
    cases,
    datasets,
    observations,
    schemas: {
      protocol: protocolSchema,
      splits: splitsSchema,
      cases: casesSchema,
    },
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await validateValidationProtocolFiles()
    console.log(`Validation protocol is frozen: ${result.version}, ${result.folds} folds, ${result.studyGroups} study groups, ${result.cases} reserved cases.`)
  } catch (error) {
    console.error(`Validation protocol check failed: ${error.message}`)
    process.exitCode = 1
  }
}
