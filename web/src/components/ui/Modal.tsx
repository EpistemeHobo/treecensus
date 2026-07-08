'use client'

import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, footer, width = 460 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Portal to <body> so the overlay escapes the stacking context of whatever
  // card renders it (MangroveCard's z-index:1 content wrapper would otherwise
  // let later siblings paint over — and steal clicks from — the modal).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="dark bg-surface border border-dim rounded-lg shadow-xl w-full mx-4"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dim">
          <h3 className="text-[14px] font-semibold text-neutral">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-neutral transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-dim flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
