'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { NavLinks } from './nav-links'

export function Topbar() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const clearSession = useAuthStore(s => s.clearSession)

  function handleSignOut() {
    clearSession()
    router.push('/login')
    router.refresh()
  }

  const initials =
    user
      ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
      : 'U'

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-hairline">
      <div className="flex items-center justify-between px-6 h-14 gap-4">
        {/* Brand + nav */}
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-3 focus-ring rounded flex-shrink-0"
          >
            <div
              aria-hidden
              className="h-6 w-6 rounded-[4px] bg-ink text-canvas grid place-items-center text-[11px] font-mono"
            >
              FC
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[14px] font-medium text-ink">
              FieldCompliance
              {user?.org?.name && (
                <>
                  <span className="text-ink-subtle">·</span>
                  <span className="text-ink-muted font-normal truncate max-w-[180px]">
                    {user.org.name}
                  </span>
                </>
              )}
            </div>
          </Link>

          <NavLinks />
        </div>

        {/* Cmd+K placeholder */}
        <button
          type="button"
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded border border-hairline bg-canvas-card text-[12px] text-ink-muted hover:border-divider transition-colors focus-ring flex-shrink-0"
        >
          <Search size={13} strokeWidth={1.75} />
          Jump to anything
          <span className="ml-6 text-ink-subtle font-mono">⌘K</span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-[12px] text-ink font-medium">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[11px] text-ink-muted uppercase tracking-wide">
              {user?.role.replace('_', ' ').toLowerCase()}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-warn-bg text-warn text-[12px] font-medium grid place-items-center">
            {initials}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-ink-muted hover:text-ink transition-colors p-1.5 rounded focus-ring"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  )
}
