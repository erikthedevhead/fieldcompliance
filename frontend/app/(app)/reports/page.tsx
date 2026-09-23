'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Download, Plus, Sheet as SheetIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { facilitiesApi, type Facility } from '@/lib/api-client'
import { reportsApi, basinsApi, type ComplianceReport, type Basin } from '@/lib/reports-api'

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [reports, setReports] = useState<ComplianceReport[] | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [basins, setBasins] = useState<Basin[]>([])
  const [year, setYear] = useState(currentYear - 1)
  const [scope, setScope] = useState('') // '' | 'basin:CODE' | 'facility:ID'
  const [busy, setBusy] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [r, f] = await Promise.all([reportsApi.list(), facilitiesApi.list()])
      setReports(r)
      setFacilities(f)
      try {
        setBasins(await basinsApi.list())
      } catch {
        setBasins([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const opts: { facilityId?: string; basinCode?: string } = {}
      if (scope.startsWith('basin:')) opts.basinCode = scope.slice(6)
      if (scope.startsWith('facility:')) opts.facilityId = scope.slice(9)
      await reportsApi.generate(year, opts)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  const download = async (r: ComplianceReport, kind: 'pdf' | 'xlsx') => {
    setDownloadingId(`${r.id}:${kind}`)
    setError(null)
    try {
      if (kind === 'pdf') await reportsApi.downloadPdf(r)
      else await reportsApi.downloadExcel(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const field =
    'h-8 rounded border border-hairline bg-canvas px-2 text-[13px] text-ink focus-ring'

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
          Compliance
        </div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Reports</h1>
        <p className="text-[13px] text-ink-muted mt-1">
          Draft Subpart W summaries for Designated Representative review. Aggregated by AAPG
          basin — the reporting facility boundary EPA actually uses for onshore production.
        </p>
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      <div className="rounded-card border border-hairline bg-canvas-card p-5 space-y-3">
        <div className="text-[13px] font-medium text-ink">Generate a draft</div>
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ink-muted">Year</span>
            <select className={field} value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 min-w-[280px]">
            <span className="text-[11px] uppercase tracking-wide text-ink-muted">Scope</span>
            <select className={field} value={scope} onChange={e => setScope(e.target.value)}>
              <option value="">All basins</option>
              {basins.length > 0 && (
                <optgroup label="Basin (EPA reporting facility)">
                  {basins.map(b => (
                    <option key={b.code} value={`basin:${b.code}`}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Single well pad">
                {facilities.map(f => (
                  <option key={f.id} value={`facility:${f.id}`}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <Button size="sm" onClick={generate} disabled={busy}>
            <Plus size={14} strokeWidth={2} />
            {busy ? 'Generating…' : 'Generate draft'}
          </Button>
        </div>
        <p className="text-[12px] text-ink-muted">
          Requires saved emission records for the year — run a calculation with &ldquo;Save
          these results&rdquo; first.
        </p>
      </div>

      <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
        {reports === null ? (
          <div className="px-5 py-8 text-[13px] text-ink-muted">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <FileText size={20} strokeWidth={1.5} className="mx-auto text-ink-muted mb-2" />
            <div className="text-[15px] font-medium text-ink mb-1">No reports yet</div>
            <p className="text-[13px] text-ink-muted max-w-sm mx-auto">
              Generate a draft to produce a PDF and an Excel workbook with the CFR citation
              behind every number.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-ink-muted border-b border-hairline">
                <th className="px-5 py-3 font-mono font-normal">Report</th>
                <th className="px-4 py-3 font-mono font-normal">Scope</th>
                <th className="px-4 py-3 font-mono font-normal">Status</th>
                <th className="px-4 py-3 font-mono font-normal">Generated</th>
                <th className="px-5 py-3 font-mono font-normal text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-canvas transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-[13px] font-medium text-ink">
                      Subpart W · {r.reportingYear}
                    </div>
                    <div className="reg-code text-[11px] text-ink-muted">{r.id}</div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft">
                    {r.basinCode
                      ? `Basin ${r.basinCode}`
                      : (r.facility?.name ?? 'All basins')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft font-mono">
                    {r.generatedAt ? new Date(r.generatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={downloadingId === `${r.id}:xlsx`}
                      onClick={() => download(r, 'xlsx')}
                    >
                      <SheetIcon size={14} strokeWidth={1.75} />
                      {downloadingId === `${r.id}:xlsx` ? '…' : 'Excel'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={downloadingId === `${r.id}:pdf`}
                      onClick={() => download(r, 'pdf')}
                    >
                      <Download size={14} strokeWidth={1.75} />
                      {downloadingId === `${r.id}:pdf` ? '…' : 'PDF'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[12px] text-ink-muted">
        Drafts and workbooks are supporting data for internal review. Official submission goes
        through EPA e-GGRT and must be certified by your Designated Representative.
      </p>
    </div>
  )
}
