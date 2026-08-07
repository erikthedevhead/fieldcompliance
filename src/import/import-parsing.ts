/**
 * Bulk import — pure parsing layer. No Prisma, no HTTP; fully unit-testable.
 *
 * Accepts .xlsx (first worksheet, header row) or .csv and normalizes both
 * into the same Array<Record<string, string>> shape. Downstream validation
 * is identical regardless of source format.
 */
import * as ExcelJS from 'exceljs'
import { parse as parseCsv } from 'csv-parse/sync'

export type RawRow = Record<string, string>

/** xlsx files are zip archives — magic bytes PK\x03\x04. */
export function isXlsx(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b
}

/** lowercase, strip spaces/underscores: "API Well Number" → "apiwellnumber" */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, '')
}

function cellToString(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    // exceljs rich text / formula results / hyperlinks
    const anyV = v as any
    if (anyV.richText) return anyV.richText.map((r: any) => r.text).join('')
    if (anyV.result !== undefined) return cellToString(anyV.result)
    if (anyV.text !== undefined) return String(anyV.text)
    return String(anyV)
  }
  return String(v)
}

export async function parseBuffer(buffer: Buffer): Promise<RawRow[]> {
  if (isXlsx(buffer)) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as any)
    const ws = wb.worksheets[0]
    if (!ws) return []
    const rows: RawRow[] = []
    let headers: string[] = []
    ws.eachRow((row, rowNumber) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1) // 1-indexed
      if (rowNumber === 1) {
        headers = values.map(v => normalizeHeader(cellToString(v)))
        return
      }
      const obj: RawRow = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = cellToString(values[i]).trim()
      })
      if (Object.values(obj).some(v => v !== '')) rows.push(obj)
    })
    return rows
  }

  // CSV path
  const records: Record<string, string>[] = parseCsv(buffer.toString('utf-8'), {
    columns: (header: string[]) => header.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })
  return records.filter(r => Object.values(r).some(v => v !== ''))
}

/** Empty string → undefined; otherwise trimmed string. */
export function str(row: RawRow, key: string): string | undefined {
  const v = row[key]
  return v === undefined || v === '' ? undefined : v
}

/** Numeric coercion with row-level error signaling via NaN. */
export function num(row: RawRow, key: string): number | undefined {
  const v = str(row, key)
  if (v === undefined) return undefined
  const n = Number(v.replace(/,/g, ''))
  return n // NaN surfaces as a validation error downstream
}

export function int(row: RawRow, key: string): number | undefined {
  const n = num(row, key)
  return n === undefined ? undefined : Math.trunc(n)
}
