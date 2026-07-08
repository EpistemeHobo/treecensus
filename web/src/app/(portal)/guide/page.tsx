'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { useI18n } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { UI_DICTIONARY, type UiTopicKey, type UiElement } from '@/lib/ui-dictionary'
import type { TranslationKey } from '@/i18n/translations'
import { GUIDE_CONTENT } from '@/lib/guide-content'
import {
  LogIn,
  Compass,
  LayoutDashboard,
  TreePine,
  BarChart3,
  Map,
  FileText,
  Settings as SettingsIcon,
  Shield,
  ScrollText,
  MousePointerClick,
  Lightbulb,
  Tags,
  ChevronDown,
  SquarePen,
  Search,
  Maximize2,
  X,
  AlertTriangle,
} from 'lucide-react'

const TOPIC_KEYS = Object.keys(UI_DICTIONARY) as UiTopicKey[]

const TOPIC_ICONS: Record<UiTopicKey, React.ElementType> = {
  'getting-started': LogIn,
  'navigation': Compass,
  'dashboard': LayoutDashboard,
  'data-browse': TreePine,
  'data-insights': BarChart3,
  'maps': Map,
  'reports': FileText,
  'settings': SettingsIcon,
  'admin-users': Shield,
  'audit': ScrollText,
  'common': MousePointerClick,
  'ui-search': Search,
  'data-flagging': AlertTriangle,
}

/** Admin-edited mini-guide overrides, keyed by element id. */
type OverrideMap = Record<string, { guide_en: string; guide_th: string }>

// useSearchParams needs a Suspense boundary on statically rendered pages.
export default function GuidePage() {
  return (
    <Suspense fallback={null}>
      <GuideView />
    </Suspense>
  )
}

