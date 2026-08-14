'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, MailPlus, UserX } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { teamApi, type TeamMember, type InviteUserInput } from '@/lib/team-api'
import { Button } from '@/components/ui/button'

const ROLE_OPTIONS: { value: InviteUserInput['role']; label: string }[] = [
  { value: 'EHS_COORDINATOR', label: 'EHS Coordinator' },
  { value: 'SITE_MANAGER', label: 'Site Manager' },
  { value: 'FIELD_TECH', label: 'Field Tech' },
  { value: 'AUDITOR', label: 'Auditor (read-only)' },
  { value: 'ORG_ADMIN', label: 'Org Admin' },
]

export default function TeamPage() {
  const me = useAuthStore(s => s.user)
  const isAdmin = me?.role === 'ORG_ADMIN'
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMembers(await teamApi.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resend = async (id: string) => {
    setBusyId(id)
    try {
      await teamApi.resendInvite(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed')
    } finally {
      setBusyId(null)
    }
  }

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this user? They will no longer be able to sign in.')) return
    setBusyId(id)
    try {
      await teamApi.deactivate(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivate failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="reg-code text-ink-muted uppercase tracking-wide text-[10px] mb-1">
            Organization
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Team</h1>
          <p className="text-[13px] text-ink-muted mt-1">
            {members === null ? 'Loading…' : `${members.length} member${members.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowInvite(v => !v)}>
            <UserPlus size={14} strokeWidth={2} />
            Invite user
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-card border border-overdue/30 bg-overdue-bg px-4 py-3 text-[13px] text-overdue">
          {error}
        </div>
      )}

      {showInvite && isAdmin && (
        <InviteForm
          onDone={() => {
            setShowInvite(false)
            load()
          }}
          onCancel={() => setShowInvite(false)}
        />
      )}

      <div className="rounded-card border border-hairline bg-canvas-card overflow-hidden">
        {members === null ? (
          <div className="px-5 py-8 text-[13px] text-ink-muted">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-ink-muted border-b border-hairline">
                <th className="px-5 py-3 font-mono font-normal">Member</th>
                <th className="px-4 py-3 font-mono font-normal">Role</th>
                <th className="px-4 py-3 font-mono font-normal">Status</th>
                <th className="px-4 py-3 font-mono font-normal">Last sign-in</th>
                {isAdmin && <th className="px-5 py-3 font-mono font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {members.map(m => {
                const status = !m.isActive && m.invitedAt && !m.lastLoginAt
                  ? 'invited'
                  : m.isActive
                    ? 'active'
                    : 'deactivated'
                return (
                  <tr key={m.id} className="hover:bg-canvas transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-medium text-ink">
                        {m.firstName} {m.lastName}
                        {m.id === me?.id && (
                          <span className="text-ink-muted font-normal"> (you)</span>
                        )}
                      </div>
                      <div className="text-[12px] text-ink-muted">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft capitalize">
                      {m.role.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft font-mono">
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {status === 'invited' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => resend(m.id)}
                              title="Resend invitation"
                            >
                              <MailPlus size={14} strokeWidth={1.75} />
                              Resend
                            </Button>
                          )}
                          {status !== 'deactivated' && m.id !== me?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === m.id}
                              onClick={() => deactivate(m.id)}
                              title="Deactivate"
                            >
                              <UserX size={14} strokeWidth={1.75} className="text-overdue" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'invited' | 'deactivated' }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-ok">
        <span className="w-1.5 h-1.5 rounded-full bg-ok" /> Active
      </span>
    )
  if (status === 'invited')
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Invited
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted" /> Deactivated
    </span>
  )
}

function InviteForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<InviteUserInput>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EHS_COORDINATOR',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await teamApi.invite(form)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  const field =
    'h-9 w-full rounded border border-hairline bg-canvas px-3 text-[13px] text-ink focus-ring'

  return (
    <div className="rounded-card border border-hairline bg-canvas-card p-5 space-y-3">
      <div className="text-[13px] font-medium text-ink">Invite a team member</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={field}
          placeholder="First name"
          value={form.firstName}
          onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
        />
        <input
          className={field}
          placeholder="Last name"
          value={form.lastName}
          onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
        />
        <input
          className={field}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <select
          className={field}
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value as InviteUserInput['role'] }))}
        >
          {ROLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="text-[13px] text-overdue">{error}</div>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={busy || !form.email || !form.firstName || !form.lastName}
          onClick={submit}
        >
          Send invitation
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <span className="text-[12px] text-ink-muted">
          They'll get an email with a link to set their password.
        </span>
      </div>
    </div>
  )
}
