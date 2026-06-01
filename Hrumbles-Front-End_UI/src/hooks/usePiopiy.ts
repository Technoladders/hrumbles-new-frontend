// src/hooks/usePiopiy.ts
// ============================================================
// Core Piopiy WebRTC SDK hook
// Manages entire SDK lifecycle: login, call state, events
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '@/integrations/supabase/client'
import {
  setSdkReady, setSdkError, setCallState,
  setIncomingCall, setActiveCall, setCallEnded,
  setMuted, setOnHold, incrementMissedCalls,
  selectCallState, selectIsOnCall,
  CallState,
} from '@/Redux/callSlice'

// Dynamic import — piopiyjs ships as CJS/ESM
let PIOPIY: any = null
async function loadPiopiy() {
  if (PIOPIY) return PIOPIY
  const mod = await import('piopiyjs')
  PIOPIY = mod.default || mod
  return PIOPIY
}

interface UsePiopiyOptions {
  onIncoming?: (from: string) => void
  onAnswered?: () => void
  onEnded?: (duration: number) => void
}

interface MakeCallOptions {
  candidateId?: string
  candidateName?: string
  cdrId?: string
}

export function usePiopiy(options: UsePiopiyOptions = {}) {
  const dispatch = useDispatch()
  const callState = useSelector(selectCallState)
  const isOnCall  = useSelector(selectIsOnCall)

  const piopiyRef   = useRef<any>(null)
  const startTimeRef = useRef<number>(0)
  const currentCallRef = useRef<{
    candidateId?: string
    candidateName?: string
    cdrId?: string
    direction: 'inbound' | 'outbound'
    to?: string
  } | null>(null)

  // ── Initialize SDK + Login ──────────────────────────────────
  const initAndLogin = useCallback(async () => {
    try {
      // Fetch employee telephony credentials
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: emp, error } = await supabase
        .from('hr_employees')
        .select('telecmi_agent_id, telecmi_password, organization_id')
        .eq('id', user.id)
        .single()

      if (error || !emp?.telecmi_agent_id || !emp?.telecmi_password) {
        // Not provisioned — SDK won't load, that's fine
        console.log('[Piopiy] Employee not provisioned, skipping SDK init')
        return
      }

      // Get SBC URI from org config
      const { data: cfg } = await supabase
        .from('telecmi_routing_config')
        .select('sbc_uri')
        .eq('organization_id', emp.organization_id)
        .single()

      const sbcUri = cfg?.sbc_uri || 'sbcind.telecmi.com'

      const PiopiyClass = await loadPiopiy()
      const piopiy = new PiopiyClass({
        name: user.email || emp.telecmi_agent_id,
        debug: import.meta.env.DEV,
        autoplay: true,
        ringTime: 60,
      })

      // ── Event Handlers ──────────────────────────────────────

      piopiy.on('login', (obj: any) => {
        if (obj.code === 200) {
          dispatch(setSdkReady(true))
          console.log('[Piopiy] Logged in:', emp.telecmi_agent_id)
        }
      })

      piopiy.on('loginFailed', (obj: any) => {
        dispatch(setSdkError(`Login failed (${obj.code}): Check TeleCMI credentials`))
        console.error('[Piopiy] Login failed:', obj)
      })

      piopiy.on('trying', () => {
        dispatch(setCallState('connecting'))
      })

      piopiy.on('ringing', (obj: any) => {
        if (obj.code === 183) {
          if (obj.type === 'outgoing') {
            dispatch(setCallState('ringing_out'))
          } else {
            // Incoming ring
            const from = obj.from || obj.number || 'Unknown'
            dispatch(setIncomingCall({ from }))
            options.onIncoming?.(from)
            // Browser notification for missed call guard
            if (Notification.permission === 'granted') {
              new Notification('📞 Incoming Call', {
                body: `From: ${from}`,
                icon: '/favicon.ico',
              })
            }
          }
        }
      })

      piopiy.on('inComingCall', (obj: any) => {
        const from = obj.from || obj.number || 'Unknown'
        dispatch(setIncomingCall({ from }))
        options.onIncoming?.(from)
      })

      piopiy.on('answered', (obj: any) => {
        if (obj.code === 200) {
          startTimeRef.current = Date.now()
          dispatch(setActiveCall({
            to: currentCallRef.current?.to || '',
            candidateId: currentCallRef.current?.candidateId,
            candidateName: currentCallRef.current?.candidateName,
            cdrId: currentCallRef.current?.cdrId,
            callId: piopiy.getCallId?.(),
            startedAt: startTimeRef.current,
            direction: currentCallRef.current?.direction || 'outbound',
          }))
          options.onAnswered?.()
        }
      })

      piopiy.on('hold', (obj: any) => {
        if (obj.code === 200) dispatch(setOnHold(true))
      })

      piopiy.on('unhold', (obj: any) => {
        if (obj.code === 200) dispatch(setOnHold(false))
      })

      piopiy.on('hangup', (obj: any) => {
        const duration = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000)
          : 0
        const outcome = mapHangupReason(obj.code)
        dispatch(setCallEnded({ duration, outcome }))
        currentCallRef.current = null
        startTimeRef.current = 0
        options.onEnded?.(duration)
      })

      piopiy.on('ended', (obj: any) => {
        const duration = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000)
          : 0

        // Missed call detection
        if (obj.code !== 200 && !isOnCall) {
          dispatch(incrementMissedCalls())
        }

        const outcome = mapHangupReason(obj.code)
        dispatch(setCallEnded({ duration, outcome }))
        currentCallRef.current = null
        startTimeRef.current = 0
        options.onEnded?.(duration)
      })

      piopiy.on('error', (obj: any) => {
        console.error('[Piopiy] Error:', obj)
        if (obj.code === 1001 || obj.code === 1002) {
          dispatch(setSdkError('SDK error — check microphone permissions'))
        }
      })

      piopiy.on('callStream', () => {
        // Audio stream established — update Redux if needed
      })

      // ── Login ─────────────────────────────────────────────
      piopiy.login(emp.telecmi_agent_id, emp.telecmi_password, sbcUri)
      piopiyRef.current = piopiy

    } catch (err: any) {
      dispatch(setSdkError(err.message || 'Failed to initialize calling SDK'))
      console.error('[Piopiy] Init error:', err)
    }
  }, [dispatch])

  // ── Auto-init on mount ──────────────────────────────────────
  useEffect(() => {
    // Request mic permission early
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => initAndLogin())
      .catch(() => dispatch(setSdkError('Microphone permission denied. Please allow mic access to make/receive calls.')))

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      // Logout on unmount (page close)
      if (piopiyRef.current) {
        try { piopiyRef.current.logout() } catch { /* ignore */ }
      }
    }
  }, [initAndLogin])

  // ── Public API ──────────────────────────────────────────────

  const makeCall = useCallback(async (
    phone: string,
    opts: MakeCallOptions = {}
  ) => {
    if (!piopiyRef.current) {
      console.error('[Piopiy] SDK not ready')
      return false
    }

    try {
      // Call edge function to pre-create CDR + set is_on_call
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telecmi-outbound`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            candidate_id: opts.candidateId,
            candidate_phone: phone,
          }),
        }
      )

      const result = await res.json()
      if (!res.ok) {
        console.error('[makeCall] telecmi-outbound error:', result.error)
        return false
      }

      currentCallRef.current = {
        candidateId: opts.candidateId,
        candidateName: opts.candidateName,
        cdrId: result.cdr_id,
        direction: 'outbound',
        to: result.phone_to_call || phone,
      }

      dispatch(setCallState('connecting'))

      piopiyRef.current.call(result.phone_to_call || phone, {
        extra_param: result.extra_params,
      })

      return true
    } catch (err) {
      console.error('[makeCall] Error:', err)
      return false
    }
  }, [dispatch])

  const answer = useCallback(() => {
    if (!piopiyRef.current) return
    currentCallRef.current = {
      ...(currentCallRef.current || {}),
      direction: 'inbound',
    }
    piopiyRef.current.answer()
  }, [])

  const reject = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.reject()
  }, [])

  const hangup = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.terminate()
  }, [])

  const hold = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.hold()
  }, [])

  const unHold = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.unHold()
  }, [])

  const mute = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.mute()
    dispatch(setMuted(true))
  }, [dispatch])

  const unMute = useCallback(() => {
    if (!piopiyRef.current) return
    piopiyRef.current.unMute()
    dispatch(setMuted(false))
  }, [dispatch])

  const transfer = useCallback((extensionOrPhone: string) => {
    if (!piopiyRef.current) return
    piopiyRef.current.transfer(extensionOrPhone)
  }, [])

  const sendDtmf = useCallback((tone: string) => {
    if (!piopiyRef.current) return
    piopiyRef.current.sendDtmf(tone)
  }, [])

  const getCallId = useCallback((): string | null => {
    return piopiyRef.current?.getCallId?.() || null
  }, [])

  return {
    isReady: !!piopiyRef.current,
    makeCall,
    answer,
    reject,
    hangup,
    hold,
    unHold,
    mute,
    unMute,
    transfer,
    sendDtmf,
    getCallId,
  }
}

// Map TeleCMI hangup codes to human-readable outcomes
function mapHangupReason(code: number): string {
  const map: Record<number, string> = {
    200: 'Completed',
    408: 'No Answer (Timeout)',
    480: 'Temporarily Unavailable',
    484: 'Address Incomplete',
    486: 'Busy',
  }
  return map[code] || `Call Ended (${code})`
}