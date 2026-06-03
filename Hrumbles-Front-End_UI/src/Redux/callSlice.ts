// src/Redux/callSlice.ts
// ============================================================
// Redux slice for TeleCMI calling state
// Placed in Redux/ to match the existing store structure
// ============================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type CallStatus = 'AVAILABLE' | 'ON_BREAK' | 'OFFLINE' | 'ON_LEAVE'
export type CallState  = 'idle' | 'connecting' | 'ringing_out' | 'ringing_in' | 'active' | 'on_hold' | 'ending'

export interface IncomingCallInfo {
  from: string
  candidateName?: string
  candidateId?: string
}

export interface ActiveCallInfo {
  to: string
  candidateName?: string
  candidateId?: string
  callId?: string
  cdrId?: string
  startedAt: number
  direction: 'inbound' | 'outbound'
}

interface CallSliceState {
  sdkReady:         boolean
  sdkError:         string | null
  callStatus:       CallStatus
  isOnCall:         boolean
  callState:        CallState
  incomingCall:     IncomingCallInfo | null
  activeCall:       ActiveCallInfo | null
  lastCallSummary:  {
    candidateId?:   string
    candidateName?: string
    direction:      'inbound' | 'outbound'
    duration:       number
    outcome:        string
    cdrId?:         string
    recordingUrl?:  string
  } | null
  missedCallCount:  number
  isMuted:          boolean
  isOnHold:         boolean
}

const initialState: CallSliceState = {
  sdkReady:        false,
  sdkError:        null,
  callStatus:      'OFFLINE',
  isOnCall:        false,
  callState:       'idle',
  incomingCall:    null,
  activeCall:      null,
  lastCallSummary: null,
  missedCallCount: 0,
  isMuted:         false,
  isOnHold:        false,
}

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setSdkReady(state, action: PayloadAction<boolean>) {
      state.sdkReady = action.payload
      state.sdkError = null
    },
    setSdkError(state, action: PayloadAction<string>) {
      state.sdkError  = action.payload
      state.sdkReady  = false
    },
    setCallStatus(state, action: PayloadAction<CallStatus>) {
      state.callStatus = action.payload
    },
    setCallState(state, action: PayloadAction<CallState>) {
      state.callState = action.payload
      if (action.payload === 'idle') {
        state.isOnCall  = false
        state.isMuted   = false
        state.isOnHold  = false
        state.incomingCall = null
      }
      if (action.payload === 'active') {
        state.isOnCall = true
      }
    },
    setIncomingCall(state, action: PayloadAction<IncomingCallInfo>) {
      state.incomingCall = action.payload
      state.callState    = 'ringing_in'
    },
    setActiveCall(state, action: PayloadAction<ActiveCallInfo>) {
      state.activeCall = action.payload
      state.callState  = 'active'
      state.isOnCall   = true
      state.incomingCall = null
    },
    setCallEnded(state, action: PayloadAction<{ duration: number; outcome: string; recordingUrl?: string }>) {
      if (state.activeCall) {
        state.lastCallSummary = {
          candidateId:   state.activeCall.candidateId,
          candidateName: state.activeCall.candidateName,
          direction:     state.activeCall.direction,
          duration:      action.payload.duration,
          outcome:       action.payload.outcome,
          cdrId:         state.activeCall.cdrId,
          recordingUrl:  action.payload.recordingUrl,
        }
      }
      state.callState    = 'idle'
      state.isOnCall     = false
      state.isMuted      = false
      state.isOnHold     = false
      state.incomingCall = null
      state.activeCall   = null
    },
    clearLastCallSummary(state) { state.lastCallSummary = null },
    setMuted(state,  action: PayloadAction<boolean>) { state.isMuted  = action.payload },
    setOnHold(state, action: PayloadAction<boolean>) {
      state.isOnHold  = action.payload
      state.callState = action.payload ? 'on_hold' : 'active'
    },
    incrementMissedCalls(state) { state.missedCallCount += 1 },
    clearMissedCalls(state)     { state.missedCallCount  = 0 },
    resetCallState(state) {
      return { ...initialState, callStatus: state.callStatus, sdkReady: state.sdkReady }
    },
  },
})

export const {
  setSdkReady, setSdkError, setCallStatus, setCallState,
  setIncomingCall, setActiveCall, setCallEnded,
  clearLastCallSummary, setMuted, setOnHold,
  incrementMissedCalls, clearMissedCalls, resetCallState,
} = callSlice.actions

export default callSlice.reducer

// ── Selectors (use these everywhere) ─────────────────────────
export const selectCallState   = (s: any) => s.call?.callState   as CallState
export const selectCallStatus  = (s: any) => s.call?.callStatus  as CallStatus
export const selectSdkReady    = (s: any) => s.call?.sdkReady    as boolean
export const selectIsOnCall    = (s: any) => s.call?.isOnCall    as boolean
export const selectIsMuted     = (s: any) => s.call?.isMuted     as boolean
export const selectIsOnHold    = (s: any) => s.call?.isOnHold    as boolean
export const selectIncoming    = (s: any) => s.call?.incomingCall as IncomingCallInfo | null
export const selectActiveCall  = (s: any) => s.call?.activeCall  as ActiveCallInfo | null
export const selectLastSummary = (s: any) => s.call?.lastCallSummary
export const selectMissedCount = (s: any) => s.call?.missedCallCount as number
export const selectSdkError    = (s: any) => s.call?.sdkError    as string | null

// ─── Debug helper — call this once in App.jsx or main.tsx ────
// import { debugCallSlice } from '@/Redux/callSlice'
// debugCallSlice(store)
export function debugCallSlice(store: any) {
  let prev = store.getState().call
  store.subscribe(() => {
    const next = store.getState().call
    if (prev !== next) {
      console.log('[Redux:call] state changed:', {
        sdkReady:    next?.sdkReady,
        callStatus:  next?.callStatus,
        callState:   next?.callState,
        isOnCall:    next?.isOnCall,
        isMuted:     next?.isMuted,
        sdkError:    next?.sdkError,
      })
      prev = next
    }
  })
  console.log('[Redux:call] initial state:', store.getState().call)
}