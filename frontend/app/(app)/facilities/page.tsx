'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, MapPin } from 'lucide-react'
import { facilitiesApi, FACILITY_TYPES, type Facility } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { FacilityForm } from '@/components/facilities/facility-form'

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await facilitiesApi.list()
      setFacilities(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load facilities')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const facilityLabel =
    facilities === null
      ? '…'
      : facilities.length === 1
        ? '1 facility'
        : `${facilities.length} facilities`

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
            Portfolio
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Facilities</h1>
          <p className="text-[13px] text-ink-muted mt-1">
            {isLoading ? 'Loading…' : `${facilityLabel} tracked for compliance.`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} strokeWidth={2} />
          Add facility
        </Button>
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : facilities && facilities.length > 0 ? (
          <FacilityTable facilities={facilities} />
        ) : (
          <EmptyState onAdd={() => setShowForm(true)} />
        )}
      </div>

      <FacilityForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false)
          load()
        }}
      />
    </div>
  )
}

function FacilityTable({ facilities }: { facilities: Facility[] }) {
  const typeLabel = (t: string) =>
    FACILITY_TYPES.find(o => o.value === t)?.label ?? t.replace(/_/g, ' ').toLowerCase()

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-ink-muted border-b border-hairline">
          <th className="px-5 py-3 font-mono font-normal">Facility</th>
          <th className="px-4 py-3 font-mono font-normal">Type</th>
          <th className="px-4 py-3 font-mono font-normal">Location</th>
          <th className="px-4 py-3 font-mono font-normal text-right">Equipment</th>
          <th className="px-4 py-3 font-mono font-normal text-right">Active deadlines</th>
          <th className="px-5 py-3 font-mono font-normal text-right">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {facilities.map(f => (
          <tr
            key={f.id}
            className="hover:bg-canvas transition-colors group"
          >
            <td className="px-5 py-3">
              <Link
                href={`/facilities/${f.id}`}
                className="text-[13px] font-medium text-ink hover:text-info focus-ring rounded"
              >
                {f.name}
              </Link>
              {f.apiWellNumber && (
                <div className="reg-code text-ink-muted text-[11px] mt-0.5">
                  {f.apiWellNumber}
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft capitalize">
              {typeLabel(f.type)}
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={1.75} className="text-ink-muted" />
                {f.county ? `${f.county}, ${f.state}` : f.state}
              </div>
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft text-right font-mono">
              {f._count?.equipment ?? 0}
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft text-right font-mono">
              {f._count?.deadlines ?? 0}
            </td>
            <td className="px-5 py-3 text-right">
              <span
                className={
                  f.isActive
                    ? 'inline-flex items-center gap-1.5 text-[11px] text-ok'
                    : 'inline-flex items-center gap-1.5 text-[11px] text-ink-muted'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    f.isActive ? 'bg-ok' : 'bg-ink-muted'
                  }`}
                />
                {f.isActive ? 'Active' : 'Decommissioned'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="text-[15px] font-medium text-ink mb-1">No facilities yet</div>
      <p className="text-[13px] text-ink-muted mb-5 max-w-sm mx-auto">
        Add your first well pad, tank battery, or compressor station to start tracking
        compliance obligations.
      </p>
      <Button size="sm" onClick={onAdd}>
        <Plus size={14} strokeWidth={2} />
        Add facility
      </Button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="h-3 w-40 rounded bg-hairline animate-pulse" />
          <div className="h-3 w-24 rounded bg-hairline animate-pulse" />
          <div className="h-3 w-20 rounded bg-hairline animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  )
}
