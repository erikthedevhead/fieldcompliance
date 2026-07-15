'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProvenanceChain, type ProvenanceStep } from './provenance-chain'
import { emissionsApi, type Facility, type CalculationResult, type CalculationRecord } from '@/lib/api-client'
import { formatMetricTons } from '@/lib/utils'

interface CalculatorPanelProps {
  open: boolean
  facilities: Facility[]
  onClose: () => void
  onPersisted?: () => void
}

/**
 * Calculator entry point.
 *
 * Runs `POST /emissions/calculate` and shows results with full compliance
 * provenance for each equipment item. The user can preview (no writes) or
 * persist as EmissionRecord rows.
 */
export function CalculatorPanel({
  open,
  facilities,
  onClose,
  onPersisted,
}: CalculatorPanelProps) {
  const currentYear = new Date().getFullYear()
  const [facilityId, setFacilityId] = useState('')
  const [periodStart, setPeriodStart] = useState(`${currentYear}-01-01`)
  const [periodEnd, setPeriodEnd] = useState(`${currentYear + 1}-01-01`)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isPersisting, setIsPersisting] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedFacility = facilities.find(f => f.id === facilityId)

  async function handlePreview() {
    if (!facilityId) {
      setError('Pick a facility first.')
      return
    }
    setIsCalculating(true)
    setError(null)
    try {
      const data = await emissionsApi.calculate({
        facilityId,
        periodStart,
        periodEnd,
        persist: false,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }

  async function handlePersist() {
    if (!facilityId) return
    setIsPersisting(true)
    setError(null)
    try {
      const data = await emissionsApi.calculate({
        facilityId,
        periodStart,
        periodEnd,
        persist: true,
      })
      setResult(data)
      onPersisted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsPersisting(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Calculate emissions"
      subtitle={selectedFacility ? `${selectedFacility.name} · ${selectedFacility.state}` : 'Preview or save'}
      width={640}
      footer={
        <div className="flex justify-between items-center">
          {result ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="text-[12px] text-info hover:underline focus-ring rounded"
              >
                ← Run another
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Done
                </Button>
                {result.persisted === 0 && (
                  <Button size="sm" onClick={handlePersist} disabled={isPersisting}>
                    {isPersisting ? 'Saving…' : 'Save these results'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="reg-code text-ink-muted text-[11px]">
                Preview never writes to your database.
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePreview} disabled={isCalculating}>
                  {isCalculating ? 'Calculating…' : 'Preview calculation'}
                </Button>
              </div>
            </>
          )}
        </div>
      }
    >
      {error && (
        <div className="rounded border border-overdue/30 bg-overdue-bg px-3 py-2 text-[13px] text-overdue mb-5">
          {error}
        </div>
      )}

      {!result && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="facility">Facility</Label>
            <select
              id="facility"
              value={facilityId}
              onChange={e => setFacilityId(e.target.value)}
              className="flex h-10 w-full rounded border border-hairline bg-canvas-card px-3 text-sm text-ink focus-ring"
            >
              <option value="">Select a facility…</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.state}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="period-start">Period start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Period end</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded border border-hairline bg-canvas p-4">
            <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-1">
              What runs
            </div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              The calculator walks the facility's active equipment and applies the EPA-approved
              methodology for each type: AP-42 factor calc for pneumatic controllers and tanks,
              Subpart W rod-packing calc for reciprocating compressors, average-factor calc for
              fugitives. Every result is fully traceable back to its CFR citation.
            </p>
          </div>
        </div>
      )}

      {result && <CalculationResults result={result} />}
    </Sheet>
  )
}

function CalculationResults({ result }: { result: CalculationResult }) {
  return (
    <div className="space-y-5">
      {/* Headline number */}
      <div className="rounded-card border border-hairline bg-canvas p-5">
        <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-1.5">
          Facility total · CO₂e
        </div>
        <div className="text-[32px] font-medium tracking-tight text-ink leading-none">
          {formatMetricTons(result.totals.co2eMetricTons)}
          <span className="text-[14px] font-normal text-ink-muted ml-2">mt CO₂e</span>
        </div>
        <div className="reg-code text-ink-muted text-[11px] mt-2">
          {new Date(result.periodStart).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          →{' '}
          {new Date(result.periodEnd).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {result.persisted > 0 && (
            <span className="text-ok"> · {result.persisted} records saved</span>
          )}
        </div>
      </div>

      {/* Per-pollutant breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(result.totals.byPollutant).map(([pollutant, mass]) => (
          <div key={pollutant} className="rounded border border-hairline bg-canvas-card px-4 py-3">
            <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-1">
              {pollutant}
            </div>
            <div className="text-[18px] font-medium text-ink leading-tight">
              {formatMetricTons(Number(mass))}
              <span className="text-[11px] font-normal text-ink-muted ml-1">mt</span>
            </div>
          </div>
        ))}
      </div>

      {/* Per-equipment provenance */}
      <div>
        <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-3">
          Per-equipment provenance · {result.records.length} record(s)
        </div>
        <div className="space-y-4">
          {result.records.map((rec, i) => (
            <ProvenanceChain
              key={i}
              heading={rec.equipmentTag ?? rec.equipmentCategory}
              steps={buildRecordProvenance(rec)}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function buildRecordProvenance(rec: CalculationRecord): ProvenanceStep[] {
  const activity = Object.entries(rec.activityData || {})
    .filter(([k]) => !['factorUnit', 'factorValue'].includes(k))
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? formatNumber(v) : v}`)
    .join(' · ')

  const co2eStr = formatMetricTons(rec.co2Equivalent)
  const isGhg = rec.pollutant !== 'VOC'

  return [
    {
      label: 'Methodology',
      value: rec.calculationMethod,
      note: rec.equipmentCategory.replace(/_/g, ' ').toLowerCase(),
    },
    {
      label: 'Emission factor',
      value: `${rec.activityData?.factorValue ?? '—'} ${rec.activityData?.factorUnit ?? ''}`,
      note: rec.emissionFactorId ? `Factor row ${rec.emissionFactorId}` : undefined,
    },
    {
      label: 'Activity data',
      value: activity || '—',
    },
    {
      label: 'Result',
      value: isGhg ? `${co2eStr} mt CO₂e` : `${formatMetricTons(rec.quantityMetricTons)} mt ${rec.pollutant}`,
      note: rec.notes,
      emphasis: true,
    },
  ]
}

function formatNumber(n: number): string {
  if (Math.abs(n) < 0.01) return n.toExponential(2)
  if (Math.abs(n) < 1) return n.toFixed(3)
  if (Math.abs(n) < 100) return n.toFixed(2)
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
