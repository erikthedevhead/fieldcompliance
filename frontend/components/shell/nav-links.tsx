'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  /** Predicate — when returns true, this link is highlighted as active. */
  isActive: (pathname: string) => boolean
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', isActive: p => p === '/' },
  { label: 'Facilities', href: '/facilities', isActive: p => p.startsWith('/facilities') },
  { label: 'Team', href: '/team', isActive: p => p.startsWith('/team') },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {NAV.map(item => {
        const active = item.isActive(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-[13px] px-3 h-8 rounded flex items-center transition-colors focus-ring',
              active
                ? 'bg-ink text-canvas'
                : 'text-ink-soft hover:text-ink hover:bg-canvas',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
