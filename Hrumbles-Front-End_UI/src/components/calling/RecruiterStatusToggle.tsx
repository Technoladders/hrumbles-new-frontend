// src/components/calling/RecruiterStatusToggle.tsx
// Always visible — even when SDK not connected.
// Recruiter must be able to set AVAILABLE before SDK loads.

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import {
  selectCallStatus, selectIsOnCall, selectMissedCount,
  setCallStatus, clearMissedCalls,
  CallStatus,
} from '@/Redux/callSlice'   // ← CORRECT PATH
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Phone, PhoneMissed, Coffee, WifiOff, Palmtree } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<CallStatus, {
  label: string; color: string; dotClass: string; Icon: any; description: string
}> = {
  AVAILABLE: { label: 'Available', color: 'text-emerald-600', dotClass: 'bg-emerald-500', Icon: Phone,   description: 'Ready to call' },
  ON_BREAK:  { label: 'On Break',  color: 'text-amber-600',   dotClass: 'bg-amber-500',   Icon: Coffee,  description: 'Calls forward to mobile' },
  OFFLINE:   { label: 'Offline',   color: 'text-slate-500',   dotClass: 'bg-slate-400',   Icon: WifiOff, description: 'Calls go to team' },
  ON_LEAVE:  { label: 'On Leave',  color: 'text-blue-500',    dotClass: 'bg-blue-400',    Icon: Palmtree,description: 'Calls go to team' },
}

export default function RecruiterStatusToggle() {
  const dispatch    = useDispatch()
  const status      = useSelector(selectCallStatus)
  const isOnCall    = useSelector(selectIsOnCall)
  const missedCount = useSelector(selectMissedCount)
  const [loading, setLoading] = useState(false)
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE

  const changeStatus = async (newStatus: CallStatus) => {
    if (newStatus === status) return
    if (isOnCall) { toast.error('Cannot change status during an active call'); return }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Optimistic update — UI feels instant
      dispatch(setCallStatus(newStatus))

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telecmi-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        // Roll back on failure
        dispatch(setCallStatus(status))
        toast.error(data.error || 'Failed to update status')
        return
      }
      toast.success(`Status: ${STATUS_CONFIG[newStatus].label}`, { duration: 1500 })
    } catch {
      dispatch(setCallStatus(status))
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={loading || isOnCall}
          className={cn(
            'relative flex items-center gap-2 px-3 py-1.5 rounded-full',
            'bg-white border border-slate-200 shadow-sm',
            'hover:bg-slate-50 transition-colors text-sm font-medium',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            cfg.color
          )}
        >
          {/* Animated dot */}
          <span className="relative flex h-2.5 w-2.5">
            {status === 'AVAILABLE' && (
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', cfg.dotClass)} />
            )}
            <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', cfg.dotClass)} />
          </span>
          <span className="hidden sm:inline">{cfg.label}</span>
          {missedCount > 0 && (
            <Badge
              onClick={e => { e.stopPropagation(); dispatch(clearMissedCalls()) }}
              className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] rounded-full cursor-pointer"
            >
              {missedCount > 9 ? '9+' : missedCount}
            </Badge>
          )}
          {loading && <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-xs text-slate-500 font-medium uppercase tracking-wide">
          Availability
        </div>
        <DropdownMenuSeparator />
        {(Object.entries(STATUS_CONFIG) as [CallStatus, typeof STATUS_CONFIG[CallStatus]][]).map(([key, c]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => changeStatus(key)}
            className={cn('flex items-start gap-3 cursor-pointer py-2.5', key === status && 'bg-slate-50')}
          >
            <span className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', c.dotClass)} />
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-medium', c.color)}>{c.label}</div>
              <div className="text-xs text-slate-400">{c.description}</div>
            </div>
            {key === status && <span className="text-[10px] text-slate-400 mt-0.5">Active</span>}
          </DropdownMenuItem>
        ))}
        {missedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => dispatch(clearMissedCalls())} className="flex items-center gap-2 text-red-500">
              <PhoneMissed className="h-3.5 w-3.5" />
              <span className="text-sm">Clear {missedCount} missed call{missedCount > 1 ? 's' : ''}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}