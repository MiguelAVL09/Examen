import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, Database, FileText, FileUp, Film, GraduationCap, LayoutDashboard, Menu,
  Pencil, Plus, Search, Users, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CourseForm, PersonForm, ReportForm, TaskForm } from './TrackerDialogs'
import { EmployeeImport } from './EmployeeImport'
import type { EmployeeRow } from './employeePdf'
import {
  calendarDate, createDemoWorkspace, emptyWorkspace, filterPeople, formatDate, formatUpdate,
  getProgress, getStatus, normalize, pendingTasks, readWorkspace, statusLabels, storageKey,
} from './tracker'
import type { Cinepolito, Course, PeopleStatus, Task, Workspace } from './tracker'
import type { ReportFilters } from './trackerReport'
import { expertHash } from './utils/expertLocation'
import './ExpertDashboard.css'

type Page = 'resumen' | 'tareas' | 'cinepolitos' | 'cursos' | 'reportes'
type Editor = { kind: 'person'; record?: Cinepolito } | { kind: 'course'; record?: Course } | { kind: 'task'; record?: Task } | { kind: 'report' } | { kind: 'import' }
type TaskFilter = 'all' | 'open' | 'done'
const pages: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'tareas', label: 'Tareas', icon: ClipboardList },
  { id: 'cinepolitos', label: 'Cinepolitos', icon: Users },
  { id: 'cursos', label: 'Cursos', icon: GraduationCap },
  { id: 'reportes', label: 'Reportes', icon: FileText },
]
const pageDescriptions: Record<Page, string> = {
  resumen: 'Consulta las tareas y el avance de capacitación de tu equipo.',
  tareas: 'Organiza las actividades del equipo y registra cuándo se completan.',
  cinepolitos: 'Consulta y actualiza el avance de cada persona en Learning Center.',
  cursos: 'Administra los cursos de Learning Center que asignas al equipo.',
  reportes: 'Descarga un PDF con los registros que necesitas compartir.',
}

function getPage(): Page {
  return pages.find(item => location.hash === expertHash + '/' + item.id)?.id ?? 'resumen'
}

function upsert<T extends { id: string }>(items: T[], record: T) {
  return items.some(item => item.id === record.id)
    ? items.map(item => item.id === record.id ? record : item)
    : [...items, record]
}

function readInitial() {
  try {
    const mode = localStorage.getItem('cinepolis-expertos.mode')
    return { data: readWorkspace(), error: '', demo: mode === 'demo' || (mode !== 'real' && !localStorage.getItem(storageKey)) }
  } catch {
    return { data: emptyWorkspace, error: 'No se pudieron leer los registros guardados en este navegador.', demo: false }
  }
}

