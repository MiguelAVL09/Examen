import type { Quiz, UserAccount } from './types/quiz'
import { isSurveyQuiz } from './utils/quizKind'
import { employeeKey } from '../supabase/functions/_shared/employeeIdentity'

export { employeeKey, validEmployeeId } from '../supabase/functions/_shared/employeeIdentity'

export interface Cinepolito {
  id: string
  accountId?: string
  name: string
  number: string
  area: string
  progress: Record<string, boolean>
}

export interface Course {
  id: string
  name: string
  description: string
  survey?: true
}

export type DirectoryAccount = Pick<UserAccount, 'id' | 'employeeNumber' | 'name' | 'fullName' | 'nickname' | 'department'>

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

export function getDirectoryPeople(people: Cinepolito[], accounts: DirectoryAccount[]) {
  const accountsByNumber = new Map<string, DirectoryAccount | null>()
  for (const account of accounts) {
    const number = employeeKey(account.employeeNumber)
    if (number) accountsByNumber.set(number, accountsByNumber.has(number) ? null : account)
  }

  const linkedPeople = new Map<string, Cinepolito>()
  const peopleWithoutAccount: Cinepolito[] = []
  for (const person of people) {
    const accountId = person.accountId ?? accountsByNumber.get(employeeKey(person.number))?.id
    if (!accountId) {
      peopleWithoutAccount.push(person)
      continue
    }
    const other = linkedPeople.get(accountId)
    if (!other) linkedPeople.set(accountId, person)
    else {
      const [primary, secondary] = person.accountId ? [person, other] : [other, person]
      linkedPeople.set(accountId, { ...primary, progress: { ...secondary.progress, ...primary.progress } })
    }
  }

  return [...accounts.map(account => {
    const person = linkedPeople.get(account.id)
    return {
      id: person?.id ?? account.id,
      accountId: account.id,
      name: account.name || account.fullName || person?.name || account.nickname,
      number: account.employeeNumber ?? '',
      area: account.department || person?.area || 'Sin asignar',
      progress: person?.progress ?? {},
    }
  }), ...peopleWithoutAccount]
}

export function getTrainingWorkspace(workspace: Workspace, people: Cinepolito[], quizzes: Quiz[], completions: Record<string, string[]>): Workspace {
  const surveys = quizzes.filter(isSurveyQuiz).map(quiz => ({
    course: { id: `survey:${quiz.id}`, name: quiz.title, description: quiz.description, survey: true as const },
    completed: new Set(completions[quiz.id]),
  }))

  return {
    ...workspace,
    courses: [...workspace.courses, ...surveys.map(({ course }) => course)],
    people: people.map(person => ({
      ...person,
      progress: {
        ...person.progress,
        ...Object.fromEntries(surveys.map(({ course, completed }) => [course.id, !!person.accountId && completed.has(person.accountId)])),
      },
    })),
  }
}

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
