'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calculator } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import {
  deadlinesApi,
  emissionsApi,
  facilitiesApi,
  type Deadline,
  type EmissionSummary,
  type Facility,
} from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { MetricsStrip } from '@/components/dashboard/metrics-strip'
import { DeadlineQueue } from '@/components/dashboard/deadline-queue'
import { FacilityMap } from '@/components/dashboard/facility-map'
import { DeadlineDetailPanel } from '@/components/dashboard/deadline-detail'
import { CalculatorPanel } from '@/components/dashboard/calculator-panel'

export default function DashboardHome() {
  const user = useAuthStore(s => s.user)
  const currentYear = new Date().getFullYear()

  const [overdue, setOverdue] = useState<Deadline[] | null>(null)
  const [upcoming, setUpcoming] = useState<Deadline[] | null>(null)
  const [emissions, setEmissions] = useState<EmissionSummary[] | null>(null)
  const [facilities, setFacilities] = useState<Facility[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sheet state
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null)
  const [calculatorOpen, setCalculatorOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [overdueData, upcomingData, emissionsData, facilitiesData] = await Promise.all([
        deadlinesApi.overdue(),
        deadlinesApi.upcoming(400),
        emissionsApi.summary(currentYear),
        facilitiesApi.list(),
      ])
      setOverdue(overdueData)
      setUpcoming(upcomingData)
      setEmissions(emissionsData)
      setFacilities(facilitiesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [currentYear])

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
      {/* Header — greeting + snapshot + calculator entry */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
            {getTimeGreeting()} · {formatToday()}
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">
            Welcome, {user?.firstName}
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Snapshot across {facilityLabel} for {currentYear}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCalculatorOpen(true)}
            disabled={!facilities || facilities.length === 0}
          >
            <Calculator size={14} strokeWidth={1.75} />
            Calculate emissions
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      <MetricsStrip
        overdue={overdue}
        upcoming={upcoming}
        emissions={emissions}
        currentUserId={user?.id}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <DeadlineQueue
          overdue={overdue}
          upcoming={upcoming}
          isLoading={isLoading}
          onDeadlineClick={deadline => setSelectedDeadlineId(deadline.id)}
        />
        <FacilityMap
          facilities={facilities}
          overdue={overdue}
          upcoming={upcoming}
          isLoading={isLoading}
        />
      </div>

      {/* Sheets */}
      <DeadlineDetailPanel
        deadlineId={selectedDeadlineId}
        onClose={() => setSelectedDeadlineId(null)}
        onCompleted={load}
      />
      <CalculatorPanel
        open={calculatorOpen}
        facilities={facilities ?? []}
        onClose={() => setCalculatorOpen(false)}
        onPersisted={load}
      />
    </div>
  )
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late tonight'
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}
