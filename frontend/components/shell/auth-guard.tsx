'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

/**
 * Client-side auth guard.
 *
 * Zustand's `persist` middleware hydrates from localStorage on the client only,
 * so we can't check auth in a Server Component. This wrapper redirects to /login
 * if there's no session once hydration completes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())

  useEffect(() => {
    // Zustand persist rehydrates synchronously on first mount, so this is safe.
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    // Prevent the dashboard flashing before redirect kicks in
    return null
  }

  return <>{children}</>
}
