import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { BookOpen, Download, FileText, Trash2, X } from 'lucide-react'
import type { Cinepolito, Course, Task, Workspace } from './tracker'
import { normalize, pendingTasks } from './tracker'
import { downloadReport, reportLabels, reportPeople } from './trackerReport'
import type { ReportFilters, ReportType } from './trackerReport'

export function Dialog({ title, subtitle, children, onClose, busy = false }: {
  title: string; subtitle: string; children: ReactNode; onClose: () => void; busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current!
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={event => {
    event.preventDefault()
    if (!busy) onClose()
  }}>
    <header className="dialog-head">
      <div><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div>
      <button className="icon-button" type="button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}><X size={20} /></button>
    </header>
    {children}
  </dialog>
}

function FormActions({ busy, editing, onClose, onDelete }: {
  busy: boolean; editing: boolean; onClose: () => void; onDelete?: () => Promise<boolean>
}) {
  const [confirm, setConfirm] = useState(false)
  return <footer className="dialog-actions">
    {onDelete && <button type="button" className="button danger" disabled={busy} onClick={() => {
      if (confirm) void onDelete()
      else setConfirm(true)
    }}><Trash2 size={16} />{confirm ? 'Confirmar eliminación' : 'Eliminar'}</button>}
    <div className="action-end">
      <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button>
      <button className="button primary" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}</button>
    </div>
  </footer>
}

export function PersonForm({ person, workspace, busy, error, onSave, onClose, onDelete }: {
  person?: Cinepolito; workspace: Workspace; busy: boolean; error: string;
  onSave: (person: Cinepolito) => Promise<boolean>; onClose: () => void; onDelete?: () => Promise<boolean>
}) {
  const [name, setName] = useState(person?.name ?? '')
  const [number, setNumber] = useState(person?.number ?? '')
  const [area, setArea] = useState(person?.area ?? '')
  const [progress, setProgress] = useState(person?.progress ?? {})
  const [validation, setValidation] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !area.trim()) return setValidation('Ingresa el nombre y el área.')
    setValidation('')
    const existingArea = workspace.people.find(item => normalize(item.area) === normalize(area))?.area
    void onSave({
      id: person?.id ?? crypto.randomUUID(), name: name.trim(), number: number.trim(), area: existingArea ?? area.trim(),
      progress: Object.fromEntries(workspace.courses.filter(course => Object.hasOwn(progress, course.id)).map(course => [course.id, progress[course.id]])),
    })
  }
  return <Dialog title={person ? 'Editar cinepolito' : 'Agregar cinepolito'} subtitle="Registra sus datos y actualiza su avance en Learning Center." onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="dialog-body form-grid">
        <label className="span-all">Nombre completo<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Valeria Morales" /></label>
        <label>Número de empleado <small>Opcional</small><input maxLength={30} value={number} onChange={e => setNumber(e.target.value)} placeholder="Ej. CP-1042" /></label>
        <label>Área<input required maxLength={60} value={area} onChange={e => setArea(e.target.value)} list="areas" placeholder="Ej. Dulcería" /></label>
        <datalist id="areas">{[...new Set(workspace.people.map(item => item.area))].sort().map(item => <option key={item} value={item} />)}</datalist>
        <fieldset className="span-all course-fieldset">
          <legend>Cursos de Learning Center</legend>
          {workspace.courses.length ? workspace.courses.map(course => <label className="course-choice" key={course.id}>
            <span>{course.name}</span>
            <select aria-label={'Estado de ' + course.name} value={!Object.hasOwn(progress, course.id) ? '' : progress[course.id] ? 'done' : 'open'} onChange={event => {
              const next = { ...progress }
              if (!event.target.value) delete next[course.id]
              else next[course.id] = event.target.value === 'done'
              setProgress(next)
            }}>
              <option value="">Sin asignar</option><option value="open">Pendiente</option><option value="done">Completado</option>
            </select>
          </label>) : <p className="form-hint"><BookOpen size={16} /> Agrega cursos desde el catálogo para asignarlos aquí.</p>}
        </fieldset>
        {(validation || error) && <p className="form-error span-all" role="alert">{validation || error}</p>}
      </div>
      <FormActions busy={busy} editing={!!person} onClose={onClose} onDelete={onDelete} />
    </form>
  </Dialog>
}

export function CourseForm({ course, busy, error, onSave, onClose, onDelete }: {
  course?: Course; busy: boolean; error: string; onSave: (course: Course) => Promise<boolean>; onClose: () => void; onDelete?: () => Promise<boolean>
}) {
  const [validation, setValidation] = useState('')
  return <Dialog title={course ? 'Editar curso' : 'Agregar curso'} subtitle="Administra el catálogo de cursos que puedes asignar a tu equipo." onClose={onClose} busy={busy}>
    <form onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const name = String(data.get('name')).trim()
      if (!name) return setValidation('Ingresa un nombre para el curso.')
      setValidation('')
      void onSave({ id: course?.id ?? crypto.randomUUID(), name, description: String(data.get('description')).trim() })
    }}>
      <div className="dialog-body form-grid">
        <label className="span-all">Nombre del curso<input name="name" required maxLength={120} defaultValue={course?.name} placeholder="Ej. Experiencia del invitado" /></label>
        <label className="span-all">Descripción <small>Opcional</small><textarea name="description" rows={3} maxLength={300} defaultValue={course?.description} /></label>
        {course && <p className="form-hint span-all">Al eliminar este curso, también se eliminan sus asignaciones.</p>}
        {(validation || error) && <p className="form-error span-all" role="alert">{validation || error}</p>}
      </div>
      <FormActions busy={busy} editing={!!course} onClose={onClose} onDelete={onDelete} />
    </form>
  </Dialog>
}

