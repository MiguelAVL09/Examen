import type { Cinepolito, Workspace } from './tracker'
import { filterPeople, formatDate, formatUpdate, getProgress, getStatus, pendingTasks, statusLabels } from './tracker'

export type ReportType = keyof typeof statusLabels | 'tasks'
export interface ReportFilters {
  type: ReportType
  area: string
  course: string
}

export const reportLabels = { ...statusLabels, tasks: 'Tareas pendientes' }

export function reportPeople(workspace: Workspace, filters: ReportFilters) {
  return filterPeople(workspace.people, filters.type === 'tasks' ? 'all' : filters.type, filters.area, filters.course)
}

function courseSummary(person: Cinepolito, workspace: Workspace, courseId: string) {
  const courses = workspace.courses.filter(course => Object.hasOwn(person.progress, course.id) && (!courseId || course.id === courseId))
  return courses.map(course => course.name + (person.progress[course.id] ? ' (completado)' : ' (pendiente)')).join('\n') || 'Sin cursos asignados'
}

export async function downloadReport(workspace: Workspace, filters: ReportFilters) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', putOnlyUsedFonts: true })
  const width = doc.internal.pageSize.getWidth()
  const tasks = filters.type === 'tasks'
  const people = reportPeople(workspace, filters)
  const openTasks = pendingTasks(workspace.tasks)
  const courseName = workspace.courses.find(course => course.id === filters.course)?.name
  const criteria = tasks ? '' : [filters.area && 'Área: ' + filters.area, courseName && 'Curso: ' + courseName].filter(Boolean).join('  |  ')
  doc.setFontSize(9)
  const filterLines: string[] = criteria ? doc.splitTextToSize(criteria, width - 28) : []
  doc.setProperties({ title: reportLabels[filters.type] + ' | Cinépolis Expertos' })

  const body = tasks
    ? openTasks.map(task => [task.title, task.owner || '—', task.due ? formatDate(task.due, true) : 'Sin fecha', task.priority, task.notes || '—'])
    : people.map(person => {
      const progress = getProgress(person)
      const status = filters.course
        ? (person.progress[filters.course] ? 'Completado' : 'Pendiente')
        : statusLabels[getStatus(person)]
      return [person.name, person.number || '—', person.area, status, progress.completed + ' / ' + progress.assigned, courseSummary(person, workspace, filters.course)]
    })

  const bannerHeight = 38 + filterLines.length * 4
  const columns = tasks
    ? ['Tarea', 'Responsable', 'Fecha límite', 'Prioridad', 'Notas']
    : ['Cinepolito', 'Núm. empleado', 'Área', 'Estado', 'Avance total', 'Cursos']
  autoTable(doc, {
    head: [columns],
    body: body.length ? body : [[{ content: 'No hay registros para estos filtros.', colSpan: columns.length }]],
    margin: { left: 14, right: 14, top: bannerHeight + 5, bottom: 17 },
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [27, 40, 68] },
    headStyles: { fillColor: [37, 71, 162], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [243, 246, 252] },
    willDrawPage: () => {
      doc.setFillColor(12, 26, 61)
      doc.rect(0, 0, width, bannerHeight, 'F')
      doc.setTextColor(233, 239, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('CINÉPOLIS EXPERTOS', 14, 10)
      doc.setFontSize(20)
      doc.text(reportLabels[filters.type], 14, 21)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const count = body.length + (body.length === 1 ? ' registro' : ' registros')
      doc.text(formatUpdate(new Date().toISOString()) + '  |  ' + count, 14, 31)
      if (filterLines.length) doc.text(filterLines, 14, 37)
    },
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    const footerY = doc.internal.pageSize.getHeight() - 9
    doc.setFontSize(8)
    doc.setTextColor(81, 96, 126)
    doc.text('Seguimiento de capacitación y operación', 14, footerY)
    doc.text(page + ' / ' + pages, width - 14, footerY, { align: 'right' })
  }
  doc.save('cinepolis-expertos-' + filters.type + '.pdf')
}
