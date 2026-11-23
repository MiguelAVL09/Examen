import { useMemo, useState } from 'react'
import { ArrowDownToLine, BadgeCheck, Pencil, Search } from 'lucide-react'
import { Dialog } from './TrackerDialogs'
import { normalize, formatDate } from './tracker'
import type { Cinepolito, Workspace } from './tracker'
import { accreditationLabels, getAccreditations, getAccreditationStatus, getAccreditationTotals } from './accreditations'
import type { AccreditationDisplayStatus } from './accreditations'
import './AccreditationsPanel.css'
import { downloadAccreditationReport } from './accreditationReport'

export function AccreditationsPanel({ workspace, busy, onSave }: {
  workspace: Workspace; busy: boolean;
  onSave: (person: Cinepolito, changes: Record<string, AccreditationDisplayStatus>) => Promise<boolean>
}) {
  const data = getAccreditations(workspace)
  const [areaId, setAreaId] = useState('DUL')
  const [status, setStatus] = useState<AccreditationDisplayStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Cinepolito | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const area = data.areas.find(item => item.id === areaId) ?? data.areas[0]
  const sorted = useMemo(() => [...workspace.people].sort((a, b) => a.name.localeCompare(b.name, 'es')), [workspace.people])
  if (!area) return <section className="panel"><div className="empty"><BadgeCheck /><strong>Sin áreas de acreditación</strong></div></section>
  const totals = getAccreditationTotals(data, workspace.people, area.id)
  const people = sorted.filter(person => (status === 'all' || getAccreditationStatus(data, person, area.id) === status) &&
    normalize(person.name + ' ' + person.number).includes(normalize(query)))
  return <div className="accreditations">
    <section className="panel accreditation-overview" aria-label="Resumen de acreditaciones">
      <div className="accreditation-title">
        <span className="tile-icon green"><BadgeCheck size={24} /></span>
        <div><h2>Acreditación por área</h2><p>Consulta quién ya está acreditado y quién necesita seguimiento.</p></div>
        <button className="button secondary accreditation-export" type="button" disabled={busy || exporting} onClick={async () => {
          setExporting(true); setExportError('')
          try { await downloadAccreditationReport(workspace, people, 'Filtro: ' + area.name + ' | ' + (status === 'all' ? 'Todos los estados' : accreditationLabels[status]) + (query ? ' | Búsqueda: ' + query : '')) }
          catch { setExportError('No se pudo generar el PDF. Intenta de nuevo.') }
          finally { setExporting(false) }
        }}><ArrowDownToLine size={16} />{exporting ? 'Generando…' : 'Exportar PDF'}</button>
      </div>
      {exportError && <p className="form-error" role="alert">{exportError}</p>}
      <label className="accreditation-area">Área de acreditación
        <select aria-label="Área de acreditación" value={area.id} onChange={event => { setAreaId(event.target.value); setStatus('all') }}>
          {data.areas.map(item => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select>
      </label>
      {area.provisional && <p className="accreditation-note">{area.code}: nombre provisional, pendiente de confirmar.</p>}
      <div className="accreditation-totals">
        {(['accredited', 'pending', 'not_applicable'] as const).map(item => <button type="button" key={item}
          className={'accreditation-total ' + item + (status === item ? ' selected' : '')} aria-pressed={status === item}
          onClick={() => setStatus(status === item ? 'all' : item)}>
          <span>{accreditationLabels[item]}</span><strong>{totals[item]}</strong>
          <small>{item === 'accredited' ? 'Acreditación completada' : item === 'pending' ? 'Falta completar la acreditación' : 'Fuera del área; no se requiere'}</small>
        </button>)}
      </div>
      <div className="accreditation-progress">
        <div><strong>{totals.percent === null ? 'Sin acreditaciones requeridas' : totals.percent + '% de acreditación'}</strong>
          <span>{totals.accredited} de {totals.required} personas del área</span></div>
        <progress max={100} value={totals.percent ?? 0} aria-label={'Acreditación en ' + area.name} />
      </div>
      <p className="accreditation-note">“No aplica” y “Sin registro” quedan fuera del porcentaje. Los rojos de las fotos se omitieron.
        {data.source?.capturedOn && <> Lista de referencia: {formatDate(data.source.capturedOn, true)}.</>}</p>
    </section>

    <section className="panel people-panel" aria-label={'Acreditaciones de ' + area.name}>
      <div className="filters">
        <label className="search"><Search size={18} /><input aria-label="Buscar acreditaciones" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o número…" /></label>
        <label className="accreditation-filter">Estado
          <select aria-label="Estado" value={status} onChange={event => setStatus(event.target.value as typeof status)}>
            <option value="all">Todos los estados</option>
            {Object.entries(accreditationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {people.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={'Listado de acreditaciones en ' + area.name}>
        <table className="accreditation-table"><thead><tr><th scope="col">Cinepolito</th><th scope="col">{area.name}</th><th scope="col" aria-label="Actualizar acreditaciones" /></tr></thead>
          <tbody>{people.map(person => {
            const state = getAccreditationStatus(data, person, area.id)
            return <tr key={person.id}><td><div className="person-cell"><div><strong>{person.name}</strong><small>{person.number}</small></div></div></td>
              <td><select className={'accreditation-status ' + state} value={state} disabled={busy}
                aria-label={'Estado de ' + person.name + ' en ' + area.name}
                onChange={event => { void onSave(person, { [area.id]: event.target.value as AccreditationDisplayStatus }) }}>
                {Object.entries(accreditationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></td>
              <td><button type="button" className="icon-button" disabled={busy} aria-label={'Actualizar acreditaciones de ' + person.name} onClick={() => setEditing(person)}><Pencil size={17} /></button></td></tr>
          })}</tbody>
        </table>
      </div> : <div className="empty"><Search size={24} /><strong>Sin coincidencias</strong><p>Ajusta el nombre o el estado para ver otras personas.</p></div>}
      <p className="table-footer" aria-live="polite">{people.length} de {workspace.people.length} cinepolitos · {totals.unrecorded} sin registro en esta área</p>
    </section>
    {editing && <AccreditationEditor key={editing.id} workspace={workspace} person={editing} busy={busy} onClose={() => setEditing(null)}
      onSave={async changes => { const saved = await onSave(editing, changes); if (saved) setEditing(null); return saved }} />}
  </div>
}

function AccreditationEditor({ workspace, person, busy, onClose, onSave }: {
  workspace: Workspace; person: Cinepolito; busy: boolean; onClose: () => void;
  onSave: (changes: Record<string, AccreditationDisplayStatus>) => Promise<boolean>
}) {
  const data = getAccreditations(workspace)
  const [changes, setChanges] = useState<Record<string, AccreditationDisplayStatus>>({})
  const [error, setError] = useState('')
  return <Dialog title="Actualizar acreditaciones" subtitle={person.name + ' · ' + person.number} onClose={onClose} busy={busy}>
    <form onSubmit={event => { event.preventDefault(); setError(''); void onSave(changes).then(saved => {
      if (!saved) setError('No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.')
    }).catch(() => setError('No se pudo guardar. Intenta de nuevo.')) }}>
      <div className="dialog-body accreditation-editor">
        <p className="accreditation-note">Marca “No aplica” cuando la persona no pertenece al área. “Sin registro” no genera pendientes.</p>
        {data.areas.map(area => <label key={area.id}><span>{area.name}<small>{area.code}{area.provisional && ' · Nombre por confirmar'}</small></span>
          <select disabled={busy} value={changes[area.id] ?? getAccreditationStatus(data, person, area.id)}
            onChange={event => setChanges(previous => ({ ...previous, [area.id]: event.target.value as AccreditationDisplayStatus }))}>
            {Object.entries(accreditationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>)}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <footer className="dialog-actions"><div className="action-end"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="button primary" disabled={busy || !Object.keys(changes).length}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></footer>
    </form>
  </Dialog>
}
