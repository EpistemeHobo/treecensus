'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X, Send } from 'lucide-react'
import { useI18n } from '@/context/LanguageContext'
import { DICT_BY_NAME } from '@/lib/data-dictionary'

interface FlagModalProps {
  open: boolean
  onClose: () => void
  record: Record<string, string | null> | null
  fields: string[]
}

export function FlagModal({ open, onClose, record, fields }: FlagModalProps) {
  const { t, lang } = useI18n()
  const [selectedField, setSelectedField] = useState('')
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset states when modal is opened for a new record
  useEffect(() => {
    if (open) {
      setSelectedField(fields[0] || '')
      setNewValue('')
      setReason('')
      setError('')
      setSuccess(false)
    }
  }, [open, record, fields])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !record || typeof document === 'undefined') return null

  const isTh = lang === 'th'
  const currentValue = record[selectedField] ?? ''

  const getFieldLabel = (field: string) => {
    const d = DICT_BY_NAME.get(field)
    if (!d) return field
    return isTh ? (d.th_label || d.label) : d.label
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedField || !record) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapRecordId: record.map_record_id,
          field: selectedField,
          oldValue: currentValue,
          newValue: newValue,
          reason: reason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit flag')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter fields to make sure we don't flag read-only/system columns like record ID
  const editableFields = fields.filter(f => f !== 'map_record_id' && f !== 'submission_id')

  return createPortal(
    <div
      className="dark fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border border-[rgba(255,255,255,0.10)] shadow-2xl my-auto"
        style={{ background: '#0A0A10' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 text-coral">
            <AlertTriangle size={16} />
            <h3 className="text-[14px] font-semibold text-neutral">
              {isTh ? 'แจ้งแก้ไขข้อมูล' : 'Flag Incorrect Data'}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-neutral transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Send size={18} />
            </div>
            <h4 className="text-[14px] font-semibold text-neutral">
              {isTh ? 'ส่งคำแจ้งแก้ไขเรียบร้อยแล้ว' : 'Correction submitted successfully'}
            </h4>
            <p className="text-[12px] text-muted">
              {isTh ? 'ผู้ดูแลระบบจะตรวจสอบคำขอของคุณ' : 'An administrator will review your suggestion.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="text-[12px] text-muted mb-2">
              {isTh ? 'แจ้งแก้ไขสำหรับรหัสลำต้น:' : 'Flagging record ID:'} <strong className="text-neutral">{record.map_record_id}</strong>
            </div>

            {error && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[12px]">
                {error}
              </div>
            )}

            {/* Field selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {isTh ? 'ฟิลด์ที่ต้องการแก้ไข' : 'Field to correct'}
              </label>
              <select
                value={selectedField}
                onChange={e => {
                  setSelectedField(e.target.value)
                  setNewValue('')
                }}
                className="w-full h-9 rounded bg-[#121218] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-neutral focus:outline-none focus:border-coral/50"
              >
                {editableFields.map(f => (
                  <option key={f} value={f}>
                    {getFieldLabel(f)} ({f})
                  </option>
                ))}
              </select>
            </div>

            {/* Current value (Read-only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {isTh ? 'ค่าปัจจุบัน' : 'Current Value'}
              </label>
              <div className="w-full min-h-9 flex items-center rounded bg-white/[0.03] border border-transparent px-3 text-[13px] text-muted select-none">
                {currentValue || <em className="opacity-40">{isTh ? 'ไม่มีค่า' : 'Empty'}</em>}
              </div>
            </div>

            {/* Suggested New value */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {isTh ? 'ค่าใหม่ที่เสนอ' : 'Suggested Value'}
              </label>
              <input
                type="text"
                required
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder={isTh ? 'ป้อนค่าใหม่ที่ถูกต้อง...' : 'Enter the correct value...'}
                className="w-full h-9 rounded bg-[#121218] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-neutral placeholder:text-muted/30 focus:outline-none focus:border-coral/50"
              />
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {isTh ? 'เหตุผลที่แก้ไข' : 'Reason for correction'}
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={isTh ? 'อธิบายเหตุผลของการแก้ไข เช่น พิมพ์ผิด, วัดผิดพลาด...' : 'Explain why this needs to be changed...'}
                className="w-full rounded bg-[#121218] border border-[rgba(255,255,255,0.08)] p-3 text-[13px] text-neutral placeholder:text-muted/30 focus:outline-none focus:border-coral/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 h-9 rounded text-[13px] font-medium text-muted hover:text-neutral hover:bg-white/[0.04] transition-all"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 h-9 rounded bg-coral hover:bg-coral-light text-black text-[13px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                {isTh ? 'ส่งข้อมูล' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