function GuideView() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const searchParams = useSearchParams()

  const [topic, setTopic] = useState<UiTopicKey>('getting-started')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<OverrideMap>({})

  // Editing state (admin only)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftEn, setDraftEn] = useState('')
  const [draftTh, setDraftTh] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/guide/overrides')
      .then(res => (res.ok ? res.json() : { overrides: [] }))
      .then((data: { overrides: { id: string; guide_en: string; guide_th: string }[] }) => {
        if (cancelled) return
        const map: OverrideMap = {}
        for (const o of data.overrides ?? []) map[o.id] = { guide_en: o.guide_en, guide_th: o.guide_th }
        setOverrides(map)
      })
      .catch(() => { /* fall back to authored defaults */ })
    return () => { cancelled = true }
  }, [])

  // Deep links from the sidebar UI search: /guide?topic=<key>&label=<element id>.
  // The label's category wins over the topic param so the row is always visible.
  useEffect(() => {
    const topicParam = searchParams.get('topic')
    const labelParam = searchParams.get('label')

    if (labelParam) {
      const cat = (Object.keys(UI_DICTIONARY) as UiTopicKey[]).find(k =>
        UI_DICTIONARY[k].ui_elements.some(e => e.id === labelParam),
      )
      if (cat) {
        setTopic(cat)
        setExpanded(prev => new Set(prev).add(labelParam))
        setHighlightId(labelParam)
        const timer = setTimeout(() => {
          document.getElementById(`label-row-${labelParam}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
        return () => clearTimeout(timer)
      }
    }
    if (topicParam && topicParam in UI_DICTIONARY) {
      setTopic(topicParam as UiTopicKey)
    }
  }, [searchParams])

  const category = UI_DICTIONARY[topic]
  const content = GUIDE_CONTENT[topic]
  const topicName = lang === 'en' ? category.topic_name_en : category.topic_name_th
  const intro = lang === 'en' ? content.intro_en : content.intro_th
  const steps = lang === 'en' ? content.steps_en : content.steps_th
  const tips = lang === 'en' ? content.tips_en : content.tips_th

  function miniGuideOf(elem: UiElement): string {
    const o = overrides[elem.id]
    if (lang === 'en') return o?.guide_en || elem.guide_en
    return o?.guide_th || elem.guide_th
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (editingId === id) cancelEdit()
  }

  function startEdit(elem: UiElement) {
    const o = overrides[elem.id]
    setEditingId(elem.id)
    setDraftEn(o?.guide_en || elem.guide_en)
    setDraftTh(o?.guide_th || elem.guide_th)
    setSaveError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftEn('')
    setDraftTh('')
    setSaveError('')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/guide/overrides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, guide_en: draftEn, guide_th: draftTh }),
      })
      if (!res.ok) throw new Error()
      setOverrides(prev => ({ ...prev, [id]: { guide_en: draftEn.trim(), guide_th: draftTh.trim() } }))
      cancelEdit()
    } catch {
      setSaveError(t('guide.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={t('guide.title')} subtitle={t('guide.subtitle')} />

      <div className="flex-1 p-8 flex gap-6 overflow-auto items-start">
        {/* Topic tabs */}
        <nav className="w-64 shrink-0 sticky top-0 flex flex-col gap-0.5">
          <p className="text-[11px] text-muted uppercase tracking-widest font-medium px-3 pb-2">
            {t('guide.topics')}
          </p>
          {TOPIC_KEYS.map(key => {
            const Icon = TOPIC_ICONS[key]
            const active = key === topic
            const name = lang === 'en' ? UI_DICTIONARY[key].topic_name_en : UI_DICTIONARY[key].topic_name_th
            return (
              <button
                key={key}
                onClick={() => setTopic(key)}
                className={
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-medium text-left transition-all duration-150 border ' +
                  (active
                    ? 'bg-coral/10 text-[#5E7D18] border-coral/10'
                    : 'text-muted hover:text-neutral hover:bg-ghost border-transparent')
                }
              >
                <Icon size={15} className="shrink-0" />
                {name}
              </button>
            )
          })}
        </nav>

        {/* Topic content — mud (brown) card; texture varies per topic via seed */}
        <div className="flex-1 min-w-0 max-w-3xl flex flex-col gap-6">
          <MangroveCard variant="brown" seed={TOPIC_KEYS.indexOf(topic) + 7} subtle>
            <h2 className="text-[16px] font-semibold text-neutral mb-3">{topicName}</h2>
            <p className="text-[13px] text-muted leading-relaxed">{intro}</p>

            <h3 className="text-[11px] text-violet uppercase tracking-widest font-medium mt-6 mb-3">
              {t('guide.howTo')}
            </h3>
            <ol className="flex flex-col gap-2.5">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-coral/10 text-coral text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-neutral leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <TopicGif topicNumber={TOPIC_KEYS.indexOf(topic) + 1} />

            {tips && tips.length > 0 && (
              <>
                <h3 className="flex items-center gap-1.5 text-[11px] text-violet uppercase tracking-widest font-medium mt-6 mb-3">
                  <Lightbulb size={12} />
                  {t('guide.tips')}
                </h3>
                <ul className="flex flex-col gap-2">
                  {tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-[12.5px] text-muted leading-relaxed bg-ghost border border-dim rounded-sm px-3.5 py-2.5"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </MangroveCard>

          {/* Related UI labels — flat dark (sand) card, matches the sidebar surface */}
          <MangroveCard variant="sand">
            <h3 className="flex items-center gap-1.5 text-[11px] text-muted uppercase tracking-widest font-medium mb-3">
              <Tags size={12} />
              {t('guide.relatedLabels')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-dim">
                    <th className="w-8" aria-hidden />
                    <th className={'text-left font-medium py-2 pr-4 ' + (lang === 'en' ? 'text-coral' : 'text-muted')}>
                      {t('guide.labelEn')}
                    </th>
                    <th className={'text-left font-medium py-2 ' + (lang === 'th' ? 'text-coral' : 'text-muted')}>
                      {t('guide.labelTh')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category.ui_elements.map(elem => {
                    const isOpen = expanded.has(elem.id)
                    const isEditing = editingId === elem.id
                    return (
                      <FragmentRow
                        key={elem.id}
                        elem={elem}
                        isOpen={isOpen}
                        isEditing={isEditing}
                        isHighlighted={highlightId === elem.id}
                        isAdmin={isAdmin}
                        miniGuide={miniGuideOf(elem)}
                        t={t}
                        onToggle={() => toggleExpand(elem.id)}
                        onStartEdit={() => startEdit(elem)}
                        onCancelEdit={cancelEdit}
                        onSave={() => saveEdit(elem.id)}
                        draftEn={draftEn}
                        draftTh={draftTh}
                        setDraftEn={setDraftEn}
                        setDraftTh={setDraftTh}
                        saving={saving}
                        saveError={saveError}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </MangroveCard>
        </div>
      </div>
    </div>
  )
}

interface FragmentRowProps {
  elem: UiElement
  isOpen: boolean
  isEditing: boolean
  isHighlighted: boolean
  isAdmin: boolean
  miniGuide: string
  t: (key: TranslationKey) => string
  onToggle: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  draftEn: string
  draftTh: string
  setDraftEn: (v: string) => void
  setDraftTh: (v: string) => void
  saving: boolean
  saveError: string
}

function FragmentRow({
  elem, isOpen, isEditing, isHighlighted, isAdmin, miniGuide, t,
  onToggle, onStartEdit, onCancelEdit, onSave,
  draftEn, draftTh, setDraftEn, setDraftTh, saving, saveError,
}: FragmentRowProps) {
  return (
    <>
      <tr
        id={`label-row-${elem.id}`}
        className={
          'border-b border-dim/50 last:border-0 ' + (isHighlighted ? 'bg-coral/5' : '')
        }
      >
        <td className="py-2 pr-2 align-top">
          <button
            onClick={onToggle}
            aria-expanded={isOpen}
            className="text-muted hover:text-coral transition-colors"
          >
            <ChevronDown
              size={14}
              className={'transition-transform duration-150 ' + (isOpen ? 'rotate-180' : '')}
            />
          </button>
        </td>
        <td className="py-2 pr-4 text-neutral align-top cursor-pointer" onClick={onToggle}>
          {elem.label_en}
        </td>
        <td className="py-2 text-neutral align-top cursor-pointer" onClick={onToggle}>
          {elem.label_th}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-dim/50 last:border-0">
          <td colSpan={3} className="pb-3">
            <div className="ml-8 bg-ghost border border-dim rounded-sm px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-violet uppercase tracking-widest font-medium mb-1">
                    {t('guide.miniGuide')}
                  </p>
                  {!isEditing && (
                    <p className="text-[12.5px] text-muted leading-relaxed">{miniGuide}</p>
                  )}
                </div>
                {isAdmin && !isEditing && (
                  <button
                    onClick={onStartEdit}
                    title={t('guide.edit')}
                    aria-label={t('guide.edit')}
                    className="shrink-0 text-muted hover:text-coral transition-colors mt-0.5"
                  >
                    <SquarePen size={14} />
                  </button>
                )}
              </div>

              {isAdmin && isEditing && (
                <div className="flex flex-col gap-2 mt-1">
                  <label className="text-[10px] text-muted uppercase tracking-widest">{t('guide.labelEn')}</label>
                  <textarea
                    value={draftEn}
                    onChange={e => setDraftEn(e.target.value)}
                    rows={2}
                    className="bg-surface border border-dim rounded-sm px-3 py-2 text-[12.5px] text-neutral outline-none focus:border-coral/40 transition-colors resize-y"
                  />
                  <label className="text-[10px] text-muted uppercase tracking-widest">{t('guide.labelTh')}</label>
                  <textarea
                    value={draftTh}
                    onChange={e => setDraftTh(e.target.value)}
                    rows={2}
                    className="bg-surface border border-dim rounded-sm px-3 py-2 text-[12.5px] text-neutral outline-none focus:border-coral/40 transition-colors resize-y"
                  />
                  {saveError && <p className="text-[11px] text-rose">{saveError}</p>}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={onSave}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-sm text-[12px] font-medium bg-coral/15 text-coral border border-coral/20 hover:bg-coral/25 transition-colors disabled:opacity-50"
                    >
                      {t('guide.save')}
                    </button>
                    <button
                      onClick={onCancelEdit}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-sm text-[12px] text-muted hover:text-neutral hover:bg-ghost border border-dim transition-colors disabled:opacity-50"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function TopicGif({ topicNumber }: { topicNumber: number }) {
  const [hasError, setHasError] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    setHasError(false)
    setIsFullScreen(false)
  }, [topicNumber])

  useEffect(() => {
    if (!isFullScreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen])

  if (hasError) return null

  return (
    <>
      <div className="mt-6 w-full">
        <div 
          onClick={() => setIsFullScreen(true)}
          className="relative group cursor-zoom-in overflow-hidden rounded-lg border border-dim shadow-sm bg-neutral-100 w-full h-auto"
        >
          <img
            src={`/gif/${topicNumber}.gif`}
            alt={`Topic ${topicNumber} walkthrough`}
            className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.01]"
            onError={() => setHasError(true)}
          />
          {/* Hover overlay indicator */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-200">
            <span className="bg-black/75 text-white text-[12px] font-medium px-3.5 py-2 rounded-full flex items-center gap-1.5 backdrop-blur-sm shadow-md">
              <Maximize2 size={13} />
              Click to view full screen
            </span>
          </div>
        </div>
      </div>

      {isFullScreen && (
        <div 
          onClick={() => setIsFullScreen(false)}
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setIsFullScreen(false)
            }}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
            aria-label="Close fullscreen view"
          >
            <X size={20} />
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[85vh] flex items-center justify-center"
          >
            <img
              src={`/gif/${topicNumber}.gif`}
              alt={`Topic ${topicNumber} walkthrough (Fullscreen)`}
              className="max-w-full max-h-[85vh] rounded-md shadow-2xl object-contain border border-white/10 cursor-default"
            />
          </div>
        </div>
      )}
    </>
  )
}
