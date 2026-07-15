'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  /** Optional footer content — pinned to bottom, above the fold. */
  footer?: React.ReactNode
  /** Sheet width — defaults to 560px */
  width?: number
}

/**
 * Side sheet — slides in from the right.
 * Backdrop click and Esc close it. No radix dep — keeps bundle lean.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Portal to body so the sheet escapes any parent stacking context.
  // Guard for SSR — `document` is undefined on the server.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(
          'absolute right-0 top-0 h-full bg-canvas-card shadow-2xl',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ width: `min(${width}px, 92vw)` }}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-6 py-4 border-b border-hairline flex-shrink-0">
          <div className="min-w-0">
            <h2 id="sheet-title" className="text-[15px] font-medium text-ink truncate">
              {title}
            </h2>
            {subtitle && (
              <div className="reg-code text-ink-muted text-[11px] mt-0.5 truncate">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors p-1 -mr-1 -mt-1 rounded focus-ring"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="px-6 py-3 border-t border-hairline flex-shrink-0 bg-canvas-raised">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
