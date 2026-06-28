import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { UserPlus, Shield } from 'lucide-react'

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
        actions={
          <div className="flex gap-2">
            <Badge variant="coral">Admin only</Badge>
            <Button size="sm">
              <UserPlus size={13} />
              Add User
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">

        {/* Users */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-5">Users</h2>
          <Table
            columns={[
              { key: 'name',      label: 'Name' },
              { key: 'email',     label: 'Email' },
              { key: 'role',      label: 'Role' },
              { key: 'lastLogin', label: 'Last Login' },
              { key: 'status',    label: 'Status' },
            ]}
            rows={[]}
            emptyMessage="No users yet. Users will be managed here once the auth layer is wired up."
          />
        </Card>

        {/* Role matrix */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">
            <span className="flex items-center gap-2"><Shield size={14} className="text-muted" /> Role Matrix</span>
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <div key={role} className="flex items-start gap-4 py-3 border-b border-white/[0.04] last:border-0">
                <Badge variant={role === 'admin' ? 'coral' : role === 'analyst' ? 'violet' : 'default'}>
                  {role.replace('_', ' ')}
                </Badge>
                <span className="text-[13px] text-muted">{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit log */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-5">Audit Log</h2>
          <div className="flex flex-col items-center justify-center py-10 text-muted text-[13px] gap-2">
            <p>Audit log will populate once BigQuery is connected.</p>
            <p className="text-[12px] opacity-60">Tracks all data changes, exports, and access events.</p>
          </div>
        </Card>

      </div>
    </div>
  )
}