function SectionEmpty({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="empty"><span className="tile-icon blue"><Icon size={22} /></span><strong>{title}</strong><p>{description}</p></div>
}

function TaskList({ tasks, onEdit, onToggle, busy }: {
  tasks: Task[]; onEdit: (task: Task) => void; onToggle: (task: Task) => void; busy: boolean
}) {
  if (!tasks.length) return <SectionEmpty icon={ClipboardList} title="Sin tareas en esta vista" description="Las tareas que coincidan con el filtro aparecerán aquí." />
  const today = calendarDate()
  return <ul className="task-list">{tasks.map(task => <li key={task.id}>
    <button type="button" className={'task-check' + (task.done ? ' checked' : '')} onClick={() => onToggle(task)} aria-pressed={task.done}
      aria-label={(task.done ? 'Reabrir ' : 'Completar ') + task.title} disabled={busy}>{task.done && <Check size={14} />}</button>
    <button type="button" className="task-info" onClick={() => onEdit(task)}>
      <strong>{task.title}</strong>
      <span className={!task.done && task.due && task.due < today ? 'overdue' : ''}>
        {task.owner && task.owner + ' · '}{!task.due ? 'Sin fecha' : task.due === today ? 'Hoy' : formatDate(task.due)}
        {!task.done && task.due && task.due < today && ' · Vencida'}
      </span>
    </button>
    <span className={'priority ' + task.priority.toLowerCase()}><i />{task.priority}</span>
  </li>)}</ul>
}

function PeopleTable({ people, onEdit }: { people: Cinepolito[]; onEdit: (person: Cinepolito) => void }) {
  if (!people.length) return <SectionEmpty icon={Users} title="Sin cinepolitos en esta vista" description="Agrega un cinepolito o ajusta los filtros." />
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="Listado de cinepolitos">
    <table>
      <thead><tr><th scope="col">Cinepolito</th><th scope="col" className="table-area">Área</th><th scope="col" className="table-progress">Avance en cursos</th><th scope="col">Estado</th><th scope="col" aria-label="Editar" /></tr></thead>
      <tbody>{people.map(person => {
        const progress = getProgress(person)
        const status = getStatus(person)
        const initials = person.name.split(/\s+/).slice(0, 2).map(name => name.charAt(0).toUpperCase()).join('')
        const tone = (person.name.codePointAt(0) ?? 0) % 4
        return <tr key={person.id}>
          <td><div className="person-cell">
            <span className={'avatar tone-' + tone} aria-hidden="true">{initials}</span>
            <div>
              <strong>{person.name}</strong>{person.number && <small>{person.number}</small>}
              <small className="person-meta">{person.area}{progress.assigned > 0 && ' · ' + progress.completed + '/' + progress.assigned + ' cursos'}</small>
            </div>
          </div></td>
          <td className="table-area">{person.area}</td>
          <td className="table-progress"><div className="progress-cell"><progress max={100} value={progress.percent} aria-label={'Avance de ' + person.name} /><span>{progress.completed}/{progress.assigned}</span></div></td>
          <td><span className={'status ' + status}><i />{status === 'pending' ? progress.pending + (progress.pending === 1 ? ' pendiente' : ' pendientes') : statusLabels[status]}</span></td>
          <td><button className="icon-button" aria-label={'Editar a ' + person.name} onClick={() => onEdit(person)}><Pencil size={16} /></button></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

export default function ExpertDashboard({ onBack }: { onBack: () => void }) {
  const [initial] = useState(readInitial)
  const [stored, setStored] = useState(initial.data)
  const [demoData, setDemoData] = useState(createDemoWorkspace)
  const [demo, setDemo] = useState(initial.demo)
  const [page, setPage] = useState(getPage)
  const [menu, setMenu] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(initial.error)
  const [busy, setBusy] = useState(false)
  const committing = useRef(false)
  const [status, setStatus] = useState<PeopleStatus>('all')
  const [area, setArea] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [query, setQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open')
  const workspace = demo ? demoData : stored
  const openTasks = pendingTasks(workspace.tasks)
  const pending = filterPeople(workspace.people, 'pending').length
  const current = filterPeople(workspace.people, 'complete').length
  const unassigned = workspace.people.length - pending - current
  const progressTotals = workspace.people.reduce((total, person) => {
    const progress = getProgress(person)
    return { assigned: total.assigned + progress.assigned, completed: total.completed + progress.completed }
  }, { assigned: 0, completed: 0 })
  const percent = progressTotals.assigned ? Math.round(progressTotals.completed / progressTotals.assigned * 100) : 0
  const currentShare = workspace.people.length ? current / workspace.people.length * 100 : 0
  const assignedShare = workspace.people.length ? (pending + current) / workspace.people.length * 100 : 0
  const areas = [...new Set(workspace.people.map(person => person.area))].sort((a, b) => a.localeCompare(b, 'es'))
  const selectedArea = areas.includes(area) ? area : ''
  const selectedCourse = workspace.courses.some(course => course.id === courseFilter) && status !== 'unassigned' ? courseFilter : ''
  const matchingPeople = filterPeople(workspace.people, status, selectedArea, selectedCourse, query)
  const doneTasks = workspace.tasks.filter(task => task.done)
  const matchingTasks = taskFilter === 'open' ? openTasks : taskFilter === 'done' ? doneTasks : [...openTasks, ...doneTasks]
  const reportFilters: ReportFilters = page === 'cinepolitos'
    ? { type: status, area: selectedArea, course: selectedCourse }
    : { type: page === 'tareas' ? 'tasks' : 'all', area: '', course: '' }

  useEffect(() => {
    function hashChanged() {
      setPage(getPage())
      setMenu(false)
    }
    function storageChanged(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return
      try {
        setStored(readWorkspace())
        setStorageError('')
      } catch {
        setStorageError('No se pudieron leer los registros guardados en este navegador.')
      }
    }
    window.addEventListener('hashchange', hashChanged)
    window.addEventListener('storage', storageChanged)
    return () => {
      window.removeEventListener('hashchange', hashChanged)
      window.removeEventListener('storage', storageChanged)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4200)
    return () => clearTimeout(timer)
  }, [notice])

  function navigate(destination: Page) {
    setPage(destination)
    setMenu(false)
    location.hash = expertHash + '/' + destination
    window.scrollTo({ top: 0 })
  }

  function showPeople(next: PeopleStatus = 'all', course = '') {
    setStatus(next)
    setArea('')
    setCourseFilter(course)
    setQuery('')
    navigate('cinepolitos')
  }

  function openEditor(next: Editor) {
    setFormError('')
    setEditor(next)
  }

  function switchMode() {
    if (committing.current) return
    const next = !demo
    setDemo(next)
    setQuery('')
    setStatus('all')
    setArea('')
    setCourseFilter('')
    setTaskFilter('open')
    try {
      localStorage.setItem('cinepolis-expertos.mode', next ? 'demo' : 'real')
    } catch {
      setStorageError('El navegador no permite guardar los registros. Revisa la configuración de almacenamiento.')
    }
  }

  async function commit(transform: (latest: Workspace) => Workspace, message: string | (() => string)) {
    if (committing.current) return false
    committing.current = true
    setBusy(true)
    setFormError('')
    try {
      function write() {
        const latest = demo ? demoData : readWorkspace()
        const next = { ...transform(latest), updatedAt: new Date().toISOString() }
        if (demo) setDemoData(next)
        else {
          localStorage.setItem(storageKey, JSON.stringify(next))
          setStored(next)
          setStorageError('')
        }
      }
      if (!demo && navigator.locks) await navigator.locks.request(storageKey, write)
      else write()
      setEditor(null)
      setNotice(typeof message === 'string' ? message : message())
      return true
    } catch (error) {
      const message = error instanceof Error && error.name === 'ValidationError'
        ? error.message
        : 'No se pudo guardar el cambio. Revisa el almacenamiento del navegador.'
      if (editor) setFormError(message)
      else setStorageError(message)
      return false
    } finally {
      committing.current = false
      setBusy(false)
    }
  }

  function savePerson(person: Cinepolito) {
    return commit(latest => {
      if (person.number && latest.people.some(item => item.id !== person.id && normalize(item.number) === normalize(person.number))) {
        throw new DOMException('Ese número de empleado ya está registrado.', 'ValidationError')
      }
      const progress = Object.fromEntries(latest.courses.filter(course => Object.hasOwn(person.progress, course.id)).map(course => [course.id, person.progress[course.id]]))
      const canonicalArea = latest.people.find(item => normalize(item.area) === normalize(person.area))?.area ?? person.area
      return { ...latest, people: upsert(latest.people, { ...person, area: canonicalArea, progress }) }
    }, 'Cinepolito guardado.')
  }

  function importPeople(rows: EmployeeRow[], defaultArea: string) {
    let count = 0
    return commit(latest => {
      const knownIds = new Set(latest.people.map(person => normalize(person.number)))
      const knownAreas = new Map(latest.people.map(person => [normalize(person.area), person.area]))
      const added: Cinepolito[] = []
      for (const row of rows) {
        const id = normalize(row.number)
        if (knownIds.has(id)) continue
        knownIds.add(id)
        const area = row.area || defaultArea || 'Sin asignar'
        const canonical = knownAreas.get(normalize(area)) ?? area
        knownAreas.set(normalize(area), canonical)
        added.push({ id: crypto.randomUUID(), number: row.number, name: row.name || 'Empleado ' + row.number, area: canonical, progress: {} })
      }
      count = added.length
      if (!count) throw new DOMException('Los IDs seleccionados ya están registrados.', 'ValidationError')
      return { ...latest, people: [...latest.people, ...added] }
    }, () => count === 1 ? '1 cinepolito importado.' : count + ' cinepolitos importados.')
  }

  function saveCourse(course: Course) {
    return commit(latest => {
      if (latest.courses.some(item => item.id !== course.id && normalize(item.name) === normalize(course.name))) {
        throw new DOMException('Ya existe un curso con ese nombre.', 'ValidationError')
      }
      return { ...latest, courses: upsert(latest.courses, course) }
    }, 'Curso guardado.')
  }

  function removeCourse(id: string) {
    return commit(latest => ({
      ...latest,
      courses: latest.courses.filter(course => course.id !== id),
      people: latest.people.map(person => ({
        ...person, progress: Object.fromEntries(Object.entries(person.progress).filter(([course]) => course !== id)),
      })),
    }), 'Curso y asignaciones eliminados.')
  }

  function toggleTask(task: Task) {
    void commit(latest => ({
      ...latest, tasks: latest.tasks.map(item => item.id === task.id ? { ...item, done: !task.done } : item),
    }), task.done ? 'Tarea reabierta.' : 'Tarea completada.')
  }

  const closeEditor = () => setEditor(null)
  const onEditPerson = (record: Cinepolito) => openEditor({ kind: 'person', record })
  const onEditTask = (record: Task) => openEditor({ kind: 'task', record })
  const exportButton = <button className="button secondary" onClick={() => openEditor({ kind: 'report' })}><ArrowDownToLine size={16} /> Exportar PDF</button>
  const statCards = [
    { label: 'Cinepolitos registrados', value: workspace.people.length, detail: 'En el directorio del equipo', color: 'blue', icon: Users, action: () => showPeople() },
    { label: 'Con cursos pendientes', value: pending, detail: 'Requieren seguimiento', color: 'amber', icon: BookOpen, action: () => showPeople('pending') },
    { label: 'Tareas pendientes', value: openTasks.length, detail: 'Actividades por completar', color: 'purple', icon: ClipboardList, action: () => { setTaskFilter('open'); navigate('tareas') } },
    { label: 'Avance de capacitación', value: progressTotals.assigned ? percent + '%' : '—', detail: progressTotals.completed + ' de ' + progressTotals.assigned + ' asignaciones completadas', color: 'green', icon: CheckCircle2, action: () => navigate('cursos') },
  ]

  return <div className="expert-app">
    {menu && <button className="mobile-overlay" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />}
    <aside className={'sidebar' + (menu ? ' expanded' : '')}>
      <a className="brand" href={expertHash + '/resumen'} onClick={() => navigate('resumen')}>
        <span className="brand-mark"><Film size={23} /></span>
        <span><strong>Cinépolis<span className="brand-dot">.</span></strong><small>EXPERTOS</small></span>
      </a>
      <button className="icon-button close-nav" aria-label="Cerrar navegación" onClick={() => setMenu(false)}><X size={20} /></button>
      <nav aria-label="Navegación principal">
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        {pages.map(({ id, label, icon: Icon }) => <a key={id} href={expertHash + '/' + id} onClick={() => { setMenu(false); window.scrollTo({ top: 0 }) }}
          className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}>
          <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
          {id === 'tareas' && openTasks.length > 0 && <span className="nav-count">{openTasks.length}</span>}
        </a>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="workspace-indicator"><span className="workspace-icon"><Database size={17} /></span>
          <div><strong>{demo ? 'Vista de ejemplo' : 'Datos del equipo'}</strong><small>{demo ? 'Registros ficticios' : 'Guardado en este navegador'}</small></div>
        </div>
        {!demo && <button className="switch-mode" onClick={switchMode} disabled={busy}>Ver datos de ejemplo<ArrowRight size={15} /></button>}
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb">
          <button className="icon-button menu-button" onClick={() => setMenu(!menu)} aria-label="Abrir navegación" aria-expanded={menu}><Menu size={22} /></button>
          <span>Espacio de trabajo</span><ChevronRight size={14} /><strong>{pages.find(item => item.id === page)?.label}</strong>
        </div>
        <div className="top-meta">
          {demo && <button className="demo-badge" type="button" onClick={switchMode} disabled={busy} title="Salir de la vista de ejemplo">Usar datos reales <ArrowRight size={14} /></button>}
          <div className="top-date"><CalendarDays size={16} /><span>{formatDate(calendarDate(), true)}</span></div>
          <button className="back-button" onClick={onBack} aria-label="Volver a encuestas" title="Volver a encuestas" disabled={busy}><ArrowLeft size={16} /><span>Volver a encuestas</span></button>
        </div>
      </header>

      <main className="content" id="main-content">
        <header className="page-heading">
          <div><h1>{page === 'resumen' ? 'Panel de seguimiento' : pages.find(item => item.id === page)?.label}</h1><p>{pageDescriptions[page]}</p></div>
          <div className="heading-actions">
            {page !== 'reportes' && exportButton}
            {page === 'cinepolitos' && <>
              <button className="button secondary" onClick={() => openEditor({ kind: 'import' })}><FileUp size={16} /> Importar PDF</button>
              <button className="button primary" onClick={() => openEditor({ kind: 'person' })}><Plus size={17} /> Agregar cinepolito</button>
            </>}
            {page === 'cursos' && <button className="button primary" onClick={() => openEditor({ kind: 'course' })}><Plus size={17} /> Agregar curso</button>}
            {page === 'tareas' && <button className="button primary" onClick={() => openEditor({ kind: 'task' })}><Plus size={17} /> Nueva tarea</button>}
          </div>
        </header>

        {!demo && storageError && <p className="storage-error" role="alert">{storageError}</p>}

        {page === 'resumen' && <>
          <section className="hero" aria-label="Learning Center">
            <div className="hero-content">
              <span className="hero-kicker"><GraduationCap size={16} /> LEARNING CENTER</span>
              <h2>Capacitación de tu equipo</h2>
              <p>Revisa quién tiene cursos pendientes y registra su avance.</p>
              <button className="button hero-button" onClick={() => showPeople('pending')}>Ver cursos pendientes <ArrowRight size={16} /></button>
            </div>
          </section>

          <div className="stat-grid">
            {statCards.map(({ label, value, detail, color, icon: Icon, action }) => <button className="stat-card" key={label} onClick={action}>
              <div className="stat-top"><span className={'tile-icon ' + color}><Icon size={21} strokeWidth={1.8} /></span><ArrowRight className="stat-arrow" size={16} /></div>
              <span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small>
            </button>)}
          </div>

          <div className="overview-grid">
            <section className="panel">
              <div className="panel-heading"><div><h2>Estado de capacitación</h2><p>Situación de los cinepolitos registrados</p></div></div>
              <div className="chart">
                <div className="donut" aria-hidden="true" style={{ background: 'conic-gradient(#3564ea 0% ' + currentShare + '%, #efb648 ' + currentShare + '% ' + assignedShare + '%, #e8edf5 ' + assignedShare + '% 100%)' }}>
                  <div><strong>{workspace.people.length}</strong><small>Cinepolitos</small></div>
                </div>
                <div className="legend">
                  <button onClick={() => showPeople('complete')}><i className="legend-complete" /><span>Al corriente</span><strong>{current}</strong></button>
                  <button onClick={() => showPeople('pending')}><i className="legend-pending" /><span>Con pendientes</span><strong>{pending}</strong></button>
                  <button onClick={() => showPeople('unassigned')}><i className="legend-unassigned" /><span>Sin cursos asignados</span><strong>{unassigned}</strong></button>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading"><div><h2>Tareas pendientes</h2><p>Ordenadas por fecha límite</p></div>
                <button className="text-button" onClick={() => { setTaskFilter('open'); navigate('tareas') }}>Ver todas <ArrowRight size={15} /></button>
              </div>
              <TaskList tasks={openTasks.slice(0, 3)} onEdit={onEditTask} onToggle={toggleTask} busy={busy} />
            </section>
          </div>

          <section className="panel people-panel">
            <div className="panel-heading"><div><h2>Cinepolitos con cursos pendientes</h2><p>Personas que necesitan seguimiento</p></div>
              <button className="text-button" onClick={() => showPeople('pending')}>Ver lista <ArrowRight size={15} /></button>
            </div>
            <PeopleTable people={filterPeople(workspace.people, 'pending').slice(0, 4)} onEdit={onEditPerson} />
          </section>
        </>}

        {page === 'cinepolitos' && <section className="panel people-panel">
          <div className="filters">
            <label className="search"><Search size={18} /><input aria-label="Buscar cinepolitos" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o número…" /></label>
            <select aria-label="Estado de capacitación" value={status} onChange={event => {
              const next = event.target.value as PeopleStatus
              setStatus(next)
              if (next === 'unassigned') setCourseFilter('')
            }}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="Área" value={selectedArea} onChange={event => setArea(event.target.value)}><option value="">Todas las áreas</option>{areas.map(item => <option key={item}>{item}</option>)}</select>
            <select aria-label="Curso" value={selectedCourse} onChange={event => setCourseFilter(event.target.value)} disabled={status === 'unassigned'}>
              <option value="">Todos los cursos</option>{workspace.courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </div>
          {selectedCourse && <p className="filter-note">El filtro de estado se aplica al curso seleccionado. La tabla muestra el avance total de cada persona.</p>}
          <PeopleTable people={matchingPeople} onEdit={onEditPerson} />
          <p className="table-footer" aria-live="polite">{matchingPeople.length} de {workspace.people.length} cinepolitos</p>
        </section>}

        {page === 'tareas' && <section className="panel">
          <div className="task-filters" aria-label="Filtrar tareas">
            {([['open', 'Pendientes', openTasks.length], ['done', 'Completadas', doneTasks.length], ['all', 'Todas', workspace.tasks.length]] as const)
              .map(([id, label, count]) => <button className={taskFilter === id ? 'selected' : ''} aria-pressed={taskFilter === id} key={id} onClick={() => setTaskFilter(id)}>{label} <span>{count}</span></button>)}
          </div>
          <TaskList tasks={matchingTasks} onEdit={onEditTask} onToggle={toggleTask} busy={busy} />
        </section>}

        {page === 'cursos' && (workspace.courses.length ? <div className="course-grid">
          {workspace.courses.map(course => {
            const coursePeople = filterPeople(workspace.people, 'all', '', course.id)
            const done = coursePeople.filter(person => person.progress[course.id]).length
            return <article className="panel course-card" key={course.id}>
              <div className="course-head"><span className="tile-icon blue"><BookOpen size={22} /></span><button className="icon-button" aria-label={'Editar ' + course.name} onClick={() => openEditor({ kind: 'course', record: course })}><Pencil size={17} /></button></div>
              <h2>{course.name}</h2>{course.description && <p>{course.description}</p>}
              <div className="course-progress"><progress aria-label={'Avance de ' + course.name} max={100} value={coursePeople.length ? done / coursePeople.length * 100 : 0} /><small>{done} de {coursePeople.length} cinepolitos lo completaron</small></div>
              <button className="text-button" onClick={() => showPeople('pending', course.id)}>Ver pendientes ({coursePeople.length - done}) <ArrowRight size={15} /></button>
            </article>
          })}
        </div> : <div className="panel"><SectionEmpty icon={BookOpen} title="Aún no hay cursos" description="Agrega un curso para asignarlo a los cinepolitos." /></div>)}

        {page === 'reportes' && <ReportForm key={demo ? 'demo' : 'real'} workspace={workspace} demo={demo} initial={reportFilters} onDownload={() => setNotice('PDF generado.')} />}

        <footer className="page-footer"><span>Cinépolis Expertos</span><span><Clock3 size={14} />{workspace.updatedAt ? 'Actualizado ' + formatUpdate(workspace.updatedAt) : demo ? 'Datos de ejemplo' : 'Sin registros actualizados'}</span></footer>
      </main>
    </div>

    {notice && <div className="toast" role="status"><CheckCircle2 size={19} /> {notice}</div>}

    {editor?.kind === 'person' && <PersonForm person={editor.record} workspace={workspace} demo={demo} busy={busy} error={formError}
      onClose={closeEditor} onSave={savePerson} onDelete={editor.record && (() => commit(latest => ({
        ...latest, people: latest.people.filter(person => person.id !== editor.record!.id),
      }), 'Cinepolito eliminado.'))} />}
    {editor?.kind === 'course' && <CourseForm course={editor.record} demo={demo} busy={busy} error={formError} onClose={closeEditor} onSave={saveCourse}
      onDelete={editor.record && (() => removeCourse(editor.record!.id))} />}
    {editor?.kind === 'task' && <TaskForm task={editor.record} demo={demo} busy={busy} error={formError} onClose={closeEditor}
      onSave={task => commit(latest => ({ ...latest, tasks: upsert(latest.tasks, task) }), 'Tarea guardada.')}
      onDelete={editor.record && (() => commit(latest => ({ ...latest, tasks: latest.tasks.filter(task => task.id !== editor.record!.id) }), 'Tarea eliminada.'))} />}
    {editor?.kind === 'import' && <EmployeeImport people={workspace.people} demo={demo} busy={busy} error={formError} onClose={closeEditor} onImport={importPeople} />}
    {editor?.kind === 'report' && <ReportForm workspace={workspace} demo={demo} initial={reportFilters} onClose={closeEditor} onDownload={() => {
      closeEditor()
      setNotice('PDF generado.')
    }} />}
  </div>
}
