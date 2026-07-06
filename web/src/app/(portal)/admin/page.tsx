import { TopBar } from '@/components/layout/TopBar'
import { MangroveCard } from '@/components/ui/MangroveCard'
import { Badge } from '@/components/ui/Badge'
import { Shield } from 'lucide-react'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { AuditPanel } from '@/components/admin/AuditPanel'

const ROLE_DESCRIPTIONS: Record<string, string> = {
  field_user:   'Form collection only — no portal access',
  data_viewer:  'Read-only: table view, filter, CSV export',
  data_manager: 'Data Viewer + record editing, report generation',
  analyst:      'Data Manager + SQL interface, saved queries',
  admin:        'Full access including user management and audit logs',
}

export default function AdminPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Admin"
        subtitle="User management, audit logs, and system configuration"
        actions={<Badge variant="coral">Admin only</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        <UsersPanel />

        <MangroveCard seed={128} subtle>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">
            <span className="flex items-center gap-2"><Shield size={14} className="text-coral/90" /> Role Matrix</span>
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <div key={role} className="flex items-start gap-4 py-3 border-b border-white/[0.04] last:border-0">
                <Badge variant={role === 'admin' ? 'coral' : role === 'analyst' ? 'violet' : 'default'}>
                  {role.replace('_', ' ')}
                </Badge>
                <span className="text-[13px] text-neutral">{desc}</span>
              </div>
            ))}
          </div>
        </MangroveCard>

        <AuditPanel />
      </div>
    </div>
  )
}
