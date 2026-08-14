import { useAuthStore, type AuthUser } from './auth-store'
import { ApiError, type LoginResponse } from './api-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  role: AuthUser['role']
  phone: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  invitedAt: string | null
}

export interface InviteUserInput {
  email: string
  firstName: string
  lastName: string
  role: AuthUser['role']
  phone?: string
}

async function req<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && auth) {
    useAuthStore.getState().clearSession()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) throw new ApiError(res.status, data?.message || 'Request failed', path)
  return data as T
}

export const teamApi = {
  list: () => req<TeamMember[]>('/users'),
  invite: (data: InviteUserInput) => req<TeamMember>('/users', { method: 'POST', body: data }),
  resendInvite: (id: string) =>
    req<{ success: boolean }>(`/users/${id}/resend-invite`, { method: 'POST' }),
  deactivate: (id: string) => req<TeamMember>(`/users/${id}`, { method: 'DELETE' }),
}

export const inviteApi = {
  accept: (token: string, password: string) =>
    req<LoginResponse>('/auth/invite/accept', {
      method: 'POST',
      body: { token, password },
      auth: false,
    }),
}

export const passwordApi = {
  forgot: (email: string) =>
    req<{ success: boolean }>('/auth/password/forgot', {
      method: 'POST',
      body: { email },
      auth: false,
    }),
  reset: (token: string, newPassword: string) =>
    req<{ success: boolean }>('/auth/password/reset', {
      method: 'POST',
      body: { token, newPassword },
      auth: false,
    }),
}
