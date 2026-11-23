import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// This module has only type imports; exercise its real source without a browser or database.
const source = fs.readFileSync(new URL('../src/accreditations.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { getAccreditations, getAccreditationStatus, getAccreditationTotals, updateAccreditationStates, parseAccreditations } =
  await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

const people = Array.from({ length: 4 }, (_, i) => ({ id: 'local-' + i, accountId: 'account-' + i,
  name: 'Persona ' + i, number: String(i), area: 'Sin asignar', progress: { course: true } }))
const original = { people, courses: [{ id: 'course', name: 'Curso' }], tasks: [], updatedAt: null }
assert.equal(parseAccreditations(undefined), undefined)
assert.equal(getAccreditations(original).areas.length, 8)
assert.equal(getAccreditationStatus(getAccreditations(original), people[0], 'DUL'), 'unrecorded')
let workspace = updateAccreditationStates(original, people[0], { DUL: 'accredited', LO: 'pending' })
workspace = updateAccreditationStates(workspace, people[1], { DUL: 'pending' })
workspace = updateAccreditationStates(workspace, people[2], { DUL: 'not_applicable' })
assert.deepEqual(getAccreditationTotals(getAccreditations(workspace), people, 'DUL'),
  { accredited: 1, pending: 1, not_applicable: 1, unrecorded: 1, required: 2, percent: 50 })
assert.equal(original.accreditations, undefined, 'Never mutate the source workspace')
assert.equal(workspace.people, original.people)
assert.equal(workspace.courses, original.courses)
assert.deepEqual(workspace.people[0].progress, { course: true })
assert.equal(getAccreditationStatus(getAccreditations(workspace), { ...people[0], id: 'changed-local-id' }, 'DUL'), 'accredited', 'Link by the stable account ID')
workspace = updateAccreditationStates(workspace, people[0], { DUL: 'pending' })
assert.equal(getAccreditationStatus(getAccreditations(workspace), people[0], 'LO'), 'pending', 'A partial save preserves other areas')
workspace = updateAccreditationStates(workspace, people[0], { DUL: 'unrecorded' })
assert.equal(getAccreditationStatus(getAccreditations(workspace), people[0], 'DUL'), 'unrecorded')
assert.equal(getAccreditationTotals(getAccreditations(original), people, 'DUL').percent, null)
assert.deepEqual(parseAccreditations(JSON.parse(JSON.stringify(workspace.accreditations))), workspace.accreditations)
assert.throws(() => updateAccreditationStates(workspace, people[0], { UNKNOWN: 'pending' }))
assert.throws(() => parseAccreditations({ areas: [{ id: 'DUL', code: 'DUL.', name: 'Dulcería' }], records: { account: { DUL: 'red' } } }))
assert.throws(() => parseAccreditations({ areas: [{ id: 'DUL', code: 'DUL.', name: 'Dulcería' }], records: { account: { UNKNOWN: 'pending' } } }))
console.log('PASS: accreditation states, exclusions, account linking, partial updates, legacy data and validation.')
