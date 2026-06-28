// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'field_user' | 'data_viewer' | 'data_manager' | 'analyst' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  lastLogin?: string
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: string
}

// ─── Tree Census Domain ───────────────────────────────────────────────────────

export interface TreeRecord {
  id: string
  submissionId: string
  plotId: string
  siteId: string
  species: string
  speciesCode: string
  dbh: number          // diameter at breast height (cm)
  height?: number      // estimated height (m)
  condition: 'good' | 'fair' | 'poor' | 'dead'
  lat: number
  lng: number
  collectedBy: string
  collectedAt: string
  notes?: string
  processedAt: string
}

export interface Submission {
  id: string
  rawRef: string       // GCS object path
  formProvider: string
  submittedAt: string
  syncedAt: string
  status: 'pending' | 'processed' | 'error'
  errorMessage?: string
  treeCount: number
}

export interface Species {
  code: string
  commonName: string
  scientificName: string
  family: string
}

export interface Site {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  plotCount: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalTrees: number
  totalSites: number
  totalSpecies: number
  totalSubmissions: number
  lastSyncAt: string
  pendingSubmissions: number
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    pageSize: number
  }
  error?: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionMs: number
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  title: string
  createdBy: string
  createdAt: string
  status: 'draft' | 'finalized'
  sections: ReportSection[]
}

export interface ReportSection {
  id: string
  type: 'summary_table' | 'chart' | 'map' | 'text' | 'image' | 'signature'
  title?: string
  content?: string
}
