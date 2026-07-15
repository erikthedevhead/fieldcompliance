'use client'

import { cn } from '@/lib/utils'

export interface ProvenanceStep {
  /** Small uppercase label above the value */
  label: string
  /** The value itself — usually rendered in mono */
  value: string
  /** Optional supporting text below the value */
  note?: string
  /** If true, this step is highlighted as the final result */
  emphasis?: boolean
}

interface ProvenanceChainProps {
  steps: ProvenanceStep[]
  /** Optional heading above the chain */
  heading?: string
  /** Compact mode reduces vertical spacing — useful in tight panels */
  compact?: boolean
}

/**
 * The signature identity moment of the product.
 *
 * Renders a top-to-bottom chain of citations: CFR → regulation version →
 * rule → factor → activity data → result. Every entry links a value to its
 * regulatory authority. This is what makes the audit trail visible.
 */
export function ProvenanceChain({
  steps,
  heading = 'Compliance provenance',
  compact = false,
}: ProvenanceChainProps) {
  return (
    <div className="rounded-card bg-ink text-canvas overflow-hidden">
      <div className="px-5 py-3 border-b border-canvas/10">
        <div className="reg-code uppercase tracking-[0.14em] text-[10px] text-canvas/60">
          § {heading}
        </div>
      </div>
      <div className={cn('px-5', compact ? 'py-4 space-y-4' : 'py-5 space-y-5')}>
        {steps.map((step, i) => (
          <div key={i} className="space-y-1.5">
            <div className="reg-code text-canvas/50 text-[10px] uppercase tracking-wide">
              {step.label}
            </div>
            <div
              className={cn(
                'border-l-2 pl-3',
                step.emphasis ? 'border-canvas/60' : 'border-canvas/15',
              )}
            >
              <div
                className={cn(
                  'font-mono tracking-tight break-words',
                  step.emphasis
                    ? 'text-canvas text-[22px] font-medium leading-tight'
                    : 'text-canvas/90 text-[13px]',
                )}
              >
                {step.value}
              </div>
              {step.note && (
                <div
                  className={cn(
                    'text-canvas/60 mt-1.5',
                    step.emphasis ? 'text-[12px] leading-relaxed' : 'text-[11px]',
                  )}
                >
                  {step.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
