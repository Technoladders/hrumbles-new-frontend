// src/components/calling/CallDurationTimer.tsx
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface CallDurationTimerProps {
  startedAt: number // Unix ms
  className?: string
  paused?: boolean
}

export default function CallDurationTimer({ startedAt, className, paused = false }: CallDurationTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startedAt, paused])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  const display = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`

  return (
    <span className={cn('font-mono tabular-nums text-sm', className)}>
      {display}
    </span>
  )
}