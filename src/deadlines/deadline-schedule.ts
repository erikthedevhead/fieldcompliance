/**
 * Pure due-date arithmetic for the deadline generator.
 *
 * Separated from the service so it can be unit tested without Prisma —
 * these are the calculations a missed compliance deadline depends on.
 *
 * Two schedule shapes, and conflating them was a real bug: every rule
 * was treated as ROLLING_INTERVAL, so the Subpart W annual report was
 * being scheduled 365 days after the facility's commissioning date
 * rather than on its statutory calendar date. That produced due dates
 * like 2027-03-14 covering 2025-12-14 to 2026-12-14 — a rolling twelve
 * months, not a reporting year.
 */

export interface ComputedSchedule {
  dueDate: Date
  periodStart: Date
  periodEnd: Date
  /** Calendar year being reported on. Only set for FIXED_ANNUAL. */
  reportingYear?: number
}

/**
 * Fixed calendar obligation for a completed reporting year.
 *
 * The reporting period is always a full calendar year; the due date is
 * month/day of the FOLLOWING year. Rolls forward until the due date is
 * in the future, so a generator run in October 2026 schedules RY2026
 * (due 2027-03-31), not RY2025 (whose deadline has passed).
 *
 * All arithmetic is UTC to avoid the local-timezone drift that put
 * previously seeded deadlines at 05:00:00.
 */
export function computeFixedAnnual(
  now: Date,
  dueMonth: number,
  dueDay: number,
): ComputedSchedule {
  if (dueMonth < 1 || dueMonth > 12) {
    throw new Error(`dueMonth must be 1-12, got: ${dueMonth}`)
  }
  if (dueDay < 1 || dueDay > 31) {
    throw new Error(`dueDay must be 1-31, got: ${dueDay}`)
  }

  let reportingYear = now.getUTCFullYear() - 1
  let dueDate = new Date(Date.UTC(reportingYear + 1, dueMonth - 1, dueDay))
  // Guard against an unbounded loop if the inputs are nonsense.
  let guard = 0
  while (dueDate < now && guard++ < 100) {
    reportingYear += 1
    dueDate = new Date(Date.UTC(reportingYear + 1, dueMonth - 1, dueDay))
  }

  return {
    dueDate,
    periodStart: new Date(Date.UTC(reportingYear, 0, 1)),
    periodEnd: new Date(Date.UTC(reportingYear, 11, 31)),
    reportingYear,
  }
}

/**
 * Recurring obligation measured from the last completion (or, failing
 * that, from facility commissioning, or from today).
 *
 * Correct for quarterly OGI surveys and repair windows, where the clock
 * genuinely starts at the last event.
 */
export function computeRollingInterval(
  now: Date,
  anchor: Date,
  frequencyDays: number,
  deadlineOffsetDays: number,
): ComputedSchedule {
  if (frequencyDays <= 0) {
    throw new Error(`frequencyDays must be positive, got: ${frequencyDays}`)
  }

  let dueDate = addDays(anchor, frequencyDays)
  let guard = 0
  while (dueDate < now && guard++ < 10000) {
    dueDate = addDays(dueDate, frequencyDays)
  }

  const periodEnd = addDays(dueDate, -deadlineOffsetDays)
  const periodStart = addDays(periodEnd, -frequencyDays)
  return { dueDate, periodStart, periodEnd }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
