// src/components/calling/CallButton.tsx
import { Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { selectIsOnCall, selectCallStatus } from '@/Redux/callSlice'   // ← CORRECT PATH
import { usePiopiyContext } from '@/context/PiopiyContext'
import { cn } from '@/lib/utils'

interface CallButtonProps {
  candidatePhone?: string | null
  candidateId?: string
  candidateName?: string
  variant?: 'icon' | 'pill'
  className?: string
}

export default function CallButton({
  candidatePhone, candidateId, candidateName, variant = 'icon', className,
}: CallButtonProps) {
  const isOnCall   = useSelector(selectIsOnCall)
  const callStatus = useSelector(selectCallStatus)
  const { makeCall, isReady } = usePiopiyContext()

  const canCall = isReady && !isOnCall && callStatus === 'AVAILABLE' && !!candidatePhone

  const handleClick = async () => {
    if (!candidatePhone) { toast.error('No phone number for this candidate'); return }
    if (!isReady)        { toast.error('Calling system not ready — check telephony settings'); return }
    if (isOnCall)        { toast.error('Already on an active call'); return }
    if (callStatus !== 'AVAILABLE') { toast.error('Set your status to Available to make calls'); return }
    const ok = await makeCall(candidatePhone, { candidateId, candidateName })
    if (!ok) toast.error('Failed to initiate call — please try again')
  }

  const tooltip = !candidatePhone        ? 'No phone number'
    : !isReady                           ? 'Calling not configured — set up telephony in Settings'
    : isOnCall                           ? 'Already on a call'
    : callStatus !== 'AVAILABLE'         ? `Set status to Available (currently ${callStatus})`
    : candidateName                      ? `Call ${candidateName}`
    : 'Call candidate'

  if (variant === 'pill') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm" onClick={handleClick} disabled={!canCall}
            className={cn(
              'h-8 gap-1.5 rounded-full text-xs font-medium',
              canCall ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
              className
            )}
          >
            <Phone className="h-3.5 w-3.5" /> Call
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleClick} disabled={!canCall}
          className={cn(
            'h-7 w-7 rounded-full transition-colors',
            canCall ? 'hover:bg-emerald-50 text-emerald-600' : 'text-slate-300 cursor-not-allowed',
            className
          )}
        >
          {isOnCall ? <PhoneOff className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  )
}