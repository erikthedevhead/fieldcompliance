import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1fr_1.1fr]">
      {/*
        Left panel — the sign-in form.
        Kept quiet and disciplined so the right panel carries the identity.
      */}
      <div className="flex flex-col justify-between px-8 py-10 lg:px-14 lg:py-14">
        <div className="flex items-center gap-2 text-[15px] font-medium text-ink">
          <div
            aria-hidden
            className="h-6 w-6 rounded-[4px] bg-ink text-canvas grid place-items-center text-[11px] font-mono"
          >
            FC
          </div>
          FieldCompliance
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0 py-16">
          <h1 className="text-[26px] font-medium tracking-tight text-ink mb-2">Sign in</h1>
          <p className="text-[14px] text-ink-muted mb-8">
            Continue to your compliance workspace.
          </p>
          <LoginForm />
        </div>

        <div className="text-[12px] text-ink-subtle">
          Regulated data. Handled properly.
        </div>
      </div>

      {/*
        Right panel — the identity moment.
        Deliberately not a stock illustration. A stack of citation chips
        that says what the product does before the buyer has read a word.
      */}
      <div className="hidden lg:flex bg-ink text-canvas relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
               backgroundSize: '20px 20px',
             }}
             aria-hidden />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-canvas/60">
            §01 · Compliance provenance
          </div>

          <div className="max-w-lg space-y-8">
            <div className="space-y-3">
              <div className="font-mono text-[11px] text-canvas/50">Rule</div>
              <div className="font-mono text-[13px] text-canvas/90 border-l-2 border-canvas/20 pl-3">
                40 CFR Part 98 Subpart W § 98.233(a)
              </div>
            </div>
            <div className="space-y-3">
              <div className="font-mono text-[11px] text-canvas/50">Emission factor · AP-42</div>
              <div className="font-mono text-[13px] text-canvas/90 border-l-2 border-canvas/20 pl-3">
                0.174 scf CH₄ / hr · high-bleed pneumatic controller
              </div>
            </div>
            <div className="space-y-3">
              <div className="font-mono text-[11px] text-canvas/50">Activity data</div>
              <div className="font-mono text-[13px] text-canvas/90 border-l-2 border-canvas/20 pl-3">
                8,760 hours · PC-101 · Midland Basin Pad A
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <div className="font-mono text-[11px] text-canvas/50">Result</div>
              <div className="font-mono text-[28px] font-medium text-canvas tracking-tight">
                0.822 mt CO₂e
              </div>
              <div className="text-[13px] text-canvas/60 max-w-md leading-relaxed">
                Every number in FieldCompliance links back to the EPA citation
                that authorized it. That's what makes the audit go smoothly.
              </div>
            </div>
          </div>

          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-canvas/40">
            v0.1 · Session 3
          </div>
        </div>
      </div>
    </div>
  )
}
