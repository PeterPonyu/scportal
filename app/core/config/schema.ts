import { Ajv2020 } from 'ajv/dist/2020.js'
import addFormatsDefault, { type FormatsPlugin } from 'ajv-formats'

import executableConfigSchema from '../../../data/router/schemas/executable-config.schema.json' with { type: 'json' }

const addFormats = addFormatsDefault as unknown as FormatsPlugin
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validate = ajv.compile(executableConfigSchema)

export function assertExecutableConfigSchema(value: unknown): void {
  if (!validate(value)) {
    const details = validate.errors?.map((error) => `${error.instancePath || '$'} ${error.message}`).join('; ') ?? 'unknown schema error'
    throw new Error(`executable config JSON Schema validation failed: ${details}`)
  }
}
