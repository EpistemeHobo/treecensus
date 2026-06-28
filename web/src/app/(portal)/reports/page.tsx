import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FileText, Plus } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Reports"
        subtitle="Generate, edit, and export census reports"
        actions={
          <Button size="sm">
            <Plus size={13} />
            New Report
          </Button>
        }
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">

        {/* Report list */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold text-neutral">Your Reports</h2>
            <Badge variant="warning">Milestone 9</Badge>
          </div>

          <div className="flex flex-col items-center justify-center py-14 text-muted gap-3">
            <FileText size={32} className="opacity-25" />
            <p className="text-[13px]">No reports yet.</p>
            <p className="text-[12px] opacity-60 max-w-xs text-center">
              The smart report generator will be built in Milestone 9.
              Reports support summary tables, charts, text, images, and signatures.
            </p>
          </div>
        </Card>

        {/* Report builder placeholder */}
        <Card>
          <h2 className="text-[14px] font-semibold text-neutral mb-4">Report Builder — Section Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { type: 'Summary Table', desc: 'Auto-generated from selected data' },
              { type: 'Chart',         desc: 'Bar, pie, or line chart' },
              { type: 'Map Snapshot',  desc: 'Exported map view of selected trees' },
              { type: 'Text Block',    desc: 'Manual narrative text input' },
              { type: 'Image',         desc: 'Upload field photos or diagrams' },
              { type: 'Signature',     desc: 'Digital signature field for signatories' },
            ].map(s => (
              <div
                key={s.type}
                className="border border-dashed border-white/[0.08] rounded-sm p-4 opacity-50"
              >
                <p className="text-[13px] font-medium text-neutral">{s.type}</p>
                <p className="text-[12px] text-muted mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
