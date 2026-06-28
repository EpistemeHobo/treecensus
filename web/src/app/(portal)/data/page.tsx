'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { TreeRecord } from '@/types'

const COLUMNS = [
  { key: 'id',          label: 'ID',        className: 'font-mono text-[12px] text-muted' },
  { key: 'plotId',      label: 'Plot'       },
  { key: 'siteId',      label: 'Site'       },
  { key: 'species',     label: 'Species'    },
  { key: 'dbh',         label: 'DBH (cm)'   },
  { key: 'condition',   label: 'Condition',
    render: (row: TreeRecord) => {
      const v: Record<string, 'success'|'warning'|'danger'|'default'> = {
        good: 'success', fair: 'warning', poor: 'danger', dead: 'default',
      }
      return <Badge variant={v[row.condition] ?? 'default'}>{row.condition}</Badge>
    }
  },
  { key: 'collectedBy', label: 'Collector'  },
  { key: 'collectedAt', label: 'Date',
    render: (row: TreeRecord) => new Date(row.collectedAt).toLocaleDateString()
  },
]

export default function DataPage() {
  const [search, setSearch] = useState('')
  const [loading] = useState(false)
  const rows: TreeRecord[] = []

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Tree Data"
        subtitle="Browse and filter census records"
        actions={
          <Button variant="secondary" size="sm">
            <SlidersHorizontal size={13} />
            Filters
          </Button>
        }
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search species, site, collector…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-ghost border border-dim rounded-sm text-[13px] text-neutral placeholder:text-muted/50 outline-none focus:border-coral/40 transition-colors"
              />
            </div>
            <Button variant="secondary" size="sm">Export CSV</Button>
          </div>

          <Table
            columns={COLUMNS as Parameters<typeof Table>[0]['columns']}
            rows={rows as unknown as Record<string, unknown>[]}
            loading={loading}
            keyField="id"
            emptyMessage="No tree records yet. Connect BigQuery to load data."
          />

          <div className="flex items-center justify-between mt-4 text-[12px] text-muted">
            <span>0 records</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled>Previous</Button>
              <Button variant="ghost" size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
