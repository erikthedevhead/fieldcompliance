import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind class merger — the shadcn/ui standard. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Compact date formatter for deadline lists. */
export function formatDueDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 14) return `Due in ${diffDays} days`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format metric tons with sensible precision. */
export function formatMetricTons(mt: number): string {
  if (mt >= 100) return mt.toFixed(0)
  if (mt >= 10) return mt.toFixed(1)
  if (mt >= 1) return mt.toFixed(2)
  return mt.toFixed(3)
}
