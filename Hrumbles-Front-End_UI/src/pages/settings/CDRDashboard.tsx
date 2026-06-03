// src/pages/settings/CDRDashboard.tsx
// ============================================================
// Call Detail Records dashboard
// Filterable table with recording playback, routing audit trail
// ============================================================

import { useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
  Voicemail, Play, Pause, ChevronDown, ChevronRight,
  Download, Search, Filter, RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  answered:    { label: 'Answered',    color: 'bg-emerald-100 text-emerald-700', Icon: Phone        },
  missed:      { label: 'Missed',      color: 'bg-red-100 text-red-600',         Icon: PhoneMissed  },
  voicemail:   { label: 'Voicemail',   color: 'bg-blue-100 text-blue-700',       Icon: Voicemail    },
  blocked:     { label: 'Blocked',     color: 'bg-slate-100 text-slate-500',     Icon: PhoneOff     },
  after_hours: { label: 'After Hours', color: 'bg-amber-100 text-amber-700',     Icon: PhoneOff     },
  initiated:   { label: 'Initiated',   color: 'bg-violet-100 text-violet-700',   Icon: Phone        },
  routing:     { label: 'Routing...',  color: 'bg-slate-100 text-slate-500',     Icon: Phone        },
}

export default function CDRDashboard() {
  const orgId = useSelector((s: any) => s.auth.organization_id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['telecmi-cdr', orgId, statusFilter, directionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('telecmi_cdr')
        .select(`
          *,
          employee:employee_id ( id, first_name, last_name ),
          candidate:candidate_id ( id, candidate_name, phone )
        `, { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (directionFilter !== 'all') query = query.eq('direction', directionFilter)

      const { data, count, error } = await query
      if (error) throw error
      return { rows: data || [], total: count || 0 }
    },
  })

  const rows = (data?.rows || []).filter((r: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.from_number?.includes(s) ||
      r.to_number?.includes(s) ||
      r.candidate?.candidate_name?.toLowerCase().includes(s) ||
      r.employee?.first_name?.toLowerCase().includes(s) ||
      r.agent_id?.toLowerCase().includes(s)
    )
  })

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Call Logs (CDR)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.total || 0} total records
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search number, candidate, recruiter..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={v => { setDirectionFilter(v); setPage(0) }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Date/Time', 'Direction', 'From', 'To', 'Recruiter', 'Candidate', 'Duration', 'Status', 'Recording', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No call records found
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <CDRRow key={row.id} row={row} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CDR Row with expand + recording player ────────────────────
function CDRRow({ row }: { row: any }) {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.routing
  const StatusIcon = cfg.Icon

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const duration = row.duration_sec
    ? `${Math.floor(row.duration_sec / 60)}:${String(row.duration_sec % 60).padStart(2, '0')}`
    : '—'

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
          {row.created_at
            ? format(new Date(row.created_at), 'MMM d, HH:mm')
            : '—'}
        </td>
        <td className="px-4 py-3">
          {row.direction === 'inbound'
            ? <span className="flex items-center gap-1 text-blue-600 text-xs"><PhoneIncoming className="h-3 w-3" /> In</span>
            : <span className="flex items-center gap-1 text-violet-600 text-xs"><PhoneOutgoing className="h-3 w-3" /> Out</span>
          }
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.from_number || '—'}</td>
        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.to_number || '—'}</td>
        <td className="px-4 py-3 text-sm">
          {row.employee
            ? <span>{row.employee.first_name} {row.employee.last_name}</span>
            : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-4 py-3 text-sm">
          {row.candidate
            ? <span className="text-violet-700 font-medium">{row.candidate.candidate_name}</span>
            : <span className="text-slate-400">Unknown</span>}
        </td>
        <td className="px-4 py-3 font-mono text-sm">{duration}</td>
        <td className="px-4 py-3">
          <Badge className={cn('text-xs gap-1', cfg.color)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {cfg.label}
          </Badge>
        </td>
        <td className="px-4 py-3">
          {row.recording_url ? (
            <button
              onClick={e => { e.stopPropagation(); togglePlay() }}
              className="flex items-center gap-1 text-violet-600 hover:text-violet-800 text-xs font-medium"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          ) : row.voicemail_file ? (
            <span className="text-blue-500 text-xs flex items-center gap-1">
              <Voicemail className="h-3 w-3" /> VM
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
          {row.recording_url && (
            <audio
              ref={audioRef}
              src={row.recording_url}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}
        </td>
        <td className="px-4 py-3">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </td>
      </tr>

      {/* Expanded routing path */}
      {expanded && (
        <tr>
          <td colSpan={10} className="px-4 pb-3 bg-slate-50">
            <div className="pt-2 space-y-2">
              {/* Routing audit trail */}
              {row.routing_path?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Routing Audit Trail
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(row.routing_path as string[]).map((step: string, i: number) => (
                      <span
                        key={i}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-mono',
                          step.includes('REJECTED') || step.includes('blocked') ? 'bg-red-100 text-red-700'
                          : step.includes('FOUND') || step.includes('answered') ? 'bg-emerald-100 text-emerald-700'
                          : step.includes('AVAILABLE') ? 'bg-violet-100 text-violet-700'
                          : step.includes('fallback') || step.includes('voicemail') ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {i + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* IVR / team info */}
              <div className="flex gap-4 text-xs text-slate-500">
                {row.ivr_name && <span>IVR: <strong>{row.ivr_name}</strong></span>}
                {row.team_name && <span>Team: <strong>{row.team_name}</strong></span>}
                {row.hangup_reason && <span>Hangup: <strong>{row.hangup_reason}</strong></span>}
                <span>UUID: <code className="text-[10px]">{row.call_uuid}</code></span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}