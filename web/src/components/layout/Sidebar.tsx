'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/LanguageContext'
import { hasRole } from '@/lib/auth'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import type { TranslationKey } from '@/i18n/translations'
import {
  LayoutDashboard,
  TreePine,
  Map,
  FileText,
  Download,
  Shield,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: TranslationKey
  icon: React.ElementType
  minRole: UserRole
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, minRole: 'data_viewer'  },
  { href: '/data',      label: 'nav.data',      icon: TreePine,        minRole: 'data_viewer'  },
  { href: '/maps',      label: 'nav.maps',      icon: Map,             minRole: 'data_viewer'  },
  { href: '/reports',   label: 'nav.reports',   icon: FileText,        minRole: 'data_manager' },
  { href: '/export',    label: 'nav.export',    icon: Download,        minRole: 'data_viewer'  },
  { href: '/admin',     label: 'nav.admin',     icon: Shield,          minRole: 'admin'        },
  { href: '/settings',  label: 'nav.settings',  icon: SettingsIcon,    minRole: 'field_user'   },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  const visibleItems = NAV_ITEMS.filter(
    item => user && hasRole(user.role, item.minRole)
  )

  return (
    // `dark` class is fixed here — sidebar is always dark regardless of page theme
    <aside className="dark w-56 shrink-0 flex flex-col bg-surface border-r border-dim h-screen sticky top-0 overflow-y-auto relative">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-dim relative" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-coral to-violet flex items-center justify-center shrink-0 text-white">
            <TreePine size={14} className="text-white" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-neutral leading-none">{t('brand.title')}</p>
            <p className="text-[10px] text-muted mt-0.5 tracking-wider uppercase">{t('brand.portal')}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 relative" style={{ zIndex: 1 }}>
        {visibleItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-coral/10 text-coral border border-coral/10'
                  : 'text-muted hover:text-neutral hover:bg-ghost border border-transparent'
              )}
            >
              <item.icon size={15} />
              {t(item.label)}
            </Link>
          )
        })}
      </nav>

      {/* Mangrove roots — 5 sequential sets, each grows then retracts before next begins */}
      <svg
        aria-hidden
        viewBox="0 0 224 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none select-none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
      >
        <style>{`
          @keyframes rootSeq {
            0%   { stroke-dashoffset: var(--rlen); opacity: 0; }
            8%   { stroke-dashoffset: 0; opacity: var(--rfinal); }
            14%  { stroke-dashoffset: 0; opacity: var(--rfinal); }
            22%  { stroke-dashoffset: var(--rlen); opacity: 0; }
            100% { stroke-dashoffset: var(--rlen); opacity: 0; }
          }
          .mgr {
            fill: none; stroke-linecap: round; stroke-linejoin: round;
            animation: rootSeq 26s ease-in-out infinite;
            opacity: 0;
          }
          .g1 { animation-delay: 0s; }
          .g2 { animation-delay: -20.8s; }
          .g3 { animation-delay: -15.6s; }
          .g4 { animation-delay: -10.4s; }
          .g5 { animation-delay: -5.2s; }
        `}</style>

        {/* ── SET 1 — left low cluster (fires 0–4 s) ───────────── */}
        <path className="mgr g1" d="M108 900 C96 860 72 836 48 820 C28 806 12 786 18 764 C24 742 10 720 4 698"
          stroke="#CAF546" strokeWidth="2.6"
          style={{ '--rlen': 310, '--rfinal': 0.30, strokeDasharray: 310 } as React.CSSProperties} />
        <path className="mgr g1" d="M48 820 C32 800 14 788 6 768 C0 750 6 728 18 712 C28 698 22 674 12 654"
          stroke="#EBB37F" strokeWidth="1.6"
          style={{ '--rlen': 220, '--rfinal': 0.26, strokeDasharray: 220 } as React.CSSProperties} />
        <path className="mgr g1" d="M18 764 C8 742 4 716 12 692 C20 668 12 644 4 622 C0 604 4 580 14 560"
          stroke="#CAF546" strokeWidth="1.2"
          style={{ '--rlen': 240, '--rfinal': 0.22, strokeDasharray: 240 } as React.CSSProperties} />
        <path className="mgr g1" d="M62 836 C46 812 28 796 16 778 C6 762 10 740 22 722 C32 706 26 682 14 660"
          stroke="#EBB37F" strokeWidth="1.0"
          style={{ '--rlen': 230, '--rfinal': 0.20, strokeDasharray: 230 } as React.CSSProperties} />
        <path className="mgr g1" d="M4 698 C0 674 6 648 16 624 C24 602 18 576 8 552"
          stroke="#CAF546" strokeWidth="0.8"
          style={{ '--rlen': 170, '--rfinal': 0.18, strokeDasharray: 170 } as React.CSSProperties} />

        {/* ── SET 2 — right sweep (fires 4–8 s) ────────────────── */}
        <path className="mgr g2" d="M116 900 C132 860 158 834 184 808 C206 784 218 752 208 720 C200 690 212 658 220 628 C226 600 220 568 210 540"
          stroke="#CAF546" strokeWidth="2.4"
          style={{ '--rlen': 510, '--rfinal': 0.28, strokeDasharray: 510 } as React.CSSProperties} />
        <path className="mgr g2" d="M184 808 C200 784 216 756 218 724 C220 694 210 664 200 636"
          stroke="#EBB37F" strokeWidth="1.5"
          style={{ '--rlen': 220, '--rfinal': 0.24, strokeDasharray: 220 } as React.CSSProperties} />
        <path className="mgr g2" d="M210 540 C218 508 220 474 210 444 C202 416 210 386 218 358 C224 332 220 304 210 278"
          stroke="#CAF546" strokeWidth="1.3"
          style={{ '--rlen': 320, '--rfinal': 0.24, strokeDasharray: 320 } as React.CSSProperties} />
        <path className="mgr g2" d="M218 724 C222 694 222 660 214 632 C208 606 214 576 220 548 C224 522 220 494 212 468"
          stroke="#EBB37F" strokeWidth="1.0"
          style={{ '--rlen': 300, '--rfinal': 0.20, strokeDasharray: 300 } as React.CSSProperties} />
        <path className="mgr g2" d="M200 636 C206 608 208 576 200 548 C194 522 200 492 208 466"
          stroke="#CAF546" strokeWidth="0.8"
          style={{ '--rlen': 200, '--rfinal': 0.18, strokeDasharray: 200 } as React.CSSProperties} />

        {/* ── SET 3 — centre + left mid (fires 8–12 s) ─────────── */}
        <path className="mgr g3" d="M112 900 C110 840 106 780 100 720 C96 668 100 620 110 572 C118 526 112 478 102 432 C94 388 98 344 110 300"
          stroke="#CAF546" strokeWidth="2.2"
          style={{ '--rlen': 660, '--rfinal': 0.30, strokeDasharray: 660 } as React.CSSProperties} />
        <path className="mgr g3" d="M100 720 C86 694 66 674 46 660 C28 648 14 628 20 606 C26 586 14 564 4 542"
          stroke="#EBB37F" strokeWidth="1.5"
          style={{ '--rlen': 260, '--rfinal': 0.24, strokeDasharray: 260 } as React.CSSProperties} />
        <path className="mgr g3" d="M46 660 C30 638 16 614 20 588 C24 564 12 540 4 516 C0 494 4 468 14 446"
          stroke="#CAF546" strokeWidth="1.1"
          style={{ '--rlen': 240, '--rfinal': 0.22, strokeDasharray: 240 } as React.CSSProperties} />
        <path className="mgr g3" d="M20 606 C10 580 4 552 12 524 C20 498 12 470 4 444 C0 420 4 394 14 370"
          stroke="#EBB37F" strokeWidth="0.9"
          style={{ '--rlen': 270, '--rfinal': 0.20, strokeDasharray: 270 } as React.CSSProperties} />
        <path className="mgr g3" d="M110 572 C102 530 96 488 106 448 C114 410 106 370 96 332"
          stroke="#CAF546" strokeWidth="0.9"
          style={{ '--rlen': 280, '--rfinal': 0.20, strokeDasharray: 280 } as React.CSSProperties} />

        {/* ── SET 4 — right upper (fires 12–16 s) ──────────────── */}
        <path className="mgr g4" d="M210 278 C218 248 220 214 210 184 C202 156 210 124 218 96 C224 70 220 40 212 14 C208 4 210 0 212 0"
          stroke="#CAF546" strokeWidth="2.0"
          style={{ '--rlen': 340, '--rfinal': 0.28, strokeDasharray: 340 } as React.CSSProperties} />
        <path className="mgr g4" d="M212 468 C218 438 218 404 210 374 C202 346 208 314 216 286 C222 260 218 228 210 200 C204 174 208 144 216 116 C222 90 218 60 210 34"
          stroke="#EBB37F" strokeWidth="1.4"
          style={{ '--rlen': 490, '--rfinal': 0.24, strokeDasharray: 490 } as React.CSSProperties} />
        <path className="mgr g4" d="M210 374 C216 346 214 314 206 286 C200 260 206 230 214 202 C220 176 216 146 208 118 C202 92 206 62 214 36"
          stroke="#CAF546" strokeWidth="1.1"
          style={{ '--rlen': 390, '--rfinal': 0.22, strokeDasharray: 390 } as React.CSSProperties} />
        <path className="mgr g4" d="M218 286 C222 258 220 226 212 198 C206 172 212 142 220 114 C226 88 222 58 214 32"
          stroke="#EBB37F" strokeWidth="0.9"
          style={{ '--rlen': 300, '--rfinal': 0.20, strokeDasharray: 300 } as React.CSSProperties} />
        <path className="mgr g4" d="M206 200 C200 172 202 140 210 112 C216 86 212 56 206 30 C202 12 204 2 208 0"
          stroke="#CAF546" strokeWidth="0.8"
          style={{ '--rlen': 220, '--rfinal': 0.18, strokeDasharray: 220 } as React.CSSProperties} />

        {/* ── SET 5 — left upper + top whiskers (fires 16–20 s) ── */}
        <path className="mgr g5" d="M110 300 C102 262 96 222 106 184 C114 148 106 110 96 74 C88 42 94 14 106 0"
          stroke="#CAF546" strokeWidth="2.0"
          style={{ '--rlen': 380, '--rfinal': 0.28, strokeDasharray: 380 } as React.CSSProperties} />
        <path className="mgr g5" d="M14 446 C6 416 2 382 12 352 C22 324 14 292 4 262 C0 238 4 210 14 184 C22 160 16 130 6 102 C0 76 4 46 14 20 C18 6 16 0 18 0"
          stroke="#EBB37F" strokeWidth="1.4"
          style={{ '--rlen': 520, '--rfinal': 0.24, strokeDasharray: 520 } as React.CSSProperties} />
        <path className="mgr g5" d="M96 332 C88 298 82 260 92 224 C100 190 92 154 82 120 C74 88 80 54 92 24 C98 8 96 0 100 0"
          stroke="#CAF546" strokeWidth="1.2"
          style={{ '--rlen': 390, '--rfinal': 0.24, strokeDasharray: 390 } as React.CSSProperties} />
        <path className="mgr g5" d="M14 370 C6 340 2 306 10 276 C18 248 10 216 2 188 C0 168 4 144 14 120 C22 98 16 70 8 44 C2 24 6 6 12 0"
          stroke="#EBB37F" strokeWidth="1.0"
          style={{ '--rlen': 430, '--rfinal': 0.22, strokeDasharray: 430 } as React.CSSProperties} />
        <path className="mgr g5" d="M82 224 C74 190 68 154 78 120 C86 88 78 54 68 22 C62 4 64 0 68 0"
          stroke="#CAF546" strokeWidth="0.8"
          style={{ '--rlen': 270, '--rfinal': 0.20, strokeDasharray: 270 } as React.CSSProperties} />
      </svg>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-dim flex flex-col gap-1 relative" style={{ zIndex: 1 }}>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-[11px] font-bold text-violet shrink-0">
              {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-neutral truncate">{user.name ?? user.email}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">{t(`role.${user.role}` as TranslationKey)}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] text-muted hover:text-neutral hover:bg-ghost transition-all duration-150 w-full"
        >
          <LogOut size={14} />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  )
}
