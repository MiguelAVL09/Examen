import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, Database, FileText, FileUp, Film, GraduationCap, LayoutDashboard, Menu,
  Pencil, Plus, Search, Users, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CourseForm, PersonForm, ReportForm, TaskForm } from './TrackerDialogs'
import { SurveyStartDialog } from './components/SurveyStartDialog'
import { EmployeeImport } from './EmployeeImport'
import type { EmployeeRow } from './employeePdf'
import { authService, cloudEmployeeAccess, USERS_STORAGE_KEY } from './services/authService'
import { quizService } from './services/quizService'
import { hasLocalWorkspaceToTransfer, readSharedWorkspace, transferLocalWorkspace, updateSharedWorkspace } from './services/sharedWorkspace'
import { loadSurveyCompletions, readSurveyCompletions, surveyCompletionKey } from './services/surveyCompletion'
import {
  calendarDate, employeeKey, emptyWorkspace, filterPeople, formatDate, formatUpdate, getDirectoryPeople,
  getProgress, getStatus, getTrainingWorkspace, normalize, pendingTasks, readWorkspace, statusLabels, storageKey,
} from './tracker'
import type { Cinepolito, Course, PeopleStatus, Task, Workspace } from './tracker'
import type { ReportFilters } from './trackerReport'
import type { Quiz, UserAccount } from './types/quiz'
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
  cinepolitos: 'Consulta el avance de cada persona en cursos y encuestas.',
  cursos: 'Administra cursos de Learning Center y consulta el avance en encuestas de Kahoot.',
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
    return { data: cloudEmployeeAccess ? emptyWorkspace : readWorkspace(), error: '' }
  } catch {
    return { data: emptyWorkspace, error: 'No se pudieron leer los registros guardados en este navegador.' }
  }
}

