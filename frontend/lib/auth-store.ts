'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ORG_ADMIN' | 'EHS_COORDINATOR' | 'SITE_MANAGER' | 'FIELD_TECH' | 'AUDITOR'
  org: {
    id: string
    name: string
    slug: string
    planTier: string
  }
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: () => boolean
  setSession: (accessToken: string, user: AuthUser) => void
  clearSession: () => void
}

/**
 * Auth session state, persisted to localStorage.
 *
 * Note: localStorage is XSS-vulnerable. For the MVP this is an acceptable
 * tradeoff (no cross-origin sensitivity, single-page app). Before going to
 * production with real customers, swap this for httpOnly cookie storage
 * — requires a backend change to set-cookie on login and read from cookie
 * in the JWT strategy.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: () => !!get().accessToken && !!get().user,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'fc-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
