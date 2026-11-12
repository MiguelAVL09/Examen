import { employeeKey, normalize, validEmployeeId } from './tracker'

export interface EmployeeRow {
  number: string
  name: string
  area: string
}

interface TextCell {
  text: string
  x: number
  end: number
  height: number
}

interface TextFragment extends TextCell {
  y: number
}

function rowsFromFragments(fragments: TextFragment[]) {
  const rows: { y: number; cells: TextFragment[] }[] = []
  for (const fragment of fragments.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.at(-1)
    if (row && Math.abs(fragment.y - row.y) <= Math.min(4, fragment.height * .32)) {
      row.cells.push(fragment)
    } else {
      rows.push({ y: fragment.y, cells: [fragment] })
    }
  }

  return rows.map(row => {
    const cells: TextCell[] = []
    for (const fragment of row.cells.sort((a, b) => a.x - b.x)) {
      const previous = cells.at(-1)
      if (previous && fragment.x - previous.end <= Math.max(5, fragment.height * .7)) {
        previous.text += (fragment.x - previous.end > 1 ? ' ' : '') + fragment.text
        previous.end = Math.max(previous.end, fragment.end)
      } else {
        cells.push({ ...fragment })
      }
    }
    return cells
  })
}

function heading(cell: TextCell) {
  const text = normalize(cell.text).replace(/[^a-z0-9]+/g, ' ').trim()
  if (/^(?:ids?|num(?:ero)?|no|n|nro|codigo|clave)(?: (?:de )?(?:empleado|colaborador|cinepolito|personal))?$/.test(text) ||
      /^(?:matricula|numero economico|empleado id|colaborador id)$/.test(text)) return 'number'
  if (/^(?:nombre(?:s)?(?: completo| del empleado| del colaborador)?|cinepolito|colaborador|empleado)$/.test(text)) return 'name'
  if (/^(?:area|departamento|puesto)$/.test(text)) return 'area'
  return ''
}

function isEmployeeId(value: string, inTable: boolean) {
  return validEmployeeId(employeeKey(value)) &&
    !/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(value) &&
    (inTable || /\d/.test(value))
}

function cellValues(row: TextCell[], headers: TextCell[]) {
  return row.reduce<Record<string, string>>((values, cell) => {
    const header = headers.find((_, i) => {
      const next = headers[i + 1]
      return !next || cell.x < (headers[i].end + next.x) / 2
    })
    const key = header ? heading(header) : ''
    if (key) values[key] = [values[key], cell.text].filter(Boolean).join(' ')
    return values
  }, {})
}

export async function readEmployeePdf(file: File) {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = workerUrl
  const loading = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const records = new Map<string, EmployeeRow>()
  let duplicates = 0
  let containsText = false
  let headers: TextCell[] = []

  function add(row: EmployeeRow) {
    const key = employeeKey(row.number)
    if (records.has(key)) duplicates++
    else records.set(key, row)
  }

  try {
    const pdf = await loading.promise
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const fragments = content.items.flatMap(item => {
        if (!('str' in item) || !item.str.trim()) return []
        const x = item.transform[4]
        return [{
          x, y: item.transform[5], end: x + item.width, height: Math.max(1, item.height),
          text: item.str.trim(),
        }]
      })
      containsText ||= fragments.length > 0

      for (const row of rowsFromFragments(fragments)) {
        if (row.length > 1 && row.some(cell => heading(cell) === 'number')) {
          headers = row
          continue
        }

        if (headers.length && row.length > 1) {
          const { number, name = '', area = '' } = cellValues(row, headers)
          if (number && isEmployeeId(number, true)) {
            add({ number, name: name.slice(0, 100), area: area.slice(0, 60) })
          }
          continue
        }

        const text = row.map(cell => cell.text).join(' ').replace(/^(?:id(?: de empleado)?|n[uú]mero de empleado)\s*:\s*/i, '')
        const tokens = text.split(/[\s,;|]+/).filter(Boolean)
        if (tokens.length && tokens.every(token => isEmployeeId(token, false))) {
          for (const number of tokens) add({ number, name: '', area: '' })
        }
      }
      page.cleanup()
    }
  } finally {
    await loading.destroy()
  }

  if (!containsText) throw new Error('El PDF parece escaneado. Usa un PDF con texto seleccionable.')
  if (!records.size) throw new Error('No se encontraron IDs. Usa un ID por renglón o una columna llamada «ID de empleado».')
  return { rows: [...records.values()], duplicates }
}
