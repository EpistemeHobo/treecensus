import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Map } from 'lucide-react'

// Leaflet is loaded client-side only to avoid SSR issues.
// The actual map component will be created in Milestone 8.

export default function MapsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Map View"
        subtitle="Geographic distribution of tree census records"
        actions={
          <div className="flex gap-2">
            <Badge variant="default">Leaflet.js</Badge>
            <Badge variant="warning">Milestone 8</Badge>
          </div>
        }
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        <Card className="flex-1">
          <div
            className="flex flex-col items-center justify-center gap-4 border border-dashed border-white/[0.08] rounded-sm"
            style={{ minHeight: 480 }}
          >
            <Map size={36} className="text-muted opacity-30" />
            <div className="text-center">
              <p className="text-[15px] text-muted font-medium">Interactive map — coming in Milestone 8</p>
              <p className="text-[13px] text-muted/60 mt-1 max-w-sm">
                Tree locations will be plotted on a Leaflet map with species filters
                and site boundary overlays once BigQuery is connected.
              </p>
            </div>
          </div>
        </Card>

        {/* Filter panel placeholder */}
        <Card>
          <h3 className="text-[13px] font-semibold text-neutral mb-3">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Site', 'Species', 'Condition', 'Date range'].map(f => (
              <div key={f} className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-sm flex items-center px-3 text-[13px] text-muted/50">
                {f}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