export function TaskForm({ task, busy, error, onSave, onClose, onDelete }: {
  task?: Task; busy: boolean; error: string; onSave: (task: Task) => Promise<boolean>; onClose: () => void; onDelete?: () => Promise<boolean>
}) {
  const [validation, setValidation] = useState('')
  return <Dialog title={task ? 'Editar tarea' : 'Nueva tarea'} subtitle="Da seguimiento a las actividades del equipo." onClose={onClose} busy={busy}>
    <form onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const title = String(data.get('title')).trim()
      if (!title) return setValidation('Ingresa un título para la tarea.')
      setValidation('')
      void onSave({
        id: task?.id ?? crypto.randomUUID(), title, owner: String(data.get('owner')).trim(),
        due: String(data.get('due')), notes: String(data.get('notes')).trim(),
        priority: data.get('priority') as Task['priority'], done: data.get('status') === 'done',
      })
    }}>
      <div className="dialog-body form-grid">
        <label className="span-all">Título<input name="title" required maxLength={120} defaultValue={task?.title} placeholder="Ej. Validar cursos de nuevo ingreso" /></label>
        <label>Responsable <small>Opcional</small><input name="owner" maxLength={80} defaultValue={task?.owner} placeholder="Persona o área" /></label>
        <label>Fecha límite <small>Opcional</small><input type="date" name="due" min="1900-01-01" max="9999-12-31" defaultValue={task?.due} /></label>
        <label>Prioridad<select name="priority" defaultValue={task?.priority ?? 'Media'}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
        <label>Estado<select name="status" defaultValue={task?.done ? 'done' : 'open'}><option value="open">Pendiente</option><option value="done">Completada</option></select></label>
        <label className="span-all">Notas <small>Opcional</small><textarea name="notes" rows={3} maxLength={600} defaultValue={task?.notes} /></label>
        {(validation || error) && <p className="form-error span-all" role="alert">{validation || error}</p>}
      </div>
      <FormActions busy={busy} editing={!!task} onClose={onClose} onDelete={onDelete} />
    </form>
  </Dialog>
}

export function ReportForm({ workspace, onClose, onDownload, initial }: {
  workspace: Workspace; onClose?: () => void; onDownload: () => void; initial: ReportFilters
}) {
  const [filters, setFilters] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tasks = filters.type === 'tasks'
  const count = tasks ? pendingTasks(workspace.tasks).length : reportPeople(workspace, filters).length
  const form = <form onSubmit={async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await downloadReport(workspace, filters)
      onDownload()
    } catch {
      setError('No se pudo generar el PDF. Vuelve a intentarlo.')
    } finally {
      setBusy(false)
    }
  }}>
    <div className="dialog-body form-grid">
      <label className="span-all">Contenido del reporte<select value={filters.type} onChange={event => {
        const type = event.target.value as ReportType
        setFilters({ ...filters, type, course: type === 'unassigned' ? '' : filters.course })
      }}>{Object.entries(reportLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
      {!tasks && <>
        <label>Área<select value={filters.area} onChange={event => setFilters({ ...filters, area: event.target.value })}>
          <option value="">Todas las áreas</option>
          {[...new Set(workspace.people.map(person => person.area))].sort((a, b) => a.localeCompare(b, 'es')).map(area => <option key={area}>{area}</option>)}
        </select></label>
        {filters.type !== 'unassigned' && <label>Curso<select value={filters.course} onChange={event => setFilters({ ...filters, course: event.target.value })}>
          <option value="">Todos los cursos</option>
          {workspace.courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select></label>}
      </>}
      <div className="report-summary span-all" aria-live="polite"><FileText size={20} /><div><strong>{count} {tasks ? (count === 1 ? 'tarea pendiente' : 'tareas pendientes') : (count === 1 ? 'cinepolito' : 'cinepolitos')}</strong><p>Registros incluidos con los filtros seleccionados.</p></div></div>
      {error && <p className="form-error span-all" role="alert">{error}</p>}
    </div>
    <footer className="dialog-actions"><div className="action-end">
      {onClose && <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cerrar</button>}
      <button className="button primary" disabled={busy}><Download size={16} /> {busy ? 'Generando…' : 'Descargar PDF'}</button>
    </div></footer>
  </form>
  return onClose ? <Dialog title="Exportar reporte" subtitle="Elige los registros que quieres incluir en el PDF." onClose={onClose} busy={busy}>{form}</Dialog> : <section className="panel report-panel">{form}</section>
}
