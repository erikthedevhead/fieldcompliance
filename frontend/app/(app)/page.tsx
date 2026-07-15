'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { orgsApi, healthApi, type Organization } from '@/lib/api-client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

/**
 * Session 1 placeholder dashboard.
 *
 * Proves three things end-to-end:
 *   1. The auth flow works (this page is guarded)
 *   2. The API client can hit protected endpoints with the JWT
 *   3. The design system renders as intended
 *
 * Session 2 will replace this with the real metrics strip + deadline queue.
 */
export default function DashboardHome() {
  const user = useAuthStore(s => s.user)
  const [org, setOrg] = useState<Organization | null>(null)
  const [health, setHealth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [orgData, healthData] = await Promise.all([orgsApi.me(), healthApi.check()])
        setOrg(orgData)
        setHealth(healthData.status)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="reg-code text-ink-muted mb-1">§01 · Signed in</div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-[14px] text-ink-muted mt-1">
          Session 1 shell is live. Real dashboard ships in Session 2.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Session</CardDescription>
            <CardTitle>Authenticated</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="reg-code-strong">{user?.role.replace('_', ' ')}</div>
            <div className="reg-code text-ink-muted mt-1">{user?.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organization</CardDescription>
            <CardTitle>{org?.name ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="reg-code-strong capitalize">{org?.planTier} plan</div>
            <div className="reg-code text-ink-muted mt-1">
              {org?._count?.facilities ?? 0} / {org?.maxFacilities ?? 0} facilities ·{' '}
              {org?._count?.users ?? 0} users
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API health</CardDescription>
            <CardTitle>
              {health === 'ok' ? (
                <span className="text-ok">Connected</span>
              ) : health ? (
                <span className="text-warn">{health}</span>
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="reg-code text-ink-muted">
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Roadmap</CardDescription>
          <CardTitle>Sessions ahead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px]">
          <div className="flex items-baseline gap-3">
            <span className="reg-code w-14 flex-shrink-0">Session 2</span>
            <span className="text-ink">Metrics strip, deadline queue, facility map</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="reg-code w-14 flex-shrink-0">Session 3</span>
            <span className="text-ink">Compliance provenance panel + calculator UI</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="reg-code w-14 flex-shrink-0">Later</span>
            <span className="text-ink-muted">
              Command palette, facility CRUD, equipment CRUD, deployment
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
