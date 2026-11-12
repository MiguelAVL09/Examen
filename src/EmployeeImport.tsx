import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { Dialog } from './TrackerDialogs'
import { employeeKey } from './tracker'
import type { Cinepolito } from './tracker'
import type { EmployeeRow } from './employeePdf'

export function EmployeeImport({ people, busy, error, onClose, onImport }: {
  people: Cinepolito[]; busy: boolean; error: string; onClose: () => void;
  onImport: (rows: EmployeeRow[], area: string) => Promise<boolean>
}) {
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ rows: EmployeeRow[]; duplicates: number }>()
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [area, setArea] = useState('')
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  const existing = new Set(people.map(person => employeeKey(person.number)).filter(Boolean))
  const registeredCount = result?.rows.filter(row => existing.has(employeeKey(row.number))).length ?? 0
  const selected = result?.rows.filter(row => !existing.has(employeeKey(row.number)) && !excluded.has(row.number)) ?? []

  async function read(file?: File) {
    setFileName(file?.name ?? '')
    setResult(undefined)
    setExcluded(new Set())
    setReadError('')
    if (!file) return
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setReadError('Selecciona un archivo PDF.')
      return
    }
    setReading(true)
    try {
      const { readEmployeePdf } = await import('./employeePdf')
      setResult(await readEmployeePdf(file))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setReadError(error instanceof Error && error.name === 'PasswordException'
        ? 'El PDF está protegido. Selecciona una copia sin contraseña.'
        : /^(El PDF parece escaneado|No se encontraron IDs)/.test(message)
          ? message
          : 'No se pudo leer el PDF. Comprueba que el archivo se pueda abrir.')
    } finally {
      setReading(false)
    }
  }

  return <Dialog title="Importar cinepolitos desde PDF" subtitle="Sube una lista con un ID por renglón o una tabla con la columna «ID de empleado»." onClose={onClose} busy={reading || busy}>
    <form onSubmit={event => {
      event.preventDefault()
      if (selected.length) void onImport(selected, area.trim())
    }}>
      <div className="dialog-body import-body">
        <label className="import-file">Archivo PDF
          <span className="import-picker">
            <input type="file" accept="application/pdf,.pdf" disabled={reading || busy} onChange={event => {
              void read(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }} />
            <span className="import-picker-action" aria-hidden="true">Elegir archivo</span>
            <span className="import-filename" aria-hidden="true">{fileName || 'Ningún archivo seleccionado'}</span>
          </span>
        </label>
        {reading && <p className="form-hint" role="status">Leyendo la lista de empleados…</p>}
        {result && <>
          <label className="import-file">Área para registros que no traen una
            <input value={area} onChange={event => setArea(event.target.value)} maxLength={60} placeholder="Ej. Dulcería" disabled={busy} />
          </label>
          <p className="form-hint">Si el PDF solo trae el ID, podrás completar el nombre y el área después.</p>
          <p className="import-count" role="status">{selected.length} para agregar · {registeredCount} {registeredCount === 1 ? 'ya registrado' : 'ya registrados'} · {result.duplicates} {result.duplicates === 1 ? 'repetido' : 'repetidos'} en el PDF</p>
          <div className="import-preview" role="region" aria-label="Vista previa de empleados" tabIndex={0}>
            {result.rows.map(row => {
              const registered = existing.has(employeeKey(row.number))
              return <label key={row.number} className="import-row">
                <input type="checkbox" checked={!registered && !excluded.has(row.number)} disabled={registered || busy} aria-label={'Incluir ' + row.number} onChange={event => {
                  const next = new Set(excluded)
                  if (event.target.checked) next.delete(row.number)
                  else next.add(row.number)
                  setExcluded(next)
                }} />
                <span><strong>{row.number}</strong><small>{row.name || 'Nombre por completar'} · {row.area || area.trim() || 'Área sin asignar'}</small></span>
                {registered && <span className="status unassigned">Ya registrado</span>}
              </label>
            })}
          </div>
        </>}
        {(readError || error) && <p className="form-error" role="alert">{readError || error}</p>}
      </div>
      <footer className="dialog-actions"><div className="action-end">
        <button type="button" className="button secondary" onClick={onClose} disabled={busy || reading}>Cancelar</button>
        <button className="button primary" disabled={!selected.length || busy || reading}><FileUp size={16} />{busy ? 'Guardando…' : 'Importar seleccionados'}</button>
      </div></footer>
    </form>
  </Dialog>
}
