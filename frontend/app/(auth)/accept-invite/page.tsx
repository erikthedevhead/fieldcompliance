'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { inviteApi } from '@/lib/team-api'
import { Button } from '@/components/ui/button'

const FIELD =
  'h-9 w-full rounded border border-hairline bg-canvas px-3 text-[13px] text-ink focus-ring'

function AcceptInviteInner() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const setSession = useAuthStore(s => s.setSession)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (password !== confirm) return setError('Passwords do not match')
    setBusy(true)
    setError(null)
    try {
      const res = await inviteApi.accept(token, password)
      setSession(res.accessToken, res.user)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invitation')
    } finally {
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
          <h1 className="text-[17px] font-medium text-ink">Set your password</h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Finish setting up your FieldCompliance account.
          </p>
        </div>
        {!token ? (
          <p className="text-[13px] text-ink-muted">
            This page needs an invitation link from your email. Ask your administrator to resend
            the invitation if yours has expired.
          </p>
        ) : (
          <div className="space-y-3">
            <input
              className={FIELD}
              type="password"
              placeholder="New password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              className={FIELD}
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            {error && <div className="text-[13px] text-overdue">{error}</div>}
            <Button className="w-full" disabled={busy || password.length < 8} onClick={submit}>
              Activate account
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  )
}
