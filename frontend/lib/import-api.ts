import { useAuthStore } from './auth-store'
import { ApiError } from './api-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export type ImportKind = 'facilities' | 'equipment'

export interface RowError {
  row: number
  errors: string[]
}

export interface ImportReport {
  totalRows: number
  validRows: number
  errors: RowError[]
  warnings: RowError[]
  committed: boolean
  createdCount: number
}

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleUnauthorized(status: number) {
  if (status === 401) {
    useAuthStore.getState().clearSession()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }
}

/**
 * Multipart upload — deliberately does NOT set Content-Type so the
 * browser adds the multipart boundary itself. This is why this lives
 * outside api-client's JSON-only request() helper.
 */
export async function uploadImportFile(
  kind: ImportKind,
  file: File,
  commit: boolean,
): Promise<ImportReport> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(
    `${API_BASE}/import/${kind}${commit ? '?commit=true' : ''}`,
    { method: 'POST', headers: authHeader(), body: form },
  )
  handleUnauthorized(response.status)

  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await response.json() : null
  if (!response.ok) {
    throw new ApiError(response.status, data?.message || 'Import failed', `/import/${kind}`)
  }
  return data as ImportReport
}

/** Authed template download → triggers a browser save dialog. */
export async function downloadTemplate(kind: ImportKind): Promise<void> {
  const response = await fetch(`${API_BASE}/import/templates/${kind}.csv`, {
    headers: authHeader(),
  })
  handleUnauthorized(response.status)
  if (!response.ok) {
    throw new ApiError(response.status, 'Template download failed')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${kind}-import-template.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
