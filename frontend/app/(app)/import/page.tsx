'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  uploadImportFile,
  downloadTemplate,
  type ImportKind,
  type ImportReport,
} from '@/lib/import-api'

export default function ImportPage() {
  const [kind, setKind] = useState<ImportKind>('facilities')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setReport(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const switchKind = (k: ImportKind) => {
    if (k !== kind) {
      setKind(k)
      reset()
    }
  }

  const validateFile = useCallback(
    async (f: File) => {
      setFile(f)
      setReport(null)
      setError(null)
      setIsBusy(true)
      try {
        const r = await uploadImportFile(kind, f, false)
        setReport(r)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed')
      } finally {
        setIsBusy(false)
      }
    },
    [kind],
  )

  const commit = useCallback(async () => {
    if (!file) return
    setError(null)
    setIsBusy(true)
    try {
      const r = await uploadImportFile(kind, file, true)
      setReport(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsBusy(false)
    }
  }, [file, kind])

  const canCommit = !!report && report.errors.length === 0 && !report.committed && !isBusy

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
          Bulk import
        </div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Import from file</h1>
        <p className="text-[13px] text-ink-muted mt-1">
          Upload a CSV or Excel file. Rows are validated first — nothing is written until every
          row passes and you confirm.
        </p>
      </div>

      {/* Type toggle + template download */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded border border-hairline overflow-hidden">
          {(['facilities', 'equipment'] as ImportKind[]).map(k => (
            <button
              key={k}
              onClick={() => switchKind(k)}
              className={
                k === kind
                  ? 'px-4 h-8 text-[13px] font-medium bg-canvas text-ink'
                  : 'px-4 h-8 text-[13px] text-ink-muted hover:text-ink bg-canvas-card transition-colors'
              }
            >
              {k === 'facilities' ? 'Facilities' : 'Equipment'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => downloadTemplate(kind)}>
          <Download size={14} strokeWidth={2} />
          Download {kind} template
        </Button>
      </div>

      {kind === 'equipment' && (
        <p className="text-[12px] text-ink-muted">
          Each row must reference an existing facility by <span className="font-mono">facilityName</span> or{' '}
          <span className="font-mono">apiWellNumber</span> — import facilities first.
        </p>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) validateFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={
          'rounded-card border border-dashed px-6 py-10 text-center cursor-pointer transition-colors ' +
          (isDragOver
            ? 'border-info bg-canvas'
            : 'border-divider bg-canvas-card hover:border-info/60')
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) validateFile(f)
          }}
        />
        <Upload size={20} strokeWidth={1.75} className="mx-auto text-ink-muted mb-2" />
        {file ? (
          <div className="inline-flex items-center gap-2 text-[13px] text-ink">
            <FileSpreadsheet size={14} strokeWidth={1.75} className="text-ink-muted" />
            {file.name}
          </div>
        ) : (
          <>
            <div className="text-[13px] font-medium text-ink">
              Drop a .csv or .xlsx file here
            </div>
            <div className="text-[12px] text-ink-muted mt-0.5">or click to browse</div>
          </>
        )}
        {isBusy && <div className="text-[12px] text-ink-muted mt-2">Checking rows…</div>}
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      {report && <ValidationReport report={report} />}

      {/* Actions */}
      {report && !report.committed && (
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={!canCommit} onClick={commit}>
            Import {report.validRows} {report.validRows === 1 ? 'row' : 'rows'}
          </Button>
          <Button variant="secondary" size="sm" onClick={reset}>
            Choose a different file
          </Button>
          {report.errors.length > 0 && (
            <span className="text-[12px] text-ink-muted">
              Fix the rows above and re-upload — nothing imports while errors remain.
            </span>
          )}
        </div>
      )}

      {report?.committed && (
        <div className="rounded-card border border-ok/30 bg-canvas-card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-[13px] text-ok">
            <CheckCircle2 size={15} strokeWidth={2} />
            Imported {report.createdCount} {report.createdCount === 1 ? 'row' : 'rows'}.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={reset}>
              Import another file
            </Button>
            <Button variant="link" size="sm" asChild>
              <Link href="/facilities">View facilities</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ValidationReport({ report }: { report: ImportReport }) {
  const hasErrors = report.errors.length > 0
  return (
    <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
      <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">Validation</span>
        <span className="text-[12px] font-mono text-ink-muted">
          {report.validRows} of {report.totalRows} rows valid
        </span>
      </div>

      {!hasErrors && report.warnings.length === 0 && (
        <div className="px-5 py-4 flex items-center gap-2 text-[13px] text-ok">
          <CheckCircle2 size={15} strokeWidth={2} />
          All rows passed — ready to import.
        </div>
      )}

      {report.errors.map((e, i) => (
        <div key={`e-${i}`} className="px-5 py-3 border-b border-hairline last:border-b-0">
          <div className="flex items-start gap-2">
            <XCircle size={14} strokeWidth={2} className="text-overdue mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-mono text-ink-muted">
                {e.row === 0 ? 'File' : `Row ${e.row}`}
              </span>
              {e.errors.map((msg, j) => (
                <div key={j} className="text-[13px] text-overdue">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {report.warnings.map((w, i) => (
        <div key={`w-${i}`} className="px-5 py-3 border-b border-hairline last:border-b-0">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} strokeWidth={2} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-mono text-ink-muted">Row {w.row}</span>
              {w.errors.map((msg, j) => (
                <div key={j} className="text-[13px] text-amber-700">
                  {msg}
                </div>
              ))}
              <div className="text-[11px] text-ink-muted mt-0.5">
                Warning only — will not block the import.
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
