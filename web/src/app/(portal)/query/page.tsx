'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Play, Save, Clock } from 'lucide-react'
import type { QueryResult } from '@/types'

const EXAMPLE_QUERIES = [
  { label: 'Tree count by species', sql: 'SELECT speciesCode, COUNT(*) AS count\nFROM `PROJECT.tree_census.trees`\nGROUP BY speciesCode\nORDER BY count DESC\nLIMIT 20' },
  { label: 'Trees by site condition', sql: 'SELECT siteId, condition, COUNT(*) AS count\nFROM `PROJECT.tree_census.trees`\nGROUP BY siteId, condition\nORDER BY siteId, condition' },
  { label: 'Recent submissions', sql: 'SELECT submissionId, submittedAt, status, treeCount\nFROM `PROJECT.tree_census.submissions`\nORDER BY submittedAt DESC\nLIMIT 50' },
]

export default function QueryPage() {
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [execMs, setExecMs] = useState<number | null>(null)

  async function runQuery() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json.data)
      setExecMs(json.data.executionMs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const resultColumns = result?.columns.map(c => ({ key: c, label: c })) ?? []

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="SQL Query"
        subtitle="Run direct queries against the BigQuery dataset"
        actions={<Badge variant="violet">Analyst+</Badge>}
      />

      <div className="flex-1 p-8 flex flex-col gap-6 overflow-auto">
        <div className="flex gap-2 flex-wrap">
          {EXAMPLE_QUERIES.map(q => (
            <button
              key={q.label}
              onClick={() => setSql(q.sql)}
              className="text-[12px] text-muted hover:text-neutral border border-dim hover:border-dim px-3 py-1.5 rounded-sm transition-colors bg-ghost hover:bg-dim"
            >
              {q.label}
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-muted uppercase tracking-widest font-semibold">SQL Editor</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm"><Save size={13} />Save</Button>
              <Button size="sm" onClick={runQuery} loading={loading}><Play size={13} />Run</Button>
            </div>
          </div>
          <textarea
            value={sql}
            onChange={e => setSql(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full bg-bg border border-dim rounded-sm px-4 py-3 font-mono text-[13px] text-neutral/80 outline-none focus:border-coral/30 resize-y transition-colors"
          />
          <p className="text-[11px] text-muted/50 mt-2">Only SELECT statements are permitted. 1 GB byte budget cap per query.</p>
        </Card>

        {error && (
          <Card className="border-rose/20">
            <p className="text-[13px] text-rose">{error}</p>
          </Card>
        )}

        {result && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[14px] font-semibold text-neutral">{result.rowCount.toLocaleString()} rows</span>
              {execMs != null && (
                <span className="flex items-center gap-1 text-[12px] text-muted">
                  <Clock size={11} />{execMs}ms
                </span>
              )}
              <Button variant="secondary" size="sm" className="ml-auto">Export CSV</Button>
            </div>
            <Table columns={resultColumns} rows={result.rows as Record<string, unknown>[]} emptyMessage="Query returned no rows." />
          </Card>
        )}

        {!result && !error && !loading && (
          <div className="flex items-center justify-center h-32 text-muted text-[13px]">
            Run a query to see results
          </div>
        )}
      </div>
    </div>
  )
}
