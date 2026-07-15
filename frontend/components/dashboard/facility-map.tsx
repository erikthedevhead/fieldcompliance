'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Facility, Deadline } from '@/lib/api-client'

interface FacilityMapProps {
  facilities: Facility[] | null
  overdue: Deadline[] | null
  upcoming: Deadline[] | null
  isLoading?: boolean
}

type FacilityStatus = 'overdue' | 'due-soon' | 'on-track'

interface FacilityPin {
  facility: Facility
  x: number
  y: number
  status: FacilityStatus
}

const VIEW_W = 400
const VIEW_H = 220
const PAD = 24

/**
 * Simple SVG map. Not Mapbox — we don't need tiles for a
 * regional operator portfolio. Facilities are plotted by lat/lng
 * normalized to the bounding box of the portfolio.
 *
 * Handles 1 facility (single centered pin) up through a large portfolio.
 * When we grow to national multi-basin operators, this swaps for MapLibre.
 */
export function FacilityMap({ facilities, overdue, upcoming, isLoading }: FacilityMapProps) {
  const facilityCount = facilities?.length ?? 0
  const region = summarizeRegion(facilities)

  const pins = useMemo(() => buildPins(facilities, overdue, upcoming), [
    facilities,
    overdue,
    upcoming,
  ])

  const overdueFacilities = pins.filter(p => p.status === 'overdue').length
  const dueSoonFacilities = pins.filter(p => p.status === 'due-soon').length

  return (
    <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
        <div>
          <div className="text-[13px] font-medium text-ink">Facilities</div>
          <div className="reg-code text-ink-muted text-[11px] mt-0.5">
            {isLoading
              ? 'Loading portfolio…'
              : facilityCount === 0
                ? 'No facilities yet'
                : `${facilityCount} active · ${region}`}
          </div>
        </div>
        <button className="text-[12px] text-info hover:underline focus-ring rounded">
          Add facility
        </button>
      </div>

      <div className="p-4">
        <div className="relative rounded bg-canvas border border-hairline overflow-hidden">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full h-[220px]"
            preserveAspectRatio="none"
            aria-hidden
          >
            {/* Faint grid lines suggest geography without pretending to be a map */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#grid)" />

            {/* Region label — sits behind pins */}
            <text
              x={VIEW_W / 2}
              y={18}
              textAnchor="middle"
              fontSize="10"
              fill="#9CA3AF"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {region.toUpperCase()}
            </text>

            {/* Pins */}
            {isLoading ? (
              <SkeletonPin />
            ) : (
              pins.map(pin => <Pin key={pin.facility.id} pin={pin} />)
            )}

            {/* Empty state */}
            {!isLoading && pins.length === 0 && (
              <text
                x={VIEW_W / 2}
                y={VIEW_H / 2 + 5}
                textAnchor="middle"
                fontSize="12"
                fill="#9CA3AF"
              >
                No facilities to plot yet
              </text>
            )}
          </svg>
        </div>

        <div className="flex items-center gap-4 mt-3 text-[11px]">
          <LegendDot color="ok" label={`On track (${pins.length - overdueFacilities - dueSoonFacilities})`} />
          <LegendDot color="warn" label={`Due soon (${dueSoonFacilities})`} />
          <LegendDot color="overdue" label={`Overdue (${overdueFacilities})`} />
        </div>
      </div>
    </div>
  )
}

function Pin({ pin }: { pin: FacilityPin }) {
  const color = {
    overdue: '#B91C1C',
    'due-soon': '#B45309',
    'on-track': '#047857',
  }[pin.status]

  return (
    <g>
      {/* Outer ring — subtle halo for visibility on faint grid */}
      <circle cx={pin.x} cy={pin.y} r="10" fill={color} fillOpacity="0.14" />
      {/* Inner pin */}
      <circle
        cx={pin.x}
        cy={pin.y}
        r="5"
        fill={color}
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <title>
        {pin.facility.name} — {pin.status}
      </title>
    </g>
  )
}

function SkeletonPin() {
  return (
    <g>
      <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r="10" fill="#E5E7EB" fillOpacity="0.5">
        <animate
          attributeName="opacity"
          values="0.5;1;0.5"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  )
}

function LegendDot({ color, label }: { color: 'ok' | 'warn' | 'overdue'; label: string }) {
  const cls = { ok: 'bg-ok', warn: 'bg-warn', overdue: 'bg-overdue' }[color]
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', cls)} aria-hidden />
      <span className="text-ink-muted">{label}</span>
    </div>
  )
}

// ============================================================
// PIN + REGION MATH
// ============================================================

/**
 * Convert facility lat/lng into normalized SVG coordinates.
 * If there's only one facility, we center it. If multiple, we compute
 * the bounding box and normalize to the viewport with padding.
 */
function buildPins(
  facilities: Facility[] | null,
  overdue: Deadline[] | null,
  upcoming: Deadline[] | null,
): FacilityPin[] {
  if (!facilities || facilities.length === 0) return []

  const withCoords = facilities.filter(f => f.latitude && f.longitude)
  if (withCoords.length === 0) return []

  const facilityStatus = new Map<string, FacilityStatus>()
  for (const f of facilities) facilityStatus.set(f.id, 'on-track')

  const weekMs = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  for (const d of upcoming ?? []) {
    if (new Date(d.dueDate).getTime() - now < weekMs) {
      facilityStatus.set(d.facility.id, 'due-soon')
    }
  }
  for (const d of overdue ?? []) {
    facilityStatus.set(d.facility.id, 'overdue')
  }

  // Single facility: center it
  if (withCoords.length === 1) {
    const f = withCoords[0]
    return [
      {
        facility: f,
        x: VIEW_W / 2,
        y: VIEW_H / 2,
        status: facilityStatus.get(f.id) ?? 'on-track',
      },
    ]
  }

  // Multiple: bounding-box normalize
  const lats = withCoords.map(f => Number(f.latitude))
  const lngs = withCoords.map(f => Number(f.longitude))
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat || 0.1
  const lngRange = maxLng - minLng || 0.1

  return withCoords.map(f => {
    const lat = Number(f.latitude)
    const lng = Number(f.longitude)
    // x: longitude increases east → right; normalize to [PAD, VIEW_W - PAD]
    const x = PAD + ((lng - minLng) / lngRange) * (VIEW_W - 2 * PAD)
    // y: latitude increases north → up (inverted for SVG y-down)
    const y = PAD + (1 - (lat - minLat) / latRange) * (VIEW_H - 2 * PAD)
    return {
      facility: f,
      x,
      y,
      status: facilityStatus.get(f.id) ?? 'on-track',
    }
  })
}

/** Best-effort region label — state or "multi-state" or single facility county. */
function summarizeRegion(facilities: Facility[] | null): string {
  if (!facilities || facilities.length === 0) return '—'
  const states = new Set(facilities.map(f => f.state))
  if (states.size === 1) {
    const state = [...states][0]
    const counties = new Set(facilities.map(f => f.county).filter(Boolean))
    if (counties.size === 1 && facilities.length === 1) {
      return `${[...counties][0]} County, ${state}`
    }
    return state
  }
  return `${states.size} states`
}
