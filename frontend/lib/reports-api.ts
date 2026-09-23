import { useAuthStore } from './auth-store'
import { ApiError } from './api-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export interface ComplianceReport {
  id: string
  reportType: string
  reportingYear: number
  periodStart: string
  periodEnd: string
  status: string
  generatedAt: string | null
  facilityId: string | null
  facility?: { id: string; name: string } | null
  createdAt: string
}

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 401) {
    useAuthStore.getState().clearSession()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) throw new ApiError(res.status, data?.message || 'Request failed', path)
  return data as T
}

export const reportsApi = {
  list: (year?: number) =>
    req<ComplianceReport[]>(`/reports${year ? `?year=${year}` : ''}`),
  generate: (reportingYear: number, facilityId?: string) =>
    req<ComplianceReport>('/reports/generate', {
      method: 'POST',
      body: { reportingYear, ...(facilityId ? { facilityId } : {}) },
    }),
  /** Streams the draft PDF and triggers a browser download. */
  downloadPdf: async (report: ComplianceReport): Promise<void> => {
    const res = await fetch(`${API_BASE}/reports/${report.id}/pdf`, {
      headers: authHeader(),
    })
    if (res.status === 401) {
      useAuthStore.getState().clearSession()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return
    }
    if (!res.ok) {
      const isJson = (res.headers.get('content-type') || '').includes('application/json')
      const data = isJson ? await res.json() : null
      throw new ApiError(res.status, data?.message || 'PDF download failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subpart-w-draft-${report.reportingYear}-${report.id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
