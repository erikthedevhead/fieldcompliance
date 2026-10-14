import {
  computeFixedAnnual,
  computeRollingInterval,
  addDays,
} from './deadline-schedule'

const iso = (d: Date) => d.toISOString().slice(0, 10)

describe('computeFixedAnnual', () => {
  test('in Oct 2026, the next Mar 31 obligation is RY2026 due 2027-03-31', () => {
    const r = computeFixedAnnual(new Date('2026-10-14T00:00:00Z'), 3, 31)
    expect(r.reportingYear).toBe(2026)
    expect(iso(r.dueDate)).toBe('2027-03-31')
    expect(iso(r.periodStart)).toBe('2026-01-01')
    expect(iso(r.periodEnd)).toBe('2026-12-31')
  })

  test('reporting period is always a full calendar year, never a rolling 12 months', () => {
    const r = computeFixedAnnual(new Date('2026-10-14T00:00:00Z'), 3, 31)
    expect(iso(r.periodStart)).toBe('2026-01-01')
    expect(iso(r.periodEnd)).toBe('2026-12-31')
  })

  test('a later due month can still point at the prior reporting year', () => {
    // EPA moved RY2025 Subpart W reporting to October — the due date is
    // data, so this case must work without a code change.
    const r = computeFixedAnnual(new Date('2026-10-14T00:00:00Z'), 10, 30)
    expect(r.reportingYear).toBe(2025)
    expect(iso(r.dueDate)).toBe('2026-10-30')
    expect(iso(r.periodStart)).toBe('2025-01-01')
  })

  test('the day before a due date still targets that due date', () => {
    const r = computeFixedAnnual(new Date('2027-03-30T00:00:00Z'), 3, 31)
    expect(iso(r.dueDate)).toBe('2027-03-31')
    expect(r.reportingYear).toBe(2026)
  })

  test('the day after a due date rolls to the next reporting year', () => {
    const r = computeFixedAnnual(new Date('2027-04-01T00:00:00Z'), 3, 31)
    expect(iso(r.dueDate)).toBe('2028-03-31')
    expect(r.reportingYear).toBe(2027)
  })

  test('REGRESSION GUARD: never reproduces the rolling-anchor dates', () => {
    // The old generator produced due 2027-03-14 for period
    // 2025-12-14 -> 2026-12-14, anchored on facility commissioning.
    const r = computeFixedAnnual(new Date('2026-10-14T00:00:00Z'), 3, 31)
    expect(iso(r.dueDate)).not.toBe('2027-03-14')
    expect(iso(r.periodStart)).not.toBe('2025-12-14')
  })

  test('rejects invalid month or day', () => {
    const now = new Date('2026-10-14T00:00:00Z')
    expect(() => computeFixedAnnual(now, 13, 1)).toThrow(/dueMonth/)
    expect(() => computeFixedAnnual(now, 3, 0)).toThrow(/dueDay/)
  })
})

describe('computeRollingInterval', () => {
  test('quarterly survey rolls forward from the anchor past today', () => {
    const r = computeRollingInterval(
      new Date('2026-10-14T00:00:00Z'),
      new Date('2026-01-01T00:00:00Z'),
      90,
      30,
    )
    expect(r.dueDate.getTime()).toBeGreaterThan(
      new Date('2026-10-14T00:00:00Z').getTime(),
    )
    // period ends deadlineOffsetDays before the due date
    expect(iso(r.periodEnd)).toBe(iso(addDays(r.dueDate, -30)))
    expect(iso(r.periodStart)).toBe(iso(addDays(r.periodEnd, -90)))
  })

  test('an anchor already in the future is used as-is plus one interval', () => {
    const now = new Date('2026-10-14T00:00:00Z')
    const r = computeRollingInterval(now, new Date('2026-12-01T00:00:00Z'), 90, 0)
    expect(iso(r.dueDate)).toBe('2027-03-01')
  })

  test('rejects a non-positive frequency', () => {
    expect(() =>
      computeRollingInterval(new Date(), new Date(), 0, 0),
    ).toThrow(/frequencyDays/)
  })
})
