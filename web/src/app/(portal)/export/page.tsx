'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

export default function ExportPage() {
  const [siteId, setSiteId] = useState('')
  const [species, setSpecies] = useState('')

  function buildUrl(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams({ format })
    if (siteId) params.set('siteId', siteId)
    if (species) params.set('species', species)
    return `/api/export?${params}`
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Export" subtitle="Download filtered census data as CSV or Excel" />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto max-w-2xl">
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-5">Configure Export</h2>

          <div className="flex flex-col gap-4">
            {[
              { label: 'Site ID (optional)',      val: siteId,  set: setSiteId,  ph: 'Leave blank for all sites'   },
              { label: 'Species Code (optional)', val: species, set: setSpecies, ph: 'Leave blank for all species' },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted uppercase tracking-widest font-medium">{f.label}</label>
                <input
                  type="text"
                  placeholder={f.ph}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  className="bg-ghost border border-dim rounded-sm px-4 py-3 text-[13px] text-neutral placeholder:text-muted/40 outline-none focus:border-coral/40 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-dim">
            <a href={buildUrl('csv')}>
              <Button><Download size={14} />Export CSV</Button>
            </a>
            <a href={buildUrl('xlsx')}>
              <Button variant="secondary"><Download size={14} />Export Excel</Button>
            </a>
          </div>

          <p className="text-[11px] text-muted/50 mt-3">
            Exports are capped at 100,000 rows. Use the SQL Query interface for larger datasets.
          </p>
        </Card>
      </div>
    </div>
  )
}
