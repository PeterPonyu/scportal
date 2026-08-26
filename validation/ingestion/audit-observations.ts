import { auditObservations } from './import-observations.ts'

const root = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const report = await auditObservations(root)
if (report.included === 0) {
  console.error('author admission imported zero rows')
  process.exitCode = 1
}
console.log(JSON.stringify(report, null, 2))
