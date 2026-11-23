import type { Cinepolito, Workspace } from './tracker'

export const accreditationLabels = {
  accredited: 'Acreditado',
  pending: 'Pendiente',
  not_applicable: 'No aplica',
  unrecorded: 'Sin registro',
} as const

export type AccreditationStatus = Exclude<keyof typeof accreditationLabels, 'unrecorded'>
export type AccreditationDisplayStatus = keyof typeof accreditationLabels
export interface AccreditationArea { id: string; code: string; name: string; provisional?: boolean }
export interface AccreditationData {
  areas: AccreditationArea[]
  records: Record<string, Record<string, AccreditationStatus>>
  source?: { kind: string; capturedOn: string; importedOn: string }
}

// Only the areas identified by the project owner are enabled.
export const initialAccreditationAreas: AccreditationArea[] = [
  { id: 'DUL', code: 'DUL.', name: 'Dulcería' },
  { id: 'LO', code: 'L.O.', name: 'Limpieza operativa' },
  { id: 'CDS', code: 'CDS.', name: 'Control de salas' },
  { id: 'SPY', code: 'SPY.', name: 'Espiral' },
  { id: 'CRE', code: 'CRE.', name: 'Crepas CT' },
  { id: 'BAG', code: 'BAG.', name: 'Baggie CT' },
  { id: 'BEB', code: 'BEB.', name: 'Bebidas CT' },
  { id: 'LP', code: 'LP.', name: 'Limpieza profunda' },
]

export function getAccreditations(workspace: Workspace): AccreditationData {
  return workspace.accreditations ?? { areas: initialAccreditationAreas, records: {} }
}

export function accreditationPersonKey(person: Cinepolito) {
  return person.accountId ?? person.id
}

export function getAccreditationStatus(data: AccreditationData, person: Cinepolito, areaId: string): AccreditationDisplayStatus {
  return data.records[accreditationPersonKey(person)]?.[areaId] ?? 'unrecorded'
}

export function getAccreditationTotals(data: AccreditationData, people: Cinepolito[], areaId: string) {
  const totals = { accredited: 0, pending: 0, not_applicable: 0, unrecorded: 0 }
  for (const person of people) totals[getAccreditationStatus(data, person, areaId)]++
  const required = totals.accredited + totals.pending
  return { ...totals, required, percent: required ? Math.round(totals.accredited / required * 100) : null }
}

export function updateAccreditationStates(workspace: Workspace, person: Cinepolito,
  changes: Record<string, AccreditationDisplayStatus>): Workspace {
  const data = getAccreditations(workspace)
  const key = accreditationPersonKey(person)
  const states = { ...data.records[key] }
  for (const [areaId, status] of Object.entries(changes)) {
    if (!data.areas.some(area => area.id === areaId) || !Object.hasOwn(accreditationLabels, status)) {
      throw new DOMException('Revisa el área y el estado de la acreditación.', 'ValidationError')
    }
    if (status === 'unrecorded') delete states[areaId]
    else states[areaId] = status
  }
  return { ...workspace, accreditations: { ...data, records: { ...data.records, [key]: states } } }
}

export function parseAccreditations(value: unknown): AccreditationData | undefined {
  if (value === undefined) return undefined
  const data = value as AccreditationData
  if (!data || !Array.isArray(data.areas) || data.areas.length > 64 ||
    !data.areas.every(area => area && typeof area.id === 'string' && /^[A-Z0-9_-]{1,30}$/.test(area.id) &&
      typeof area.code === 'string' && typeof area.name === 'string' && area.name.length > 0 && area.name.length <= 100) ||
    new Set(data.areas.map(area => area.id)).size !== data.areas.length ||
    !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) {
    throw new Error('Invalid accreditation records')
  }
  const areaIds = new Set(data.areas.map(area => area.id))
  for (const states of Object.values(data.records)) {
    if (!states || typeof states !== 'object' || Array.isArray(states) || Object.entries(states).some(([id, status]) =>
      !areaIds.has(id) || !['accredited', 'pending', 'not_applicable'].includes(status))) {
      throw new Error('Invalid accreditation states')
    }
  }
  return data
}
