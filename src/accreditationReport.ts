import type { Cinepolito, Workspace } from './tracker'
import { formatUpdate } from './tracker'
import { accreditationLabels, getAccreditations, getAccreditationStatus } from './accreditations'
import { PROJECT_NOTICE } from './projectIdentity'
import { saveDocument } from './utils/platform'

export async function downloadAccreditationReport(workspace: Workspace, people: Cinepolito[], criteria: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const data = getAccreditations(workspace)
  const doc = new jsPDF({ orientation: 'landscape', putOnlyUsedFonts: true })
  const width = doc.internal.pageSize.getWidth()
  doc.setProperties({ title: 'Acreditaciones | Cinepolitos · Proyecto personal' })
  const colors = { accredited: [225, 244, 233], pending: [255, 240, 194], not_applicable: [231, 235, 242], unrecorded: [255, 255, 255] } as const
  autoTable(doc, {
    head: [['Cinepolito', 'ID', ...data.areas.map(area => area.name)]],
    body: people.length ? people.map(person => [person.name, person.number,
      ...data.areas.map(area => accreditationLabels[getAccreditationStatus(data, person, area.id)])])
      : [[{ content: 'No hay personas para estos filtros.', colSpan: data.areas.length + 2 }]],
    margin: { left: 12, right: 12, top: 50, bottom: 19 },
    styles: { fontSize: 7, cellPadding: 2.5, textColor: [27, 40, 68], overflow: 'linebreak', valign: 'middle' },
    columnStyles: { 0: { cellWidth: 51 }, 1: { cellWidth: 18 } },
    headStyles: { fillColor: [37, 71, 162], fontSize: 7, textColor: [255, 255, 255] },
    didParseCell: cell => {
      if (cell.section !== 'body' || cell.column.index < 2 || !people[cell.row.index]) return
      const area = data.areas[cell.column.index - 2]
      const state = getAccreditationStatus(data, people[cell.row.index], area.id)
      cell.cell.styles.fillColor = [...colors[state]]
    },
    willDrawPage: () => {
      doc.setFillColor(12, 26, 61); doc.rect(0, 0, width, 43, 'F')
      doc.setTextColor(233, 239, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text('CINEPOLITOS · PROYECTO PERSONAL', 12, 10)
      doc.setFontSize(20); doc.text('Acreditaciones del equipo', 12, 21)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(formatUpdate(new Date().toISOString()) + ' | ' + people.length + ' personas', 12, 29)
      doc.text(doc.splitTextToSize(criteria, width - 24), 12, 36)
    },
  })
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(7); doc.setTextColor(81, 96, 126)
    const y = doc.internal.pageSize.getHeight() - 12
    doc.text('Verde: acreditado | Amarillo: pendiente | Gris: no aplica | Blanco: sin registro', 12, y)
    doc.text(page + ' / ' + pages, width - 12, y, { align: 'right' })
    doc.text(PROJECT_NOTICE, 12, y + 5)
  }
  return saveDocument(doc.output('blob'), 'cinepolitos-acreditaciones.pdf')
}
