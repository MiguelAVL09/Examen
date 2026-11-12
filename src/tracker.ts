export interface Cinepolito {
  id: string
  name: string
  number: string
  area: string
  progress: Record<string, boolean>
}

export interface Course {
  id: string
  name: string
  description: string
}

export interface Task {
  id: string
  title: string
  notes: string
  owner: string
  due: string
  priority: 'Alta' | 'Media' | 'Baja'
  done: boolean
}

export interface Workspace {
  people: Cinepolito[]
  courses: Course[]
  tasks: Task[]
  updatedAt: string | null
}

export const emptyWorkspace: Workspace = { people: [], courses: [], tasks: [], updatedAt: null }
export const storageKey = 'cinepolis-expertos.workspace.v1'

export function calendarDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const [year, month, day] = ['year', 'month', 'day'].map(type => Number(parts.find(part => part.type === type)?.value))
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

export function formatDate(date: string, full = false) {
  const time = Date.parse(date + 'T12:00:00Z')
  if (!Number.isFinite(time)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: full ? 'long' : 'short', ...(full && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(time)
}

export function formatUpdate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City',
  }).format(new Date(date))
}

export function normalize(text: string) {
  return text.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function getProgress(person: Cinepolito) {
  const assigned = Object.values(person.progress)
  const completed = assigned.filter(Boolean).length
  const pending = assigned.length - completed
  return { assigned: assigned.length, completed, pending, percent: assigned.length ? Math.round(completed / assigned.length * 100) : 0 }
}

export function getStatus(person: Cinepolito) {
  const { assigned, pending } = getProgress(person)
  if (!assigned) return 'unassigned'
  return pending ? 'pending' : 'complete'
}

export const statusLabels = {
  all: 'Todos los cinepolitos',
  pending: 'Con cursos pendientes',
  complete: 'Al corriente',
  unassigned: 'Sin cursos asignados',
} as const

export type PeopleStatus = keyof typeof statusLabels

export function filterPeople(people: Cinepolito[], status: PeopleStatus, area = '', course = '', query = '') {
  return people.filter(person => {
    const matchesCourse = !course || Object.hasOwn(person.progress, course)
    const statusMatches = status === 'all' || (course
      ? (status === 'pending' && person.progress[course] === false) || (status === 'complete' && person.progress[course] === true)
      : getStatus(person) === status)
    return matchesCourse && statusMatches && (!area || person.area === area) &&
      normalize([person.name, person.number, person.area].join(' ')).includes(normalize(query))
  })
}

export function pendingTasks(tasks: Task[]) {
  return tasks.filter(task => !task.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
}

export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return emptyWorkspace
  const data: Workspace = JSON.parse(raw)
  if (!Array.isArray(data?.people) || !Array.isArray(data.courses) || !Array.isArray(data.tasks)) {
    throw new Error('Invalid workspace')
  }
  if (!data.people.every(person => person && typeof person.id === 'string' && typeof person.name === 'string' &&
      typeof person.area === 'string' && typeof person.number === 'string' && person.progress &&
      typeof person.progress === 'object' && !Array.isArray(person.progress)) ||
      !data.courses.every(course => course && typeof course.id === 'string' && typeof course.name === 'string') ||
      !data.tasks.every(task => task && typeof task.id === 'string' && typeof task.title === 'string' &&
        typeof task.priority === 'string' && typeof task.due === 'string')) {
    throw new Error('Invalid workspace records')
  }
  return { ...data, updatedAt: typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt)) ? data.updatedAt : null }
}

const courses: Course[] = [
  { id: 'service', name: 'Experiencia del invitado', description: 'Estándares de atención y servicio en el cine.' },
  { id: 'safety', name: 'Seguridad y prevención', description: 'Prevención de riesgos y protocolos de seguridad.' },
  { id: 'food', name: 'Manejo higiénico de alimentos', description: 'Buenas prácticas de higiene en alimentos y bebidas.' },
  { id: 'induction', name: 'Inducción Cinépolis', description: 'Cultura, valores y operación del cine.' },
]

const demoPeople: [string, string, string, (boolean | null)[]][] = [
  ['Valeria Morales', 'CP-1042', 'Dulcería', [true, false, false, true]],
  ['Diego Hernández', 'CP-1078', 'Taquilla', [true, true, null, true]],
  ['Camila Rodríguez', 'CP-1091', 'Salas', [false, true, null, true]],
  ['Mateo Sánchez', 'CP-1124', 'Dulcería', [true, true, true, true]],
  ['Sofía Ramírez', 'CP-1138', 'Salas', [true, false, null, true]],
  ['Andrés Navarro', 'CP-1157', 'Taquilla', [true, true, null, true]],
  ['Regina Torres', 'CP-1169', 'Dulcería', [true, true, false, true]],
  ['Emilio García', 'CP-1183', 'Salas', [true, true, null, true]],
  ['Mariana Cruz', 'CP-1205', 'Taquilla', [true, true, null, true]],
  ['Daniel Ríos', 'CP-1214', 'Proyección', [true, true, null, true]],
  ['Lucía Mendoza', 'CP-1236', 'Dulcería', [true, true, true, true]],
  ['Hugo Castillo', 'CP-1240', 'Proyección', [true, true, null, true]],
]

export const createDemoWorkspace = (): Workspace => ({
  people: demoPeople.map(([name, number, area, progress], index) => ({
    id: 'person-' + index, name, number, area,
    progress: Object.fromEntries(progress.flatMap((done, course) => done === null ? [] : [[courses[course].id, done]])),
  })),
  courses,
  tasks: [
    { id: 't1', title: 'Validar cursos de nuevo ingreso', owner: 'Formación', notes: '', due: calendarDate(), priority: 'Alta', done: false },
    { id: 't2', title: 'Actualizar avance de Dulcería', owner: 'Dulcería', notes: '', due: calendarDate(2), priority: 'Media', done: false },
    { id: 't3', title: 'Preparar reporte de capacitación', owner: 'Operaciones', notes: '', due: calendarDate(4), priority: 'Baja', done: false },
    { id: 't4', title: 'Revisar asignaciones de Taquilla', owner: 'Taquilla', notes: '', due: calendarDate(-2), priority: 'Media', done: true },
  ],
  updatedAt: null,
})
