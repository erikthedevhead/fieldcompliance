import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// SELECT — native <select> styled to match Input
// ============================================================

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded border border-hairline bg-canvas-card px-3 pr-9 text-sm text-ink',
          'focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.75}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
      />
    </div>
  ),
)
Select.displayName = 'Select'

export { Select }

// ============================================================
// TEXTAREA
// ============================================================

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded border border-hairline bg-canvas-card px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-subtle',
        'focus-ring resize-y',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
