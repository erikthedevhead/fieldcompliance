'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, MapPin, Wrench } from 'lucide-react'
import {
  facilitiesApi,
  equipmentApi,
  FACILITY_TYPES,
  EQUIPMENT_CATEGORIES,
  type Facility,
  type Equipment,
} from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { FacilityForm } from '@/components/facilities/facility-form'
import { EquipmentForm } from '@/components/facilities/equipment-form'

type FacilityWithEquipment = Facility & { equipment: Equipment[] }

interface PageProps {
  params: Promise<{ id: string }>
}

export default function FacilityDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const [facility, setFacility] = useState<FacilityWithEquipment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showFacilityForm, setShowFacilityForm] = useState(false)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await facilitiesApi.get(id)
      setFacility(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load facility')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const typeLabel =
    facility && FACILITY_TYPES.find(o => o.value === facility.type)?.label

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/facilities"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink focus-ring rounded"
      >
        <ArrowLeft size={13} strokeWidth={1.75} />
        All facilities
      </Link>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      {isLoading && <DetailSkeleton />}

      {facility && !isLoading && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
                {typeLabel} · {facility.county ? `${facility.county}, ${facility.state}` : facility.state}
              </div>
              <h1 className="text-[22px] font-medium tracking-tight text-ink">
                {facility.name}
              </h1>
              {facility.apiWellNumber && (
                <div className="reg-code text-ink-muted text-[11px] mt-1">
                  API {facility.apiWellNumber}
                </div>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowFacilityForm(true)}>
              <Pencil size={13} strokeWidth={1.75} />
              Edit facility
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatTile
              label="Status"
              value={facility.isActive ? 'Active' : 'Decommissioned'}
              tone={facility.isActive ? 'ok' : 'muted'}
            />
            <StatTile
              label="Equipment"
              value={String(facility.equipment.length)}
              hint="Tagged assets"
            />
            <StatTile
              label="Commissioned"
              value={
                facility.commissionedAt
                  ? new Date(facility.commissionedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
            <StatTile
              label="Coordinates"
              value={
                facility.latitude && facility.longitude
                  ? `${Number(facility.latitude).toFixed(3)}, ${Number(facility.longitude).toFixed(3)}`
                  : '—'
              }
              mono
            />
          </div>

          {facility.legalDescription && (
            <div className="rounded-card border border-hairline bg-canvas-card px-5 py-4">
              <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-1">
                Legal description
              </div>
              <p className="text-[13px] text-ink leading-relaxed">
                {facility.legalDescription}
              </p>
            </div>
          )}

          {/* Equipment section */}
          <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
              <div>
                <div className="text-[13px] font-medium text-ink">Equipment inventory</div>
                <div className="reg-code text-ink-muted text-[11px] mt-0.5">
                  {facility.equipment.length === 0
                    ? 'No equipment tagged yet'
                    : `${facility.equipment.length} active items`}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingEquipment(null)
                  setShowEquipmentForm(true)
                }}
              >
                <Plus size={13} strokeWidth={2} />
                Add equipment
              </Button>
            </div>

            {facility.equipment.length === 0 ? (
              <EquipmentEmptyState
                onAdd={() => {
                  setEditingEquipment(null)
                  setShowEquipmentForm(true)
                }}
              />
            ) : (
              <EquipmentTable
                equipment={facility.equipment}
                onEdit={eq => {
                  setEditingEquipment(eq)
                  setShowEquipmentForm(true)
                }}
              />
            )}
          </div>
        </>
      )}

      <FacilityForm
        open={showFacilityForm}
        facility={facility}
        onClose={() => setShowFacilityForm(false)}
        onSaved={() => {
          setShowFacilityForm(false)
          load()
        }}
      />

      <EquipmentForm
        open={showEquipmentForm}
        facilityId={id}
        equipment={editingEquipment}
        onClose={() => setShowEquipmentForm(false)}
        onSaved={() => {
          setShowEquipmentForm(false)
          load()
        }}
      />
    </div>
  )
}

// ============================================================

function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  mono,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'muted' | 'neutral'
  mono?: boolean
}) {
  const valueClass = {
    ok: 'text-ok',
    muted: 'text-ink-muted',
    neutral: 'text-ink',
  }[tone]

  return (
    <div className="rounded-card border border-hairline bg-canvas-card px-4 py-3">
      <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1.5">
        {label}
      </div>
      <div
        className={`text-[16px] font-medium leading-none ${valueClass} ${mono ? 'font-mono tracking-tight' : ''}`}
      >
        {value}
      </div>
      {hint && <div className="reg-code text-ink-muted text-[11px] mt-2">{hint}</div>}
    </div>
  )
}

function EquipmentTable({
  equipment,
  onEdit,
}: {
  equipment: Equipment[]
  onEdit: (e: Equipment) => void
}) {
  const catLabel = (c: string) =>
    EQUIPMENT_CATEGORIES.find(o => o.value === c)?.label ?? c

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-ink-muted border-b border-hairline">
          <th className="px-5 py-3 font-mono font-normal">Tag</th>
          <th className="px-4 py-3 font-mono font-normal">Category</th>
          <th className="px-4 py-3 font-mono font-normal">Description</th>
          <th className="px-4 py-3 font-mono font-normal">Installed</th>
          <th className="px-5 py-3 font-mono font-normal text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {equipment.map(eq => (
          <tr key={eq.id} className="hover:bg-canvas transition-colors">
            <td className="px-5 py-3">
              <div className="font-mono text-[13px] font-medium text-ink">{eq.tag}</div>
              {eq.serialNumber && (
                <div className="reg-code text-ink-muted text-[11px] mt-0.5">
                  SN {eq.serialNumber}
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft">{catLabel(eq.category)}</td>
            <td className="px-4 py-3 text-[13px] text-ink-soft max-w-xs truncate">
              {eq.description || (
                <span className="text-ink-muted italic">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-[13px] text-ink-soft">
              {eq.installDate
                ? new Date(eq.installDate).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </td>
            <td className="px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => onEdit(eq)}
                className="text-[12px] text-info hover:underline focus-ring rounded inline-flex items-center gap-1"
              >
                <Pencil size={11} strokeWidth={1.75} />
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EquipmentEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-10 text-center">
      <Wrench size={20} strokeWidth={1.5} className="mx-auto text-ink-muted mb-2" />
      <div className="text-[13px] text-ink mb-1">No equipment tagged yet</div>
      <p className="text-[12px] text-ink-muted mb-4 max-w-xs mx-auto">
        Tag pneumatic controllers, storage tanks, compressors, and other emissions-relevant
        assets. Deadlines and calculations key off equipment categories.
      </p>
      <Button size="sm" variant="secondary" onClick={onAdd}>
        <Plus size={13} strokeWidth={2} />
        Add first item
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 rounded bg-hairline animate-pulse" />
      <div className="h-8 w-64 rounded bg-hairline animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-card bg-hairline/40 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-card bg-hairline/40 animate-pulse" />
    </div>
  )
}
