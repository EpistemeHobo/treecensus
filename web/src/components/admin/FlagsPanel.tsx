'use client'

import { useEffect, useState } from 'react'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Check, X, ShieldAlert, AlertCircle } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'

interface DataFlag {
  id: string
  mapRecordId: string
  field: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  flaggedBy: string
  flaggedAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  [key: string]: any
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString() } catch { return ts }
}

export function FlagsPanel() {
  const { t, lang } = useI18n()
  const [flags, setFlags] = useState<DataFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterTab, setFilterTab] = useState<'pending' | 'all'>('pending')
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const isTh = lang === 'th'

  const fetchFlags = () => {
    setLoading(true)
    setError('')
    const url = filterTab === 'pending' ? '/api/flags?status=pending' : '/api/flags'
    fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Failed to load flags')
        return r.json()
      })
      .then(d => setFlags(d.flags ?? []))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load flags'))
      .finally(() => setLoading(false))
  }

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    setPage(0)
    fetchFlags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTab])

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/flags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: actionNotes[id] || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to review change')
      }

      // Success: refetch flags list
      fetchFlags()
      // Clear notes for this item
      setActionNotes(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete review')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleNoteChange = (id: string, val: string) => {
    setActionNotes(prev => ({ ...prev, [id]: val }))
  }

  return (
    <MangroveCard variant="sand">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-[14px] font-semibold text-neutral flex items-center gap-2">
          <ShieldAlert size={15} className="text-coral" />
          {isTh ? 'คิวการตรวจยืนยันข้อมูล' : 'Data Verification Queue'}
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              filterTab === 'pending'
                ? 'bg-coral text-black font-semibold'
                : 'text-muted hover:text-neutral hover:bg-white/[0.04]'
            }`}
          >
            {isTh ? 'รออนุมัติ' : 'Pending'}
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              filterTab === 'all'
                ? 'bg-coral text-black font-semibold'
                : 'text-muted hover:text-neutral hover:bg-white/[0.04]'
            }`}
          >
            {isTh ? 'ทั้งหมด' : 'All Requests'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[13px] text-rose border border-rose/20 bg-rose/5 rounded-sm px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <Table<DataFlag>
        loading={loading}
        keyField="id"
        columns={[
          {
            key: 'flaggedAt',
            label: isTh ? 'เมื่อ' : 'Flagged At',
            render: f => <span className="text-[12px] text-muted whitespace-nowrap">{fmt(f.flaggedAt)}</span>,
          },
          {
            key: 'flaggedBy',
            label: isTh ? 'โดย' : 'Flagged By',
            render: f => <span className="text-[12px] text-neutral font-medium">{f.flaggedBy}</span>,
          },
          {
            key: 'mapRecordId',
            label: isTh ? 'รหัสลำต้น' : 'Record ID',
            render: f => <span className="text-[12px] font-mono text-muted">{f.mapRecordId}</span>,
          },
          {
            key: 'field',
            label: isTh ? 'ฟิลด์' : 'Field',
            render: f => <span className="text-[12px] font-mono text-coral">{f.field}</span>,
          },
          {
            key: 'oldValue',
            label: isTh ? 'ค่าเดิม -> ค่าใหม่' : 'Old -> New Value',
            render: f => (
              <span className="text-[12px] text-neutral">
                {f.oldValue || <em className="opacity-40">Empty</em>} &rarr;{' '}
                <strong className="text-emerald-500 font-semibold">{f.newValue || <em className="opacity-40">Empty</em>}</strong>
              </span>
            ),
          },
          {
            key: 'reason',
            label: isTh ? 'เหตุผล' : 'Reason',
            render: f => (
              <div className="max-w-[200px] text-[12px] text-muted leading-relaxed break-words" title={f.reason || ''}>
                {f.reason}
              </div>
            ),
          },
          {
            key: 'status',
            label: isTh ? 'สถานะ / การดำเนินการ' : 'Status / Review Actions',
            render: f => {
              if (f.status === 'pending') {
                const isLoading = actionLoading[f.id] || false
                return (
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <input
                      type="text"
                      placeholder={isTh ? 'บันทึกของผู้อนุมัติ (ระบุหรือไม่ก็ได้)' : 'Review notes (optional)'}
                      value={actionNotes[f.id] || ''}
                      onChange={e => handleNoteChange(f.id, e.target.value)}
                      disabled={isLoading}
                      className="w-full h-7 rounded bg-[#121218] border border-[rgba(255,255,255,0.08)] px-2 text-[11px] text-neutral placeholder:text-muted/30 focus:outline-none focus:border-coral/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(f.id, 'approved')}
                        disabled={isLoading}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-neutral text-[11px] font-semibold py-1 px-2.5 flex-1 flex items-center justify-center gap-1"
                      >
                        <Check size={11} /> {isTh ? 'อนุมัติ' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleReview(f.id, 'rejected')}
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                        className="border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[11px] font-semibold py-1 px-2.5 flex-1 flex items-center justify-center gap-1"
                      >
                        <X size={11} /> {isTh ? 'ปฏิเสธ' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="flex flex-col gap-1">
                  <Badge variant={f.status === 'approved' ? 'success' : 'danger'}>
                    {f.status === 'approved' ? (isTh ? 'อนุมัติแล้ว' : 'Approved') : (isTh ? 'ปฏิเสธแล้ว' : 'Rejected')}
                  </Badge>
                  {f.reviewedBy && (
                    <span className="text-[10px] text-muted-dim block">
                      {isTh ? 'โดย:' : 'By:'} {f.reviewedBy}
                    </span>
                  )}
                  {f.reviewNotes && (
                    <span className="text-[10px] text-muted block bg-white/[0.02] border border-white/[0.04] p-1 rounded max-w-[180px] break-words">
                      {f.reviewNotes}
                    </span>
                  )}
                </div>
              )
            },
          },
        ]}
        rows={flags.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
        emptyMessage={isTh ? 'ไม่มีรายการแจ้งแก้ไขข้อมูล' : 'No flagging requests found.'}
      />

      {!loading && flags.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-[12px] text-muted">
          <span>
            {t('data.rangeOf', {
              from: (flags.length === 0 ? 0 : page * PAGE_SIZE + 1).toLocaleString(),
              to: Math.min((page + 1) * PAGE_SIZE, flags.length).toLocaleString(),
              total: flags.length.toLocaleString(),
            })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(p - 1, 0))}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={(page + 1) * PAGE_SIZE >= flags.length}
              onClick={() => setPage(p => p + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </MangroveCard>
  )
}
