'use client'

import { cn, formatMetricTons } from '@/lib/utils'
import type { Deadline, EmissionSummary } from '@/lib/api-client'

const REPORTING_THRESHOLD_MT_CO2E = 25000
const WASTE_EMISSIONS_CHARGE_PER_MT = 1500 // $/mt CH4 for 2026+
const CIVIL_PENALTY_PER_DAY = 70117 // per 40 CFR Part 19 (rounded)

interface MetricsStripProps {
  overdue: Deadline[] | null
  upcoming: Deadline[] | null
  emissions: EmissionSummary[] | null
  currentUserId?: string
  isLoading?: boolean
}

export function MetricsStrip({
  overdue,
  upcoming,
  emissions,
  currentUserId,
  isLoading = false,
}: MetricsStripProps) {
  // Derived metrics
  const overdueCount = overdue?.length ?? 0
  const dailyExposure = overdueCount * CIVIL_PENALTY_PER_DAY

  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const dueThisWeek =
    upcoming?.filter(d => {
      const due = new Date(d.dueDate).getTime()
      return due >= now && due <= now + weekMs
    }) ?? []
  const dueThisWeekMine = dueThisWeek.filter(d => d.assignedUser?.id === currentUserId).length

  // YTD CO2e — sum across all pollutants. Backend returns strings (Prisma Decimals).
  const ytdCo2eMt =
    emissions?.reduce((sum, e) => sum + Number(e.co2Equivalent || 0), 0) ?? 0
  const headroomMt = REPORTING_THRESHOLD_MT_CO2E - ytdCo2eMt
  const headroomPct = Math.max(0, (headroomMt / REPORTING_THRESHOLD_MT_CO2E) * 100)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricTile
        label="Overdue"
        value={overdueCount}
        subtext={
          overdueCount === 0
            ? 'Nothing past due'
            : `~$${dailyExposure.toLocaleString()}/day exposure`
        }
        tone={overdueCount > 0 ? 'overdue' : 'neutral'}
        isLoading={isLoading}
      />
      <MetricTile
        label="Due this week"
        value={dueThisWeek.length}
        subtext={
          dueThisWeek.length === 0
            ? 'Clear week ahead'
            : `${dueThisWeekMine} assigned to you`
        }
        tone={dueThisWeek.length > 0 ? 'warn' : 'neutral'}
        isLoading={isLoading}
      />
      <MetricTile
        label="YTD CO₂e"
        value={ytdCo2eMt < 0.01 && ytdCo2eMt > 0 ? '<0.01' : formatMetricTons(ytdCo2eMt)}
        unit="mt"
        subtext={emissions === null ? 'Loading…' : 'Across enrolled facilities'}
        tone="neutral"
        isLoading={isLoading}
      />
      <MetricTile
        label="Threshold headroom"
        value={headroomPct >= 99.99 ? headroomPct.toFixed(2) : headroomPct.toFixed(1)}
        unit="%"
        subtext="Below 25,000 mt reporting trigger"
        tone={headroomPct > 50 ? 'ok' : headroomPct > 10 ? 'warn' : 'overdue'}
        isLoading={isLoading}
      />
    </div>
  )
}

interface MetricTileProps {
  label: string
  value: number | string
  unit?: string
  subtext: string
  tone: 'overdue' | 'warn' | 'ok' | 'neutral'
  isLoading?: boolean
}

function MetricTile({ label, value, unit, subtext, tone, isLoading }: MetricTileProps) {
  const toneClass = {
    overdue: 'text-overdue',
    warn: 'text-warn',
    ok: 'text-ok',
    neutral: 'text-ink',
  }[tone]

  return (
    <div className="rounded-card border border-hairline bg-canvas-card px-4 py-3">
      <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-2">
        {label}
      </div>
      {isLoading ? (
        <div className="h-7 w-16 rounded bg-hairline animate-pulse" />
      ) : (
        <div className={cn('text-[24px] font-medium leading-none tracking-tight', toneClass)}>
          {value}
          {unit && (
            <span className="text-[12px] font-normal text-ink-muted ml-1">{unit}</span>
          )}
        </div>
      )}
      <div className="reg-code text-ink-muted mt-2 text-[11px]">
        {isLoading ? '\u00A0' : subtext}
      </div>
    </div>
  )
}
