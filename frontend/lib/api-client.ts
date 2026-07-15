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
  skipAuth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401 && !skipAuth) {
    useAuthStore.getState().clearSession()
    if (typeof window !== 'undefined') window.location.href = '/login'
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
  }) => request<LoginResponse>('/auth/register', { method: 'POST', body: data, skipAuth: true }),
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

export type FacilityType =
  | 'PRODUCTION_WELL'
  | 'INJECTION_WELL'
  | 'COMPRESSOR_STATION'
  | 'GATHERING_PIPELINE'
  | 'PROCESSING_PLANT'
  | 'STORAGE_TANK_BATTERY'
  | 'MIDSTREAM_FACILITY'

export interface Facility {
  id: string
  name: string
  type: FacilityType
  state: string
  county: string | null
  apiWellNumber?: string | null
  legalDescription?: string | null
  isActive: boolean
  latitude?: string | number | null
  longitude?: string | number | null
  commissionedAt?: string | null
  decommissionedAt?: string | null
  _count?: { equipment: number; deadlines: number; inspections: number }
}

export interface CreateFacilityInput {
  name: string
  type: FacilityType
  state: string
  apiWellNumber?: string
  county?: string
  latitude?: number
  longitude?: number
  legalDescription?: string
  commissionedAt?: string
}

export type UpdateFacilityInput = Partial<Omit<CreateFacilityInput, 'type' | 'state'>>

export const facilitiesApi = {
  list: () => request<Facility[]>('/facilities'),
  get: (id: string) => request<Facility & { equipment: Equipment[] }>(`/facilities/${id}`),
  create: (data: CreateFacilityInput) =>
    request<Facility>('/facilities', { method: 'POST', body: data }),
  update: (id: string, data: UpdateFacilityInput) =>
    request<Facility>(`/facilities/${id}`, { method: 'PATCH', body: data }),
  decommission: (id: string) => request<Facility>(`/facilities/${id}`, { method: 'DELETE' }),
}

// ============================================================
// EQUIPMENT
// ============================================================

export type EquipmentCategory =
  | 'PNEUMATIC_CONTROLLER'
  | 'PNEUMATIC_PUMP'
  | 'STORAGE_TANK'
  | 'SEPARATOR'
  | 'COMPRESSOR_RECIPROCATING'
  | 'COMPRESSOR_CENTRIFUGAL'
  | 'DEHYDRATOR_GLYCOL'
  | 'METER_SEPARATOR'
  | 'FLARE_SYSTEM'
  | 'WELLHEAD'
  | 'FUGITIVE_COMPONENT'

export interface Equipment {
  id: string
  facilityId: string
  tag: string
  category: EquipmentCategory
  description?: string | null
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  installDate?: string | null
  lastServiceDate?: string | null
  isActive: boolean
  pneumaticType?: string | null
  tankCapacityBbls?: string | number | null
  compressorHp?: number | null
  throughputMcfd?: string | number | null
  facility?: { id: string; name: string; state: string }
}

export interface CreateEquipmentInput {
  facilityId: string
  tag: string
  category: EquipmentCategory
  description?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  installDate?: string
  pneumaticType?: 'high-bleed' | 'low-bleed' | 'instrument'
  tankCapacityBbls?: number
  compressorHp?: number
  throughputMcfd?: number
}

export type UpdateEquipmentInput = Partial<Omit<CreateEquipmentInput, 'facilityId' | 'category'>>

export const equipmentApi = {
  list: (facilityId?: string) =>
    request<Equipment[]>(`/equipment${facilityId ? `?facilityId=${facilityId}` : ''}`),
  get: (id: string) => request<Equipment>(`/equipment/${id}`),
  create: (data: CreateEquipmentInput) =>
    request<Equipment>('/equipment', { method: 'POST', body: data }),
  update: (id: string, data: UpdateEquipmentInput) =>
    request<Equipment>(`/equipment/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => request<Equipment>(`/equipment/${id}`, { method: 'DELETE' }),
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
  get: (id: string) => request<Deadline>(`/deadlines/${id}`),
  upcoming: (days = 30) => request<Deadline[]>(`/deadlines/upcoming?days=${days}`),
  overdue: () => request<Deadline[]>('/deadlines/overdue'),
  generate: () =>
    request<{ created: number; message: string }>('/deadlines/generate', { method: 'POST' }),
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

export interface CalculationRecord {
  equipmentId: string | null
  equipmentTag: string | null
  equipmentCategory: string
  pollutant: string
  calculatedQuantity: number
  unit: string
  quantityMetricTons: number
  co2Equivalent: number
  calculationMethod: string
  emissionFactorId: string | null
  activityData: Record<string, unknown>
  notes?: string
}

export interface CalculationResult {
  facilityId: string
  periodStart: string
  periodEnd: string
  records: CalculationRecord[]
  totals: {
    co2eMetricTons: number
    byPollutant: Record<string, number>
  }
  persisted: number
}

export interface CalculateRequest {
  facilityId: string
  periodStart: string
  periodEnd: string
  persist?: boolean
  activityData?: {
    pneumaticHours?: number
    compressorHours?: number
    storageTankThroughputBbl?: number
    fugitiveComponentCount?: number
  }
}

export const emissionsApi = {
  summary: (year?: number) =>
    request<EmissionSummary[]>(`/emissions/summary${year ? `?year=${year}` : ''}`),
  calculate: (payload: CalculateRequest) =>
    request<CalculationResult>('/emissions/calculate', { method: 'POST', body: payload }),
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

// ============================================================
// SHARED ENUMS (for form dropdowns)
// ============================================================

export const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: 'PRODUCTION_WELL', label: 'Production well' },
  { value: 'INJECTION_WELL', label: 'Injection well' },
  { value: 'COMPRESSOR_STATION', label: 'Compressor station' },
  { value: 'GATHERING_PIPELINE', label: 'Gathering pipeline' },
  { value: 'PROCESSING_PLANT', label: 'Processing plant' },
  { value: 'STORAGE_TANK_BATTERY', label: 'Storage tank battery' },
  { value: 'MIDSTREAM_FACILITY', label: 'Midstream facility' },
]

export const EQUIPMENT_CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'PNEUMATIC_CONTROLLER', label: 'Pneumatic controller' },
  { value: 'PNEUMATIC_PUMP', label: 'Pneumatic pump' },
  { value: 'STORAGE_TANK', label: 'Storage tank' },
  { value: 'SEPARATOR', label: 'Separator' },
  { value: 'COMPRESSOR_RECIPROCATING', label: 'Compressor (reciprocating)' },
  { value: 'COMPRESSOR_CENTRIFUGAL', label: 'Compressor (centrifugal)' },
  { value: 'DEHYDRATOR_GLYCOL', label: 'Glycol dehydrator' },
  { value: 'METER_SEPARATOR', label: 'Meter separator' },
  { value: 'FLARE_SYSTEM', label: 'Flare system' },
  { value: 'WELLHEAD', label: 'Wellhead' },
  { value: 'FUGITIVE_COMPONENT', label: 'Fugitive component' },
]
