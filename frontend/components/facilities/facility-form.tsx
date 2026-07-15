'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, Textarea } from '@/components/ui/select'
import {
  facilitiesApi,
  FACILITY_TYPES,
  type Facility,
  type CreateFacilityInput,
} from '@/lib/api-client'

interface FacilityFormProps {
  open: boolean
  facility?: Facility | null
  onClose: () => void
  onSaved?: (facility: Facility) => void
}

/**
 * Facility create/edit sheet.
 * Detects mode by presence of `facility` prop — edit if provided, create if not.
 */
export function FacilityForm({ open, facility, onClose, onSaved }: FacilityFormProps) {
  const isEdit = !!facility
  const [name, setName] = useState('')
  const [type, setType] = useState<CreateFacilityInput['type']>('PRODUCTION_WELL')
  const [state, setState] = useState('')
  const [apiWellNumber, setApiWellNumber] = useState('')
  const [county, setCounty] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [legalDescription, setLegalDescription] = useState('')
  const [commissionedAt, setCommissionedAt] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isDecommissioning, setIsDecommissioning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prime form from facility prop (edit mode) or reset (create mode)
  useEffect(() => {
    if (!open) return
    if (facility) {
      setName(facility.name)
      setType(facility.type)
      setState(facility.state)
      setApiWellNumber(facility.apiWellNumber ?? '')
      setCounty(facility.county ?? '')
      setLatitude(facility.latitude != null ? String(facility.latitude) : '')
      setLongitude(facility.longitude != null ? String(facility.longitude) : '')
      setLegalDescription(facility.legalDescription ?? '')
      setCommissionedAt(facility.commissionedAt ? facility.commissionedAt.slice(0, 10) : '')
    } else {
      setName('')
      setType('PRODUCTION_WELL')
      setState('')
      setApiWellNumber('')
      setCounty('')
      setLatitude('')
      setLongitude('')
      setLegalDescription('')
      setCommissionedAt('')
    }
    setError(null)
  }, [open, facility])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const payload: CreateFacilityInput = {
        name: name.trim(),
        type,
        state: state.trim().toUpperCase(),
        apiWellNumber: apiWellNumber.trim() || undefined,
        county: county.trim() || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        legalDescription: legalDescription.trim() || undefined,
        commissionedAt: commissionedAt || undefined,
      }
      const saved = isEdit
        ? await facilitiesApi.update(facility!.id, payload)
        : await facilitiesApi.create(payload)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDecommission() {
    if (!facility) return
    if (
      !window.confirm(
        `Decommission "${facility.name}"? It will be hidden from active views but its history is preserved for audit.`,
      )
    ) {
      return
    }
    setIsDecommissioning(true)
    setError(null)
    try {
      const decommissioned = await facilitiesApi.decommission(facility.id)
      onSaved?.(decommissioned)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decommission failed')
    } finally {
      setIsDecommissioning(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit facility` : 'Add facility'}
      subtitle={isEdit ? facility?.name : 'New site under your portfolio'}
      footer={
        <div className="flex justify-between items-center">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDecommission}
              disabled={isDecommissioning || isSaving}
              className="text-[12px] text-overdue hover:underline disabled:opacity-50 focus-ring rounded"
            >
              {isDecommissioning ? 'Decommissioning…' : 'Decommission this facility'}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create facility'}
            </Button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="rounded border border-overdue/30 bg-overdue-bg px-3 py-2 text-[13px] text-overdue mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <FieldGroup label="Identity">
          <Field label="Name" required>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Midland Basin Pad A"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facility type" required>
              <Select
                value={type}
                onChange={e => setType(e.target.value as CreateFacilityInput['type'])}
                disabled={isEdit}
              >
                {FACILITY_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="API well number" hint="If applicable">
              <Input
                value={apiWellNumber}
                onChange={e => setApiWellNumber(e.target.value)}
                placeholder="42-329-12345-0000"
                className="font-mono text-[13px]"
              />
            </Field>
          </div>
        </FieldGroup>

        <FieldGroup label="Location">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="State" required>
              <Input
                value={state}
                onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                maxLength={2}
                required
                disabled={isEdit}
                className="uppercase"
              />
            </Field>
            <Field label="County">
              <Input
                value={county}
                onChange={e => setCounty(e.target.value)}
                placeholder="Midland"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input
                type="number"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder="31.9974"
                className="font-mono"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder="-102.0779"
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Legal description">
            <Textarea
              value={legalDescription}
              onChange={e => setLegalDescription(e.target.value)}
              placeholder="Section-Township-Range or metes and bounds"
              rows={2}
            />
          </Field>
        </FieldGroup>

        <FieldGroup label="Timeline">
          <Field label="Commissioned">
            <Input
              type="date"
              value={commissionedAt}
              onChange={e => setCommissionedAt(e.target.value)}
            />
          </Field>
        </FieldGroup>
      </form>
    </Sheet>
  )
}

// ============================================================
// SHARED FIELD PRIMITIVES — used by both facility and equipment forms
// ============================================================

export function FieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>
          {label}
          {required && <span className="text-overdue ml-0.5">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
