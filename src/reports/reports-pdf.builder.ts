import PDFDocument from 'pdfkit'
import { ReportData } from './reports.service'

/**
 * Renders the "Subpart W Annual Emissions Summary — DRAFT" package.
 *
 * Deliberately a DRAFT/internal review document, not an official
 * submission artifact: e-GGRT accepts only its own web forms or XML
 * conforming to the e-GGRT XML schema, and the Designated Representative
 * must personally certify in e-GGRT. Every page is watermarked DRAFT and
 * the cover states the legal submission path.
 *
 * Pure function of ReportData → PDFKit document (caller pipes to the
 * HTTP response). No I/O here, so it is unit-testable in isolation.
 */
export function buildReportPdf(data: ReportData): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 54, bufferPages: true })

  const M = 54
  const W = doc.page.width - M * 2

  const fmt = (n: number, d = 4) =>
    n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })

  // ---------- Cover ----------
  doc.font('Helvetica-Bold').fontSize(20)
  doc.text('Subpart W Annual Emissions Summary', M, 140, { width: W, align: 'center' })
  doc.moveDown(0.3)
  doc.fontSize(14).fillColor('#b91c1c').text('DRAFT — FOR INTERNAL REVIEW', { width: W, align: 'center' })
  doc.fillColor('black')

  doc.moveDown(2)
  doc.font('Helvetica').fontSize(11)
  const cover = [
    ['Organization', data.org.name],
    ['EPA Reporter Code', data.org.epaReporterCode ?? 'Not on file'],
    ['Reporting Year', String(data.report.reportingYear)],
    [
      'Reporting Period',
      `${data.report.periodStart.toISOString().slice(0, 10)} to ${data.report.periodEnd.toISOString().slice(0, 10)}`,
    ],
    ['Generated', data.report.generatedAt.toISOString().slice(0, 19).replace('T', ' ') + ' UTC'],
    ['Report ID', data.report.id],
    ['Facilities Included', String(data.facilities.length)],
    ['Emission Records', String(data.grandTotals.recordCount)],
  ]
  for (const [k, v] of cover) {
    doc.font('Helvetica-Bold').text(`${k}: `, { continued: true })
    doc.font('Helvetica').text(v)
  }

  doc.moveDown(2)
  doc.font('Helvetica-Bold').fontSize(12).text('Totals (all facilities in report)')
  doc.font('Helvetica').fontSize(11)
  doc.text(`CH4: ${fmt(data.grandTotals.ch4Mt)} metric tons`)
  doc.text(`CO2e: ${fmt(data.grandTotals.co2eMt, 2)} metric tons (GWP per 40 CFR 98 Table A-1, as amended 2024)`)

  doc.moveDown(2)
  doc.font('Helvetica-Oblique').fontSize(9).fillColor('#444444')
  doc.text(
    'This document is a draft summary generated for internal review. It is not an official ' +
      'EPA submission. Annual GHG reports under 40 CFR Part 98 must be submitted through EPA ' +
      "e-GGRT (web forms or conformant XML) and certified by the facility's Designated " +
      'Representative. Calculations shown cover the source types currently verified in ' +
      'FieldCompliance; a complete Subpart W submission must include all applicable source types.',
    { width: W },
  )
  doc.fillColor('black')

  // ---------- Per-facility pages ----------
  for (const f of data.facilities) {
    doc.addPage()
    doc.font('Helvetica-Bold').fontSize(14).text(f.name)
    doc.font('Helvetica').fontSize(10).fillColor('#444444')
    doc.text(
      [
        f.apiWellNumber ? `API ${f.apiWellNumber}` : null,
        [f.county, f.state].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join('  ·  '),
    )
    doc.fillColor('black').moveDown(0.8)

    doc.font('Helvetica-Bold').fontSize(11)
    doc.text(
      `Facility totals — CH4: ${fmt(f.totals.ch4Mt)} mt   CO2e: ${fmt(f.totals.co2eMt, 2)} mt`,
    )
    doc.moveDown(0.6)

    for (const r of f.records) {
      if (doc.y > doc.page.height - 150) doc.addPage()
      doc.font('Helvetica-Bold').fontSize(10)
      doc.text(`${r.equipmentTag ?? 'Facility-wide'} — ${r.calculationMethod}`)
      doc.font('Helvetica').fontSize(9.5)
      doc.text(
        `${r.pollutant}: ${fmt(r.quantityMt)} mt   CO2e: ${fmt(r.co2eMt, 3)} mt`,
      )
      doc.fillColor('#444444')
      doc.text(
        `Basis: ${r.citation ?? 'No citation on record'}${r.factorSource ? ` (${r.factorSource})` : ''}`,
      )
      if (r.assumptions.length > 0) {
        doc.fillColor('#b45309')
        for (const a of r.assumptions) doc.text(`Assumption: ${a}`)
      }
      if (r.notes) {
        doc.fillColor('#666666')
        doc.text(r.notes, { width: W })
      }
      doc.fillColor('black').moveDown(0.6)
    }
  }

  // ---------- Certification page ----------
  doc.addPage()
  doc.font('Helvetica-Bold').fontSize(14).text('Designated Representative Review')
  doc.moveDown(1)
  doc.font('Helvetica').fontSize(10.5)
  doc.text(
    'Under 40 CFR Part 98, the annual GHG report must be certified and submitted in EPA ' +
      'e-GGRT by the Designated Representative (or Alternate). This draft is provided to ' +
      'support that review. Before submission, confirm that: all applicable source types are ' +
      'included; facility gas composition values reflect current gas analyses rather than ' +
      'platform defaults; and every flagged assumption above has been resolved or accepted.',
    { width: W },
  )
  doc.moveDown(3)
  doc.text('Reviewed by (Designated Representative): _________________________________')
  doc.moveDown(1.5)
  doc.text('Date: _____________________')

  // ---------- DRAFT watermark + footer on every page ----------
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.save()
    doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
    doc.font('Helvetica-Bold').fontSize(90).fillColor('#000000').opacity(0.06)
    doc.text('DRAFT', 0, doc.page.height / 2 - 45, { width: doc.page.width, align: 'center' })
    doc.restore()
    doc.opacity(1)
    doc.font('Helvetica').fontSize(8).fillColor('#888888')
    doc.text(
      `FieldCompliance draft report ${data.report.id} — page ${i + 1} of ${range.count} — not for EPA submission`,
      M,
      doc.page.height - 40,
      { width: W, align: 'center' },
    )
    doc.fillColor('black')
  }

  doc.end()
  return doc
}
