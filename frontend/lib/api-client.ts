import { useAuthStore, type AuthUser } from './auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public path?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Set to true to skip Authorization header (login, register). */
  skipAuth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Handle 401 globally — session expired or invalid
  if (response.status === 401 && !skipAuth) {
    useAuthStore.getState().clearSession()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Request failed'
    throw new ApiError(response.status, message, path)
  }

  return data as T
}

// ============================================================
// AUTH
// ============================================================

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    }),

  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    orgName: string
  }) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: data,
      skipAuth: true,
    }),

  forgotPassword: (email: string) =>
    request<{ success: boolean }>('/auth/password/forgot', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    }),
}

// ============================================================
// USERS
// ============================================================

export const usersApi = {
  me: () => request<AuthUser>('/users/me'),
}

// ============================================================
// ORGANIZATIONS
// ============================================================

export interface Organization {
  id: string
  name: string
  slug: string
  planTier: string
  maxFacilities: number
  _count?: { users: number; facilities: number }
}

export const orgsApi = {
  me: () => request<Organization>('/organizations/me'),
}

// ============================================================
// FACILITIES
// ============================================================

export interface Facility {
  id: string
  name: string
  type: string
  state: string
  county: string | null
  isActive: boolean
  latitude?: string | null
  longitude?: string | null
  _count?: { equipment: number; deadlines: number; inspections: number }
}

export const facilitiesApi = {
  list: () => request<Facility[]>('/facilities'),
  get: (id: string) => request<Facility>(`/facilities/${id}`),
}

// ============================================================
// DEADLINES
// ============================================================

export interface Deadline {
  id: string
  ruleCode: string
  title: string
  description: string | null
  dueDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'WAIVED'
  facility: { id: string; name: string; state: string }
  assignedUser: { id: string; firstName: string; lastName: string } | null
}

export const deadlinesApi = {
  list: (params?: { status?: string; facilityId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request<Deadline[]>(`/deadlines${qs ? `?${qs}` : ''}`)
  },
  upcoming: (days = 30) => request<Deadline[]>(`/deadlines/upcoming?days=${days}`),
  overdue: () => request<Deadline[]>('/deadlines/overdue'),
  generate: () => request<{ created: number; message: string }>('/deadlines/generate', { method: 'POST' }),
  complete: (id: string, notes?: string) =>
    request<Deadline>(`/deadlines/${id}/complete`, { method: 'PATCH', body: { notes } }),
}

// ============================================================
// EMISSIONS
// ============================================================

export interface EmissionSummary {
  pollutant: string
  total: string
  co2Equivalent: string
}

export const emissionsApi = {
  summary: (year?: number) =>
    request<EmissionSummary[]>(`/emissions/summary${year ? `?year=${year}` : ''}`),
}

// ============================================================
// HEALTH
// ============================================================

export const healthApi = {
  check: () =>
    request<{ status: string; uptime: number; checks: { database: string } }>('/health', {
      skipAuth: true,
    }),
}
