'use client'

import { useState } from 'react'
import Link from 'next/link'
import { passwordApi } from '@/lib/team-api'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await passwordApi.forgot(email)
    } finally {
      setSent(true)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-canvas-card p-6 space-y-4">
        <div>
          <div className="h-6 w-6 rounded-[4px] bg-ink text-canvas grid place-items-center text-[11px] font-mono mb-3">
            FC
          </div>
          <h1 className="text-[17px] font-medium text-ink">Reset your password</h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>
        {sent ? (
          <p className="text-[13px] text-ink">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <div className="space-y-3">
            <input
              className="h-9 w-full rounded border border-hairline bg-canvas px-3 text-[13px] text-ink focus-ring"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Button className="w-full" disabled={busy || !email} onClick={submit}>
              Send reset link
            </Button>
          </div>
        )}
        <Link href="/login" className="block text-[13px] text-info hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
