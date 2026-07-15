'use client'

import { useMemo } from 'react'
import { cn, formatDueDate } from '@/lib/utils'
import type { Deadline } from '@/lib/api-client'

interface DeadlineQueueProps {
  upcoming: Deadline[] | null
  overdue: Deadline[] | null
  isLoading?: boolean
  onDeadlineClick?: (deadline: Deadline) => void
}

/**
 * The daily-driver view: what's on your plate right now.
 * Overdue first (red), then due-this-week (amber), then upcoming (neutral).
 */
export function DeadlineQueue({
  upcoming,
  overdue,
  isLoading = false,
  onDeadlineClick,
}: DeadlineQueueProps) {
  const rows = useMemo(() => buildQueue(overdue, upcoming), [overdue, upcoming])
  const totalCount = (overdue?.length ?? 0) + (upcoming?.length ?? 0)

  return (
    <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
        <div>
          <div className="text-[13px] font-medium text-ink">What's on your plate</div>
          <div className="reg-code text-ink-muted text-[11px] mt-0.5">
            {isLoading
              ? 'Loading queue…'
              : totalCount === 0
                ? 'Nothing due — all clear'
                : `Sorted by due date · ${totalCount} tracked`}
          </div>
        </div>
        <button className="text-[12px] text-info hover:underline focus-ring rounded">
          View all
        </button>
      </div>

      <div className="divide-y divide-hairline">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <DeadlineRowSkeleton key={i} />)
          : rows.length === 0
            ? <EmptyState />
            : rows.map(({ deadline, flag, due, dueTone }) => (
                <DeadlineRow
                  key={deadline.id}
                  deadline={deadline}
                  flag={flag}
                  due={due}
                  dueTone={dueTone}
                  onClick={onDeadlineClick}
                />
              ))}
      </div>
    </div>
  )
}

type FlagColor = 'red' | 'amber' | 'blue' | 'gray'
type DueTone = 'overdue' | 'warn' | 'neutral' | 'muted'

interface QueueRow {
  deadline: Deadline
  flag: FlagColor
  due: string
  dueTone: DueTone
}

function buildQueue(
  overdue: Deadline[] | null,
  upcoming: Deadline[] | null,
): QueueRow[] {
  const rows: QueueRow[] = []
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const monthMs = 30 * 24 * 60 * 60 * 1000

  // Overdue first
  for (const d of overdue ?? []) {
    rows.push({
      deadline: d,
      flag: 'red',
      due: formatDueDate(d.dueDate),
      dueTone: 'overdue',
    })
  }

  // Then upcoming — but exclude items that appear in overdue (dedup by id)
  const overdueIds = new Set((overdue ?? []).map(d => d.id))
  for (const d of upcoming ?? []) {
    if (overdueIds.has(d.id)) continue
    const due = new Date(d.dueDate).getTime()
    const delta = due - now

    let flag: FlagColor = 'gray'
    let dueTone: DueTone = 'muted'
    if (delta < weekMs) {
      flag = 'amber'
      dueTone = 'warn'
    } else if (delta < monthMs) {
      flag = 'blue'
      dueTone = 'neutral'
    }

    rows.push({
      deadline: d,
      flag,
      due: formatDueDate(d.dueDate),
      dueTone,
    })
  }

  // Cap at 8 visible for now — full list lives at /deadlines (later session)
  return rows.slice(0, 8)
}

interface DeadlineRowProps {
  deadline: Deadline
  flag: FlagColor
  due: string
  dueTone: DueTone
  onClick?: (deadline: Deadline) => void
}

function DeadlineRow({ deadline, flag, due, dueTone, onClick }: DeadlineRowProps) {
  const flagClass = {
    red: 'bg-overdue',
    amber: 'bg-warn',
    blue: 'bg-info',
    gray: 'bg-ink-subtle',
  }[flag]

  const dueClass = {
    overdue: 'text-overdue font-medium',
    warn: 'text-warn',
    neutral: 'text-ink-soft',
    muted: 'text-ink-muted',
  }[dueTone]

  const facilityLabel = deadline.facility.name
  const assigneeLabel = deadline.assignedUser
    ? `${deadline.assignedUser.firstName} ${deadline.assignedUser.lastName[0]}.`
    : 'Unassigned'

  return (
    <button
      type="button"
      onClick={() => onClick?.(deadline)}
      className={cn(
        'w-full text-left grid grid-cols-[3px_1fr_auto] gap-3 items-center px-5 py-3',
        'hover:bg-canvas transition-colors focus-ring',
      )}
    >
      <div className={cn('w-[3px] h-8 rounded-full', flagClass)} aria-hidden />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink truncate">{deadline.title}</div>
        <div className="reg-code text-ink-muted text-[11px] mt-0.5 truncate">
          {deadline.ruleCode} · {facilityLabel} · {assigneeLabel}
        </div>
      </div>
      <div className={cn('text-[12px] whitespace-nowrap', dueClass)}>{due}</div>
    </button>
  )
}

function DeadlineRowSkeleton() {
  return (
    <div className="grid grid-cols-[3px_1fr_auto] gap-3 items-center px-5 py-3">
      <div className="w-[3px] h-8 rounded-full bg-hairline" />
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded bg-hairline animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-hairline animate-pulse" />
      </div>
      <div className="h-3 w-16 rounded bg-hairline animate-pulse" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-5 py-10 text-center">
      <div className="text-[13px] text-ink">Nothing due right now.</div>
      <div className="reg-code text-ink-muted text-[11px] mt-1">
        Deadlines are generated nightly from enrolled regulations.
      </div>
    </div>
  )
}
