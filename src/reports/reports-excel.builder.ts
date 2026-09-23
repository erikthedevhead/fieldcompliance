import * as ExcelJS from 'exceljs'
import { ReportData, SUBPART_W_THRESHOLD_MT_CO2E } from './reports.service'

/**
 * Basin-aggregated Subpart W supporting workbook.
 *
 * NOT the official EPA reporting form. EPA publishes its own Subpart W
 * reporting form, optional calculation workbook, and XML schema each
 * reporting year, and submission happens in e-GGRT with the Designated
 * Representative certifying personally. This workbook is the supporting
 * data behind those numbers: basin rollups, per-source detail, and the
 * CFR citation for every factor used.
 *
 * Aggregation is by AAPG basin because 40 CFR 98.238 defines the
 * onshore-production reporting facility as all equipment under common
 * ownership in a single basin — not per well pad.
 */
export async function buildReportWorkbook(data: ReportData): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'FieldCompliance'
  wb.created = data.report.generatedAt

  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1A1A' },
  }
  const headerRow = (ws: ExcelJS.Worksheet, row: number) => {
    const r = ws.getRow(row)
    r.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    r.fill = HEADER_FILL
    r.alignment = { vertical: 'middle' }
  }

  // ---------------------------------------------------------------
  // 1. Basin Summary — EPA's actual reporting-facility granularity
  // ---------------------------------------------------------------
  const summary = wb.addWorksheet('Basin Summary')
  summary.mergeCells('A1:G1')
  summary.getCell('A1').value =
    `Subpart W Supporting Data — ${data.org.name} — RY${data.report.reportingYear}`
  summary.getCell('A1').font = { bold: true, size: 13 }
  summary.mergeCells('A2:G2')
  summary.getCell('A2').value =
    'DRAFT — supporting data only. Official submission is via EPA e-GGRT and must be certified by the Designated Representative.'
  summary.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FFB91C1C' } }

  summary.getRow(4).values = [
    'Basin code',
    'Basin name',
    'Basin resolved by',
    'Well pads',
    'CH4 (mt)',
    'CO2e (mt)',
    `At or above ${SUBPART_W_THRESHOLD_MT_CO2E.toLocaleString()} mt CO2e`,
  ]
  headerRow(summary, 4)

  let row = 5
  for (const b of data.basins) {
    summary.getRow(row).values = [
      b.code,
      b.name,
      b.source.replace(/_/g, ' ').toLowerCase(),
      b.facilities.length,
      Number(b.totals.ch4Mt.toFixed(4)),
      Number(b.totals.co2eMt.toFixed(4)),
      b.aboveThreshold ? 'YES — reporting required' : 'No',
    ]
    if (b.source === 'UNRESOLVED') {
      summary.getRow(row).font = { color: { argb: 'FFB45309' } }
    }
    row++
  }
  summary.getRow(row + 1).values = [
    'TOTAL',
    '',
    '',
    data.facilities.length,
    Number(data.grandTotals.ch4Mt.toFixed(4)),
    Number(data.grandTotals.co2eMt.toFixed(4)),
    '',
  ]
  summary.getRow(row + 1).font = { bold: true }
  summary.columns = [
    { width: 12 },
    { width: 42 },
    { width: 22 },
    { width: 11 },
    { width: 14 },
    { width: 14 },
    { width: 32 },
  ]

  // ---------------------------------------------------------------
  // 2. Emissions by Source — basin x calculation method x pollutant
  // ---------------------------------------------------------------
  const bySource = wb.addWorksheet('Emissions by Source')
  bySource.getRow(1).values = [
    'Basin code',
    'Basin name',
    'Calculation method',
    'Pollutant',
    'Records',
    'Quantity (mt)',
    'CO2e (mt)',
  ]
  headerRow(bySource, 1)

  row = 2
  for (const b of data.basins) {
    const agg = new Map<string, { qty: number; co2e: number; n: number }>()
    for (const f of b.facilities) {
      for (const r of f.records) {
        const key = `${r.calculationMethod}|${r.pollutant}`
        const cur = agg.get(key) ?? { qty: 0, co2e: 0, n: 0 }
        cur.qty += r.quantityMt
        cur.co2e += r.co2eMt
        cur.n += 1
        agg.set(key, cur)
      }
    }
    for (const [key, v] of [...agg.entries()].sort()) {
      const [method, pollutant] = key.split('|')
      bySource.getRow(row).values = [
        b.code,
        b.name,
        method,
        pollutant,
        v.n,
        Number(v.qty.toFixed(6)),
        Number(v.co2e.toFixed(4)),
      ]
      row++
    }
  }
  bySource.columns = [
    { width: 12 },
    { width: 36 },
    { width: 44 },
    { width: 10 },
    { width: 9 },
    { width: 15 },
    { width: 14 },
  ]

  // ---------------------------------------------------------------
  // 3. Equipment Detail — every record with its CFR citation
  // ---------------------------------------------------------------
  const detail = wb.addWorksheet('Equipment Detail')
  detail.getRow(1).values = [
    'Basin code',
    'Well pad',
    'API well number',
    'State',
    'County',
    'Equipment tag',
    'Calculation method',
    'Pollutant',
    'Quantity (mt)',
    'CO2e (mt)',
    'CFR citation',
    'Factor source',
    'Assumptions',
    'Notes',
  ]
  headerRow(detail, 1)

  row = 2
  for (const b of data.basins) {
    for (const f of b.facilities) {
      for (const r of f.records) {
        detail.getRow(row).values = [
          b.code,
          f.name,
          f.apiWellNumber ?? '',
          f.state,
          f.county ?? '',
          r.equipmentTag ?? 'Facility-wide',
          r.calculationMethod,
          r.pollutant,
          Number(r.quantityMt.toFixed(6)),
          Number(r.co2eMt.toFixed(4)),
          r.citation ?? 'No citation on record',
          r.factorSource ?? '',
          r.assumptions.join(' | '),
          r.notes ?? '',
        ]
        row++
      }
    }
  }
  detail.columns = [
    { width: 12 },
    { width: 26 },
    { width: 22 },
    { width: 7 },
    { width: 16 },
    { width: 16 },
    { width: 42 },
    { width: 10 },
    { width: 15 },
    { width: 14 },
    { width: 46 },
    { width: 14 },
    { width: 60 },
    { width: 70 },
  ]

  // ---------------------------------------------------------------
  // 4. Assumptions & Limitations — what this workbook does NOT cover
  // ---------------------------------------------------------------
  const notes = wb.addWorksheet('Assumptions & Limitations')
  notes.getColumn(1).width = 120
  const lines: Array<[string, boolean]> = [
    ['Assumptions and Limitations', true],
    ['', false],
    ['This workbook is supporting data, not an EPA submission form.', false],
    [
      'EPA publishes a Subpart W reporting form, an optional calculation workbook, and an XML schema for each reporting year. Submission occurs in e-GGRT and must be certified by the Designated Representative. No software can perform that certification.',
      false,
    ],
    ['', false],
    ['Basin aggregation', true],
    [
      '40 CFR 98.238 defines the onshore production reporting facility as all equipment under common ownership within a single AAPG geologic province. Well pads roll up into a basin; the 25,000 mt CO2e applicability threshold applies at basin level, not per pad.',
      false,
    ],
    [
      'Basin is derived from each facility\u2019s state and county using EPA\u2019s published basin/county table, unless an explicit override is set. Facilities whose county maps to zero or multiple basins are grouped as UNRESOLVED rather than assigned by guess.',
      false,
    ],
    ['', false],
    ['Not included in these calculations', true],
    [
      'Storage tank streams at or above 10 bbl/day: require Calculation Method 1 (process simulation) or Method 2 (sampled liquid composition) per 98.233(j)(1)-(2). Not implemented.',
      false,
    ],
    [
      'Tanks routed to a vapor recovery system or flare: require the 98.233(j)(4) hours-based apportionment, including treating an open thief hatch as 0% capture. Not implemented.',
      false,
    ],
    [
      'Reciprocating compressors subject to 60.5385b: emissions must be measured on the 60.5385b(a) schedule. No emission factor substitute is permitted, so those units are excluded here.',
      false,
    ],
    [
      'Dehydrators, flares, well completions, workovers, liquids unloading, and blowdowns: not yet implemented.',
      false,
    ],
    [
      'Production quantities required by 98.236(aa) (gas produced, gas for sales, oil and condensate for sales) and the sub-basin characterization by county and formation are not collected by this system.',
      false,
    ],
    ['', false],
    ['Per-record assumption flags appear in the Equipment Detail sheet.', false],
    ['', false],
    [`Generated ${data.report.generatedAt.toISOString()} \u2014 report ${data.report.id}`, false],
  ]
  lines.forEach(([text, bold], i) => {
    const c = notes.getCell(i + 1, 1)
    c.value = text
    c.font = { bold, size: bold ? 11 : 10 }
    c.alignment = { wrapText: true, vertical: 'top' }
  })

  return wb
}
