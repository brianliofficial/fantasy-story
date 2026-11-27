import * as XLSX from 'xlsx'
import { ledgerPools } from './pools'
import { optionsForSave, sanitizeEvent } from './sanitize'
import type { GameEventConfig } from './types'

const EVENT_HEADERS = ['id', 'pool', 'title', 'description', 'minAge', 'maxAge', 'showLimit', 'repeatAfter', 'mandatory', 'possible', 'if', 'ifOp', 'ifAmount', 'requiredRace', 'requiredClass', 'requiredGender', 'options'] as const

export function eventPoolWorkbook(events: GameEventConfig[], pools: string[]): Uint8Array {
  const book = XLSX.utils.book_new()
  const eventRows = events.map(eventToRow)
  const eventSheet = eventRows.length > 0
    ? XLSX.utils.json_to_sheet(eventRows, { header: [...EVENT_HEADERS] })
    : XLSX.utils.aoa_to_sheet([[...EVENT_HEADERS]])
  const poolRows = pools.map((name, index) => ({ position: index + 1, name }))
  const poolSheet = poolRows.length > 0
    ? XLSX.utils.json_to_sheet(poolRows, { header: ['position', 'name'] })
    : XLSX.utils.aoa_to_sheet([['position', 'name']])
  XLSX.utils.book_append_sheet(book, eventSheet, 'Events')
  XLSX.utils.book_append_sheet(book, poolSheet, 'Pools')
  const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer | number[]
  return bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : Uint8Array.from(bytes)
}

export function readEventPoolWorkbook(data: ArrayBuffer | Uint8Array): { events: GameEventConfig[]; pools: string[] } {
  const book = XLSX.read(data, { type: 'array' })
  const eventSheet = book.Sheets.Events ?? book.Sheets[book.SheetNames[0] ?? '']
  if (!eventSheet) throw new Error('The workbook needs an Events sheet.')
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(eventSheet, { defval: '' })
  if (rows.length > 0 && rows[0] && !('id' in rows[0] && 'pool' in rows[0] && 'options' in rows[0])) {
    throw new Error('The Events sheet needs id, pool, and options columns.')
  }
  const events: GameEventConfig[] = []
  const seen = new Set<string>()
  rows.forEach((row, index) => {
    if (blankRow(row)) return
    const event = rowToEvent(row, index + 2)
    if (seen.has(event.id)) throw new Error(`Row ${index + 2} repeats the id ${event.id}.`)
    seen.add(event.id)
    events.push(event)
  })
  const poolSheet = book.Sheets.Pools
  const poolNames = poolSheet ? poolNamesFrom(poolSheet) : events.map((event) => event.type)
  return { events, pools: ledgerPools(poolNames, events) }
}

function eventToRow(event: GameEventConfig): Record<string, string | number> {
  return {
    id: event.id,
    pool: event.type,
    title: event.title,
    description: event.description,
    minAge: event.minAge ?? '',
    maxAge: event.maxAge ?? '',
    showLimit: event.showLimit ?? '',
    repeatAfter: event.repeatAfter ?? '',
    mandatory: event.mandatory ? 'true' : '',
    possible: event.possible ?? '',
    if: event.gate?.stat ?? '',
    ifOp: event.gate?.op ?? '',
    ifAmount: event.gate?.amount ?? '',
    requiredRace: (event.requiredRace ?? []).join(', '),
    requiredClass: (event.requiredClass ?? []).join(', '),
    requiredGender: (event.requiredGender ?? []).join(', '),
    options: JSON.stringify(optionsForSave(event)),
  }
}

function rowToEvent(row: Record<string, unknown>, rowNumber: number): GameEventConfig {
  const id = cellText(row.id)
  if (!id) throw new Error(`Row ${rowNumber} needs an id.`)
  let options: unknown = []
  const rawOptions = cellText(row.options)
  if (rawOptions) {
    try {
      options = JSON.parse(rawOptions) as unknown
    } catch {
      throw new Error(`Row ${rowNumber} has options that could not be read.`)
    }
  }
  const event = sanitizeEvent({
    id,
    type: cellText(row.pool),
    title: cellText(row.title),
    description: cellText(row.description),
    minAge: optionalNumber(row.minAge),
    maxAge: optionalNumber(row.maxAge),
    showLimit: optionalNumber(row.showLimit),
    repeatAfter: optionalNumber(row.repeatAfter),
    requiredRace: splitList(row.requiredRace),
    mandatory: cellFlag(row.mandatory),
    possible: optionalNumber(row.possible),
    gate: gateFromCells(row),
    requiredClass: splitList(row.requiredClass),
    requiredGender: splitList(row.requiredGender),
    options,
  })
  if (!event) throw new Error(`Row ${rowNumber} could not be read.`)
  return event
}

function poolNamesFrom(sheet: XLSX.WorkSheet): string[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.map((row) => cellText(row.name)).filter((name) => name.length > 0)
}

function blankRow(row: Record<string, unknown>): boolean {
  return EVENT_HEADERS.every((key) => cellText(row[key]) === '')
}

function cellText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = cellText(value)
  if (!text) return undefined
  const number = Number(text)
  return Number.isFinite(number) ? number : undefined
}

function cellFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  const text = cellText(value).toLowerCase()
  return text === 'true' || text === 'yes' || text === '1'
}

function gateFromCells(row: Record<string, unknown>): { stat: string; op?: string; amount?: number } | undefined {
  const stat = cellText(row.if)
  if (stat !== 'gold' && stat !== 'father' && stat !== 'mother' && stat !== 'sibling' && stat !== 'brother' && stat !== 'sister') return undefined
  const op = cellText(row.ifOp)
  const amount = optionalNumber(row.ifAmount)
  if ((op !== '<' && op !== '>') || amount == null) return undefined
  return { stat, op, amount }
}

function splitList(value: unknown): string[] {
  return cellText(value).split(',').map((item) => item.trim()).filter((item) => item.length > 0)
}
