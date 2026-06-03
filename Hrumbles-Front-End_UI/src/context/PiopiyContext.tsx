// src/context/PiopiyContext.tsx
// ============================================================
// Singleton Piopiy SDK — module-level guard prevents React
// Strict Mode double-invoke from creating 2 instances.
// ============================================================

import {
  createContext, useContext, useRef, useEffect,
  useState, useCallback, ReactNode,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '@/integrations/supabase/client'
import {
  setSdkReady, setSdkError, setCallStatus,
  setCallState, setIncomingCall, setActiveCall, setCallEnded,
  setMuted, setOnHold, incrementMissedCalls,
  selectCallState, CallStatus,
} from '@/Redux/callSlice'

interface MakeCallOptions { candidateId?: string; candidateName?: string }

interface PiopiyContextValue {
  isReady:  boolean
  makeCall: (phone: string, opts?: MakeCallOptions) => Promise<boolean>
  answer:   () => void; reject:   () => void; hangup:   () => void
  hold:     () => void; unHold:   () => void
  mute:     () => void; unMute:   () => void
  transfer: (t: string) => void; sendDtmf: (t: string) => void
}

const PiopiyContext = createContext<PiopiyContextValue | null>(null)
export const usePiopiyContext = () => {
  const ctx = useContext(PiopiyContext)
  if (!ctx) throw new Error('usePiopiyContext must be inside <PiopiyProvider>')
  return ctx
}

// ─── MODULE-LEVEL singleton guard ────────────────────────────
// React Strict Mode double-invokes useEffect in dev.
// A ref would reset between invocations — module-level does not.
let _moduleInitDone = false
let _moduleUserId: string | null = null
let _piopiyInstance: any = null

async function getPiopiyClass() {
  const mod = await import('piopiyjs')
  return mod.default || mod
}

// ─── Provider ────────────────────────────────────────────────
export function PiopiyProvider({ children }: { children: ReactNode }) {
  const dispatch  = useDispatch()
  useSelector(selectCallState) // keep subscribed
  const piopiyRef    = useRef<any>(null)
  const startTimeRef = useRef<number>(0)
  const currentCall  = useRef<{
    candidateId?: string; candidateName?: string; cdrId?: string
    direction: 'inbound' | 'outbound'; to?: string
  } | null>(null)
  const [isReady, setIsReady] = useState(false)

  const init = useCallback(async () => {
    console.log('[Piopiy] init() called. moduleInitDone:', _moduleInitDone)

    // ── Guard: only one init per page load ──────────────────
    if (_moduleInitDone) {
      console.log('[Piopiy] Already initialised — reusing existing instance')
      if (_piopiyInstance) {
        piopiyRef.current = _piopiyInstance
        // Check if already ready
        setIsReady(true)
      }
      return
    }
    _moduleInitDone = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[Piopiy] No authenticated user — skipping')
        _moduleInitDone = false
        return
      }

      // Prevent re-init for same user (e.g. from hot-reload)
      if (_moduleUserId === user.id && _piopiyInstance) {
        console.log('[Piopiy] Same user already has instance — reusing')
        piopiyRef.current = _piopiyInstance
        setIsReady(true)
        return
      }
      _moduleUserId = user.id

      // ── Load employee data ─────────────────────────────────
      const { data: emp, error: empErr } = await supabase
        .from('hr_employees')
        .select('id, telecmi_agent_id, telecmi_password, organization_id, call_status')
        .eq('id', user.id)
        .single()

      if (empErr || !emp) {
        console.log('[Piopiy] Employee not found:', empErr?.message)
        _moduleInitDone = false
        return
      }

      // ── ALWAYS sync call_status from DB ───────────────────
      const validStatuses = ['AVAILABLE','ON_BREAK','OFFLINE','ON_LEAVE']
      const dbStatus = emp.call_status as CallStatus
      console.log('[Piopiy] DB call_status:', dbStatus, '| agent_id:', emp.telecmi_agent_id)

      if (validStatuses.includes(dbStatus)) {
        dispatch(setCallStatus(dbStatus))
        console.log('[Redux] callStatus set to:', dbStatus)
      }

      // ── If not provisioned, stop but status toggle works ──
      if (!emp.telecmi_agent_id || !emp.telecmi_password) {
        console.log('[Piopiy] Not provisioned (telecmi_agent_id is null) — status toggle active, calling disabled')
        dispatch(setSdkError('Not provisioned — go to Settings → Telephony to set up calling'))
        _moduleInitDone = false
        return
      }

      // ── Get SBC URI from routing config ───────────────────
      const { data: cfg } = await supabase
        .from('telecmi_routing_config')
        .select('sbc_uri')
        .eq('organization_id', emp.organization_id)
        .single()
      const sbcUri = cfg?.sbc_uri || 'sbcind.telecmi.com'
      console.log('[Piopiy] Connecting to SBC:', sbcUri, 'agent:', emp.telecmi_agent_id)

      // ── Create SDK instance ────────────────────────────────
      const PiopiyClass = await getPiopiyClass()
      const piopiy = new PiopiyClass({
        name:     user.email || emp.telecmi_agent_id,
        debug:    false,      // set true to see SIP traffic
        autoplay: true,
        ringTime: 60,
      })

      // ── Event handlers ─────────────────────────────────────
      piopiy.on('login', (obj: any) => {
        console.log('[Piopiy] login event:', obj)
        if (obj.code === 200) {
          dispatch(setSdkReady(true))
          setIsReady(true)
          console.log('[Redux] sdkReady = true ✅')
        }
      })

      piopiy.on('loginFailed', (obj: any) => {
        console.warn('[Piopiy] loginFailed (CC system):', obj,
          '— Note: SIP may still work. This is the CC token failure, not SIP failure.')
        // Do NOT call setSdkError here for 407 — it's the CC token (monitoring),
        // not the actual calling. SIP registration happens separately.
        if (obj.code !== 407) {
          dispatch(setSdkError(`Login failed (${obj.code}): ${obj.status}`))
        }
      })

      piopiy.on('trying',   ()      => { console.log('[Piopiy] outbound: trying'); dispatch(setCallState('connecting')) })
      piopiy.on('ringing',  (obj: any) => {
        console.log('[Piopiy] ringing:', obj)
        if (obj.code !== 183) return
        if (obj.type === 'outgoing') {
          dispatch(setCallState('ringing_out'))
        } else {
          const from = obj.from || obj.number || 'Unknown'
          console.log('[Piopiy] INCOMING CALL from:', from)
          dispatch(setIncomingCall({ from }))
          currentCall.current = { direction: 'inbound', to: from }
          if (Notification.permission === 'granted') {
            new Notification('📞 Incoming Call', { body: `From: ${from}`, icon: '/favicon.ico' })
          }
        }
      })

      piopiy.on('inComingCall', (obj: any) => {
        const from = obj.from || obj.number || 'Unknown'
        console.log('[Piopiy] inComingCall from:', from)
        dispatch(setIncomingCall({ from }))
        currentCall.current = { direction: 'inbound', to: from }
      })

      piopiy.on('answered', (obj: any) => {
        console.log('[Piopiy] answered:', obj)
        if (obj.code === 200) {
          startTimeRef.current = Date.now()
          dispatch(setActiveCall({
            to:            currentCall.current?.to || '',
            candidateId:   currentCall.current?.candidateId,
            candidateName: currentCall.current?.candidateName,
            cdrId:         currentCall.current?.cdrId,
            callId:        piopiy.getCallId?.(),
            startedAt:     startTimeRef.current,
            direction:     currentCall.current?.direction || 'outbound',
          }))
        }
      })

      piopiy.on('hold',   (obj: any) => { console.log('[Piopiy] hold:', obj);   dispatch(setOnHold(true))  })
      piopiy.on('unhold', (obj: any) => { console.log('[Piopiy] unhold:', obj); dispatch(setOnHold(false)) })

      const onCallEnd = (obj: any) => {
        const dur = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
        console.log('[Piopiy] call ended. code:', obj.code, 'duration:', dur, 's')
        if (obj.code !== 200) dispatch(incrementMissedCalls())
        dispatch(setCallEnded({ duration: dur, outcome: mapCode(obj.code) }))
        currentCall.current  = null
        startTimeRef.current = 0
        // Reset is_on_call in DB (handles cases where call failed before connecting)
        resetIsOnCall()

        const candId  = currentCall.current?.candidateId
        const candDir = currentCall.current?.direction || 'outbound'
        const cdrId   = currentCall.current?.cdrId
        if (candId) {
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) return
            const { data: emp } = await supabase
              .from('hr_employees')
              .select('organization_id')
              .eq('id', session.user.id)
              .single()
            if (!emp) return

            const outcomeStr = mapCode(obj.code)
            const durationMin = Math.max(0, Math.round(dur / 60))
            const isAnswered  = obj.code === 200

            await supabase.from('hr_candidate_activities').insert({
              candidate_id:    candId,
              organization_id: emp.organization_id,
              created_by:      session.user.id,
              type:            'call',
              title:           isAnswered
                ? `${candDir === 'inbound' ? '📞' : '📲'} Call — ${Math.floor(dur/60)}m ${dur%60}s`
                : '📵 Missed Call',
              description:     `Direction: ${candDir}\nDuration: ${dur}s\nOutcome: ${outcomeStr}`,
              outcome:         outcomeStr,
              direction:       candDir,
              duration_minutes: durationMin,
              activity_date:   new Date().toISOString(),
              metadata:        {
                cdr_id:  cdrId || null,
                source:  'piopiy_frontend',
              },
            })
            console.log('[Piopiy] call activity written to hr_candidate_activities')
          })
        }
      }

      // ADD this function inside init(), after onCallEnd:
      const resetIsOnCall = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          await supabase
            .from('hr_employees')
            .update({ is_on_call: false })
            .eq('id', user.id)
          console.log('[Piopiy] is_on_call reset in DB')
        } catch (e) { /* non-critical */ }
      }

      piopiy.on('error', (obj: any) => {
        console.error('[Piopiy] error:', obj)
        // Reset stuck is_on_call on SDK errors (e.g. extra_param errors, call not found)
        if (obj.code === 1002) resetIsOnCall()
      })
      piopiy.on('hangup', onCallEnd)
      piopiy.on('ended',  onCallEnd)
      piopiy.on('callStream', () => console.log('[Piopiy] media stream established ✅'))
      piopiy.on('error',  (obj: any) => console.error('[Piopiy] error:', obj))

      // ── Login ──────────────────────────────────────────────
      piopiy.login(emp.telecmi_agent_id, emp.telecmi_password, sbcUri)
      piopiyRef.current = piopiy
      _piopiyInstance   = piopiy
      console.log('[Piopiy] login() called for:', emp.telecmi_agent_id)

    } catch (err: any) {
      console.error('[Piopiy] Init error:', err)
      dispatch(setSdkError(err.message || 'SDK init failed'))
      _moduleInitDone = false
    }
  }, [dispatch])

  useEffect(() => {
    console.log('[Piopiy] PiopiyProvider mounted. Requesting mic...')
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => { console.log('[Piopiy] Mic granted ✅'); init() })
      .catch(() => {
        console.warn('[Piopiy] Mic denied — calling disabled, status toggle still works')
        init() // still init for status toggle even without mic
        dispatch(setSdkError('Microphone permission denied'))
      })
    if (Notification.permission === 'default') Notification.requestPermission()

    return () => {
      // Cleanup only if navigating away (not hot-reload)
      // Don't destroy on Strict Mode unmount
    }
  }, [init, dispatch])

  // ── Public actions ─────────────────────────────────────────
  const makeCall = useCallback(async (phone: string, opts: MakeCallOptions = {}) => {
    if (!piopiyRef.current || !isReady) {
      console.error('[makeCall] SDK not ready. isReady:', isReady, 'piopiyRef:', !!piopiyRef.current)
      return false
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[makeCall] Calling:', phone, 'opts:', opts)
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telecmi-outbound`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ candidate_id: opts.candidateId, candidate_phone: phone }),
        }
      )
      const result = await res.json()
      console.log('[makeCall] telecmi-outbound response:', result)
      if (!res.ok) { console.error('[makeCall] Error:', result.error); return false }
      currentCall.current = {
        candidateId: opts.candidateId, candidateName: opts.candidateName,
        cdrId: result.cdr_id, direction: 'outbound', to: result.phone_to_call || phone,
      }
      dispatch(setCallState('connecting'))
      piopiyRef.current.call(
        result.phone_to_call || phone,
        { extra_param: JSON.stringify(result.extra_params) }
      )
      return true
    } catch (err) { console.error('[makeCall]', err); return false }
  }, [isReady, dispatch])

  const answer   = useCallback(() => piopiyRef.current?.answer(),    [])
  const reject   = useCallback(() => piopiyRef.current?.reject(),    [])
  const hangup   = useCallback(() => piopiyRef.current?.terminate(), [])
  const hold     = useCallback(() => piopiyRef.current?.hold(),      [])
  const unHold   = useCallback(() => piopiyRef.current?.unHold(),    [])
  const transfer = useCallback((t: string) => piopiyRef.current?.transfer(t), [])
  const sendDtmf = useCallback((t: string) => piopiyRef.current?.sendDtmf(t), [])
  const mute   = useCallback(() => { piopiyRef.current?.mute();   dispatch(setMuted(true))  }, [dispatch])
  const unMute = useCallback(() => { piopiyRef.current?.unMute(); dispatch(setMuted(false)) }, [dispatch])

  return (
    <PiopiyContext.Provider value={{
      isReady, makeCall, answer, reject, hangup,
      hold, unHold, mute, unMute, transfer, sendDtmf,
    }}>
      {children}
    </PiopiyContext.Provider>
  )
}

function mapCode(c: number) {
  return ({ 200: 'Completed', 408: 'No Answer', 480: 'Unavailable', 484: 'Bad Address', 486: 'Busy' } as any)[c]
    || `Ended (${c})`
}