function readSyncedData() {
  try {
    return { accounts: authService.getDirectoryAccounts(), completions: cloudEmployeeAccess ? {} : readSurveyCompletions(), error: '' }
  } catch {
    return { accounts: [], completions: {}, error: 'No se pudieron leer las cuentas o el avance de las encuestas.' }
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

export default function ExpertDashboard({ quizzes, quizLoadError, onReloadQuizzes, onBack, user, onStartSurvey }: {
  quizzes: Quiz[]; quizLoadError: boolean; onReloadQuizzes: () => Promise<void>; onBack: () => void;
  user: UserAccount; onStartSurvey: (quiz: Quiz, name: string) => Promise<string | undefined>
}) {
  const [initial] = useState(readInitial)
  const [stored, setStored] = useState(initial.data)
  const [showWorkspaceTransfer, setShowWorkspaceTransfer] = useState(() => cloudEmployeeAccess && hasLocalWorkspaceToTransfer())
  const [synced, setSynced] = useState(readSyncedData)
  const [page, setPage] = useState(getPage)
  const [menu, setMenu] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(initial.error)
  const [busy, setBusy] = useState(false)
  const committing = useRef(false)
  const workspaceVersion = useRef(0)
  const [status, setStatus] = useState<PeopleStatus>('all')
  const [area, setArea] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [query, setQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open')
  const directory = useMemo(() => getDirectoryPeople(stored.people, synced.accounts), [stored.people, synced.accounts])
  const workspace = useMemo(() => getTrainingWorkspace(stored, directory, quizzes, synced.completions),
    [stored, directory, quizzes, synced.completions])
  const selectedSurvey = quizzes.find(quiz => quiz.id === selectedSurveyId)
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
      if (!cloudEmployeeAccess && (event.key === USERS_STORAGE_KEY || event.key === surveyCompletionKey || event.key === null)) {
        setSynced(readSyncedData())
      }
      if (cloudEmployeeAccess || (event.key !== storageKey && event.key !== null)) return
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
    if (!cloudEmployeeAccess) return
    let active = true
    let loading = false
    async function refreshDirectory() {
      if (loading) return
      loading = true
      const version = workspaceVersion.current
      try {
        const [accounts, completions, shared] = await Promise.all([authService.loadDirectoryAccounts(), loadSurveyCompletions(), readSharedWorkspace()])
        if (active) {
          setSynced({ accounts, completions, error: '' })
          if (version === workspaceVersion.current && !committing.current) setStored(shared)
        }
      } catch {
        if (active) setSynced(previous => ({ ...previous, error: 'No se pudo actualizar el directorio de cuentas y encuestas.' }))
      } finally {
        loading = false
      }
    }
    void refreshDirectory()
    const timer = window.setInterval(refreshDirectory, 20000)
    window.addEventListener('focus', refreshDirectory)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDirectory)
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

  async function commit(transform: (latest: Workspace) => Workspace, message: string | (() => string)) {
    if (committing.current) return false
    committing.current = true
    workspaceVersion.current++
    setBusy(true)
    setFormError('')
    try {
      function write() {
        const next = { ...transform(readWorkspace()), updatedAt: new Date().toISOString() }
        localStorage.setItem(storageKey, JSON.stringify(next))
        setStored(next)
        if (!cloudEmployeeAccess) setSynced(readSyncedData())
        setStorageError('')
      }
      if (cloudEmployeeAccess) {
        await authService.loadDirectoryAccounts()
        setStored(await updateSharedWorkspace(transform))
        setStorageError('')
      } else if (navigator.locks) await navigator.locks.request(storageKey, write)
      else write()
      setEditor(null)
      setNotice(typeof message === 'string' ? message : message())
      return true
    } catch (error) {
      const message = error instanceof Error && error.name === 'ValidationError'
        ? error.message
        : cloudEmployeeAccess ? 'No se pudo guardar el cambio. Revisa tu conexión y vuelve a intentarlo.'
          : 'No se pudo guardar el cambio. Revisa el almacenamiento del navegador.'
      if (editor) setFormError(message)
      else setStorageError(message)
      return false
    } finally {
      committing.current = false
      setBusy(false)
    }
  }

  async function importLocalWorkspace() {
    if (committing.current) return
    committing.current = true
    workspaceVersion.current++
    setBusy(true)
    try {
      setStored(await transferLocalWorkspace())
      setShowWorkspaceTransfer(false)
      setStorageError('')
      setNotice('Cursos, tareas y registros trasladados al espacio compartido.')
    } catch {
      setStorageError('No se pudieron trasladar los registros de este dispositivo.')
    } finally {
      setBusy(false)
      committing.current = false
    }
  }

  function savePerson(person: Cinepolito) {
    return commit(latest => {
      const accounts = authService.getDirectoryAccounts()
      const people = getDirectoryPeople(latest.people, accounts)
      const current = people.find(item => person.accountId ? item.accountId === person.accountId : item.id === person.id)
      if (!current && editor?.kind === 'person' && editor.record) {
        throw new DOMException('El registro de este cinepolito cambió. Vuelve a abrirlo desde el directorio.', 'ValidationError')
      }
      const record = current?.accountId ? current : person
      const number = employeeKey(record.number)
      if (!record.accountId && number && people.some(item => item.id !== person.id && employeeKey(item.number) === number)) {
        throw new DOMException('Ese número de empleado ya está registrado.', 'ValidationError')
      }
      const progress = Object.fromEntries(latest.courses.filter(course => Object.hasOwn(person.progress, course.id)).map(course => [course.id, person.progress[course.id]]))
      const area = record.accountId ? record.area : people.find(item => normalize(item.area) === normalize(record.area))?.area ?? record.area
      const uniqueAccountNumber = number && accounts.filter(account => employeeKey(account.employeeNumber) === number).length === 1
      const storedPeople = record.accountId ? latest.people.filter(item => item.id === record.id ||
        (item.accountId ? item.accountId !== record.accountId : !uniqueAccountNumber || employeeKey(item.number) !== number)) : latest.people
      return { ...latest, people: upsert(storedPeople, { ...record, area, progress }) }
    }, 'Cinepolito guardado.')
  }

  function removePerson(id: string) {
    return commit(latest => {
      const person = getDirectoryPeople(latest.people, authService.getDirectoryAccounts()).find(item => item.id === id)
      if (person?.accountId) {
        throw new DOMException('Esta persona ya tiene una cuenta. Gestiona su acceso en Administración.', 'ValidationError')
      }
      return { ...latest, people: latest.people.filter(item => item.id !== id) }
    }, 'Cinepolito eliminado.')
  }

  function importPeople(rows: EmployeeRow[], defaultArea: string) {
    let count = 0
    return commit(latest => {
      const people = getDirectoryPeople(latest.people, authService.getDirectoryAccounts())
      const knownIds = new Set(people.map(person => employeeKey(person.number)))
      const knownAreas = new Map(people.map(person => [normalize(person.area), person.area]))
      const added: Cinepolito[] = []
      for (const row of rows) {
        const id = employeeKey(row.number)
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
          <div><strong>Datos del equipo</strong><small>{cloudEmployeeAccess ? 'Compartidos con la web y la app' : 'Guardado en este navegador'}</small></div>
        </div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb">
          <button className="icon-button menu-button" onClick={() => setMenu(!menu)} aria-label="Abrir navegación" aria-expanded={menu}><Menu size={22} /></button>
          <span>Espacio de trabajo</span><ChevronRight size={14} /><strong>{pages.find(item => item.id === page)?.label}</strong>
        </div>
        <div className="top-meta">
          <div className="top-date"><CalendarDays size={16} /><span>{formatDate(calendarDate(), true)}</span></div>
          <button className="back-button" onClick={onBack} disabled={busy}><ArrowLeft size={16} aria-hidden="true" /><span>Encuestas de Kahoot</span></button>
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

        {storageError && <p className="storage-error" role="alert">{storageError}</p>}
        {showWorkspaceTransfer && <div className="panel p-4 mb-4">
          <button className="button secondary" disabled={busy} onClick={() => void importLocalWorkspace()}>Trasladar registros de este dispositivo</button>
        </div>}
        {synced.error && <p className="storage-error" role="alert">{synced.error}</p>}
        {quizLoadError && <div className="storage-error" role="alert">
          No se pudieron cargar las encuestas de Kahoot. <button className="text-button" onClick={() => void onReloadQuizzes()}>Reintentar</button>
        </div>}

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
            const survey = course.surveyQuizId ? quizzes.find(quiz => quiz.id === course.surveyQuizId) : undefined
            const canAnswer = survey && survey.questions.length > 0 && quizService.isExamAccessible(survey).accessible
            return <article className="panel course-card" key={course.id}>
              <div className="course-head"><span className="tile-icon blue"><BookOpen size={22} /></span>{course.surveyQuizId
                ? <small>Encuesta de Kahoot</small>
                : <button className="icon-button" aria-label={'Editar ' + course.name} onClick={() => openEditor({ kind: 'course', record: course })}><Pencil size={17} /></button>}</div>
              <h2>{course.name}</h2>{course.description && <p>{course.description}</p>}
              <div className="course-progress"><progress aria-label={'Avance de ' + course.name} max={100} value={coursePeople.length ? done / coursePeople.length * 100 : 0} /><small>{done} de {coursePeople.length} cinepolitos lo completaron</small></div>
              {survey && (canAnswer
                ? <button type="button" className="button primary" disabled={busy} onClick={() => setSelectedSurveyId(survey.id)} aria-label={'Responder encuesta: ' + course.name}>Responder encuesta <ArrowRight size={15} aria-hidden="true" /></button>
                : <small className="survey-unavailable">{survey.questions.length ? 'Encuesta cerrada' : 'Encuesta sin preguntas'}</small>)}
              <button className="text-button" onClick={() => showPeople('pending', course.id)}>Ver pendientes ({coursePeople.length - done}) <ArrowRight size={15} /></button>
            </article>
          })}
        </div> : <div className="panel"><SectionEmpty icon={BookOpen} title="Aún no hay cursos" description="Agrega un curso para asignarlo a los cinepolitos." /></div>)}

        {page === 'reportes' && <ReportForm workspace={workspace} initial={reportFilters} onDownload={() => setNotice('PDF generado.')} />}

        <footer className="page-footer"><span>Cinépolis Expertos</span><span><Clock3 size={14} />{workspace.updatedAt ? 'Actualizado ' + formatUpdate(workspace.updatedAt) : 'Sin registros actualizados'}</span></footer>
      </main>
    </div>

    {notice && <div className="toast" role="status"><CheckCircle2 size={19} /> {notice}</div>}

    {selectedSurvey && <SurveyStartDialog key={selectedSurvey.id} quiz={selectedSurvey} user={user} initialName={user.name || user.nickname}
      onClose={() => setSelectedSurveyId(null)} onStart={name => onStartSurvey(selectedSurvey, name)} />}

    {editor?.kind === 'person' && <PersonForm person={editor.record} workspace={workspace} busy={busy} error={formError}
      onClose={closeEditor} onSave={savePerson} onDelete={editor.record && !editor.record.accountId ? () => removePerson(editor.record!.id) : undefined} />}
    {editor?.kind === 'course' && <CourseForm course={editor.record} busy={busy} error={formError} onClose={closeEditor} onSave={saveCourse}
      onDelete={editor.record && (() => removeCourse(editor.record!.id))} />}
    {editor?.kind === 'task' && <TaskForm task={editor.record} busy={busy} error={formError} onClose={closeEditor}
      onSave={task => commit(latest => ({ ...latest, tasks: upsert(latest.tasks, task) }), 'Tarea guardada.')}
      onDelete={editor.record && (() => commit(latest => ({ ...latest, tasks: latest.tasks.filter(task => task.id !== editor.record!.id) }), 'Tarea eliminada.'))} />}
    {editor?.kind === 'import' && <EmployeeImport people={workspace.people} busy={busy} error={formError} onClose={closeEditor} onImport={importPeople} />}
    {editor?.kind === 'report' && <ReportForm workspace={workspace} initial={reportFilters} onClose={closeEditor} onDownload={() => {
      closeEditor()
      setNotice('PDF generado.')
    }} />}
  </div>
}
