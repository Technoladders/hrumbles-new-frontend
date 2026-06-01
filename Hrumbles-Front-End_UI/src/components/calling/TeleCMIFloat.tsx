// src/components/calling/TeleCMIFloat.tsx
// ============================================================
// Persistent floating call widget — mounted in App.jsx
// Follows same pattern as V2WhatsAppFloat.tsx
// 4 states: idle pill | ringing incoming | active call | post-call dialog
// ============================================================

import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Phone, PhoneOff, PhoneIncoming, MicOff, Mic,
  PauseCircle, PlayCircle, ArrowRightLeft, X,
  Volume2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { usePiopiyContext } from '@/context/PiopiyContext'
import CallDurationTimer from './CallDurationTimer'
import {
  selectCallState, selectIncoming, selectActiveCall,
  selectLastSummary, selectIsMuted, selectIsOnHold,
  clearLastCallSummary,
} from '@/Redux/callSlice'
import { supabase } from '@/integrations/supabase/client'

export default function TeleCMIFloat() {
  const dispatch    = useDispatch()
  const callState   = useSelector(selectCallState)
  const incoming    = useSelector(selectIncoming)
  const activeCall  = useSelector(selectActiveCall)
  const lastSummary = useSelector(selectLastSummary)
  const isMuted     = useSelector(selectIsMuted)
  const isOnHold    = useSelector(selectIsOnHold)

  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')
  const [showPostCallDialog, setShowPostCallDialog] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const { answer, reject, hangup, hold, unHold, mute, unMute, transfer } = usePiopiyContext()

  // Show post-call dialog when lastSummary arrives
  useEffect(() => {
    if (lastSummary) {
      setShowPostCallDialog(true)
      setShowTransfer(false)
      setMinimized(false)
    }
  }, [lastSummary])

  const handleTransfer = () => {
    if (!transferTarget.trim()) return
    transfer(transferTarget.trim())
    toast.success(`Transferring to ${transferTarget}`)
    setShowTransfer(false)
    setTransferTarget('')
  }

  const handlePostCallClose = () => {
    setShowPostCallDialog(false)
    dispatch(clearLastCallSummary())
  }

  // Don't render anything if idle and no summary
  if (callState === 'idle' && !lastSummary) return null

  return createPortal(
    <>
      {/* ── Post-call summary dialog ─────────────────────────── */}
      <PostCallDialog
        open={showPostCallDialog}
        summary={lastSummary}
        onClose={handlePostCallClose}
      />

      {/* ── Float widget ────────────────────────────────────── */}
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            key="telecmi-float"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed z-[9999] right-6',
              'bottom-6', // above page content; adjust if WhatsApp float is also present → use bottom-24
            )}
            style={{ maxWidth: 320 }}
          >
            {/* Incoming Call */}
            {callState === 'ringing_in' && incoming && (
              <IncomingCallCard
                from={incoming.from}
                candidateName={incoming.candidateName}
                onAnswer={answer}
                onReject={reject}
              />
            )}

            {/* Connecting / Ringing Out */}
            {(callState === 'connecting' || callState === 'ringing_out') && (
              <ConnectingCard
                to={activeCall?.to || ''}
                candidateName={activeCall?.candidateName}
                onHangup={hangup}
              />
            )}

            {/* Active Call */}
            {(callState === 'active' || callState === 'on_hold') && activeCall && (
              <ActiveCallCard
                activeCall={activeCall}
                isMuted={isMuted}
                isOnHold={isOnHold}
                minimized={minimized}
                showTransfer={showTransfer}
                transferTarget={transferTarget}
                onMuteToggle={() => isMuted ? unMute() : mute()}
                onHoldToggle={() => isOnHold ? unHold() : hold()}
                onHangup={hangup}
                onMinimize={() => setMinimized(v => !v)}
                onTransferToggle={() => setShowTransfer(v => !v)}
                onTransferTargetChange={setTransferTarget}
                onTransferConfirm={handleTransfer}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}

// ── Incoming Call Card ────────────────────────────────────────
function IncomingCallCard({
  from, candidateName, onAnswer, onReject,
}: {
  from: string
  candidateName?: string
  onAnswer: () => void
  onReject: () => void
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-72"
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      {/* Green header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center gap-2">
        <div className="relative">
          <PhoneIncoming className="h-5 w-5 text-white" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full animate-ping" />
        </div>
        <span className="text-white font-semibold text-sm">Incoming Call</span>
      </div>

      <div className="p-4">
        <p className="text-slate-800 font-semibold text-base truncate">
          {candidateName || from}
        </p>
        {candidateName && (
          <p className="text-slate-500 text-xs mt-0.5 font-mono">{from}</p>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-full h-11 gap-2"
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </Button>
          <Button
            onClick={onAnswer}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-11 gap-2"
          >
            <Phone className="h-4 w-4" />
            Answer
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Connecting Card ───────────────────────────────────────────
function ConnectingCard({
  to, candidateName, onHangup,
}: {
  to: string
  candidateName?: string
  onHangup: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-64">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
        <Phone className="h-4 w-4 text-white animate-pulse" />
        <span className="text-white font-medium text-sm">Calling...</span>
      </div>
      <div className="p-4 text-center">
        <p className="text-slate-800 font-medium truncate">{candidateName || to}</p>
        {candidateName && <p className="text-slate-400 text-xs font-mono mt-0.5">{to}</p>}
        <div className="flex justify-center gap-1.5 mt-3 mb-4">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 bg-violet-400 rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <Button
          onClick={onHangup}
          className="w-full bg-red-500 hover:bg-red-600 text-white rounded-full gap-2"
          size="sm"
        >
          <PhoneOff className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Active Call Card ──────────────────────────────────────────
function ActiveCallCard({
  activeCall, isMuted, isOnHold, minimized,
  showTransfer, transferTarget,
  onMuteToggle, onHoldToggle, onHangup, onMinimize,
  onTransferToggle, onTransferTargetChange, onTransferConfirm,
}: any) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-72">
      {/* Header */}
      <div className={cn(
        'px-4 py-3 flex items-center gap-2',
        isOnHold
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600'
      )}>
        <div className={cn('h-2 w-2 rounded-full', isOnHold ? 'bg-white opacity-60' : 'bg-emerald-300 animate-pulse')} />
        <span className="text-white font-medium text-sm flex-1">
          {isOnHold ? 'On Hold' : 'Active Call'}
        </span>
        <CallDurationTimer
          startedAt={activeCall.startedAt}
          paused={isOnHold}
          className="text-white/90 text-xs"
        />
        <button onClick={onMinimize} className="text-white/60 hover:text-white ml-1">
          <ChevronDown className={cn('h-4 w-4 transition-transform', minimized && 'rotate-180')} />
        </button>
      </div>

      {/* Caller info */}
      <div className={cn('overflow-hidden transition-all', minimized ? 'max-h-0' : 'max-h-96')}>
        <div className="px-4 pt-3 pb-1">
          <p className="font-semibold text-slate-800 truncate">
            {activeCall.candidateName || activeCall.to}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {activeCall.candidateName && (
              <p className="text-slate-400 text-xs font-mono">{activeCall.to}</p>
            )}
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {activeCall.direction === 'inbound' ? '↙ Inbound' : '↗ Outbound'}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 pb-3 mt-3">
          <div className="flex justify-between items-center">
            {/* Mute */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onMuteToggle}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-colors',
                    isMuted ? 'bg-red-50 text-red-500' : 'hover:bg-slate-100 text-slate-600'
                  )}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span className="text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? 'Unmute' : 'Mute microphone'}</TooltipContent>
            </Tooltip>

            {/* Hold */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onHoldToggle}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-colors',
                    isOnHold ? 'bg-amber-50 text-amber-600' : 'hover:bg-slate-100 text-slate-600'
                  )}
                >
                  {isOnHold ? <PlayCircle className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
                  <span className="text-[10px]">{isOnHold ? 'Resume' : 'Hold'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{isOnHold ? 'Resume call' : 'Put on hold'}</TooltipContent>
            </Tooltip>

            {/* Transfer */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onTransferToggle}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-colors',
                    showTransfer ? 'bg-violet-50 text-violet-600' : 'hover:bg-slate-100 text-slate-600'
                  )}
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  <span className="text-[10px]">Transfer</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Transfer call</TooltipContent>
            </Tooltip>

            {/* Hangup */}
            <button
              onClick={onHangup}
              className="flex flex-col items-center gap-1 p-2 rounded-xl w-16 bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
            >
              <PhoneOff className="h-5 w-5" />
              <span className="text-[10px]">End</span>
            </button>
          </div>

          {/* Transfer input */}
          <AnimatePresence>
            {showTransfer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <Input
                    value={transferTarget}
                    onChange={e => onTransferTargetChange(e.target.value)}
                    placeholder="Extension or phone..."
                    className="h-8 text-sm"
                    onKeyDown={e => e.key === 'Enter' && onTransferConfirm()}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={onTransferConfirm}
                    disabled={!transferTarget.trim()}
                    className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Transfer
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Post-Call Summary Dialog ──────────────────────────────────
function PostCallDialog({ open, summary, onClose }: {
  open: boolean; summary: any; onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  // Get org_id from Redux — needed for RLS policy
  const orgId = useSelector((s: any) => s.auth.organization_id)

  const saveNotes = async () => {
    if (!notes.trim() || !summary?.candidateId) { onClose(); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('hr_candidate_activities').insert({
        candidate_id:    summary.candidateId,
        organization_id: orgId,               // ← FIXES RLS violation
        created_by:      user?.id || null,
        type:            'note',
        title:           'Post-call note',
        description:     notes,
        activity_date:   new Date().toISOString(),
        metadata:        {
          linked_cdr_id: summary.cdrId,
          source:        'post_call_dialog',
        },
      })
      if (error) throw error
      toast.success('Post-call note saved')
    } catch (e: any) {
      console.error('Save note error:', e)
      toast.error('Failed to save note: ' + (e.message || 'unknown error'))
    } finally {
      setSaving(false)
      onClose()
    }
  }

  if (!summary) return null

  const durationStr = summary.duration > 0
    ? `${Math.floor(summary.duration / 60)}m ${summary.duration % 60}s`
    : '0s'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center',
              summary.outcome === 'Completed' ? 'bg-emerald-100' : 'bg-red-100'
            )}>
              {summary.outcome === 'Completed'
                ? <Phone className="h-4 w-4 text-emerald-600" />
                : <PhoneOff className="h-4 w-4 text-red-500" />}
            </div>
            Call Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-slate-500 text-xs">Candidate</p>
              <p className="font-medium truncate">{summary.candidateName || 'Unknown'}</p></div>
            <div><p className="text-slate-500 text-xs">Duration</p>
              <p className="font-medium font-mono">{durationStr}</p></div>
            <div><p className="text-slate-500 text-xs">Direction</p>
              <p className="font-medium capitalize">{summary.direction}</p></div>
            <div><p className="text-slate-500 text-xs">Outcome</p>
              <p className="font-medium">{summary.outcome}</p></div>
            {summary.recordingUrl && (
              <div className="col-span-2">
                <p className="text-slate-500 text-xs mb-1">Recording</p>
                <audio controls src={summary.recordingUrl} className="w-full h-8" />
              </div>
            )}
          </div>

          {summary.candidateId && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Add a quick note (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Discussed availability, strong React background..."
                className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Skip</Button>
            <Button
              onClick={saveNotes}
              disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? 'Saving...' : notes.trim() ? 'Save Note' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}