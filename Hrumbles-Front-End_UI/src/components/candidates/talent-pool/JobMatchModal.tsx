/**
 * JobMatchModal.tsx  —  Xrilic.ai Talent Matching Engine
 *
 * Phases:
 *  1. SCANNING  — Radar animation + live Xrilic.ai thinking stream
 *  2. RESULTS   — Card grid with matched/missing skills + wishlist + analysis panel
 *
 * Changes in this version:
 *  - Wishlist bookmark on every card (hr_talent_wishlist table)
 *  - Matched skills (✓ green) + Missing skills (✗ red) shown on card
 *  - Click card → opens rich analysis panel for that candidate
 *  - Analysis panel: section scoring bars, requirement fit breakdown,
 *    company timeline, strengths, gaps — all visualised
 *  - Xrilic.ai branding throughout
 */

import {
  useState, useEffect, useRef, useCallback, FC, useMemo,
} from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { createPortal } from "react-dom";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  X, Target, CheckCircle2, Sparkles, Users, MapPin, Briefcase,
  Clock, Search, SlidersHorizontal, Brain, Loader2, AlertCircle,
  ExternalLink, DollarSign, Bookmark, BookmarkCheck,
  XCircle, Minus, TrendingUp, Building2, AlertTriangle, BarChart2, Mail, Phone, GraduationCap,
} from 'lucide-react';

// ─── Redux ─────────────────────────────────────────────────────────────────────

interface RootState {
  auth: { user: { id: string } | null };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  skills: string[];
  primary_skills?: string[];
  description: string;
  experience: string | Record<string, any>;
  location: string[];
}

interface MatchedCandidate {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  suggested_title?: string;
  current_designation?: string;
  current_company?: string;
  current_location?: string;
  total_experience?: string;
  notice_period?: string;
  current_salary?: string;
  highest_education?: string;
  resume_text?: string;
  matching_skill_count?: number;
  matching_skills?: string[];
  total_candidate_count?: number;
  created_by?: { first_name: string; last_name: string } | null;
  created_at: string;
  work_experience?: { company?: string; designation?: string; duration?: string; responsibilities?: string[] }[];
  [key: string]: unknown;
}

type AnalysisStatus = 'idle' | 'running' | 'done' | 'error';

interface SkillMatch {
  requirement: string;
  matched: 'yes' | 'partial' | 'no';
  details: string;
}

interface SectionSubmenu {
  submenu: string;
  weightage: number;
  score: number;
  weighted_score: number;
  remarks: string;
}

interface SectionScore {
  section: string;
  weightage: number;
  submenus: SectionSubmenu[];
}

interface CompanyEntry {
  name: string;
  designation: string;
  years: string;
}

interface CandidateAnalysis {
  candidateId: string;
  status: AnalysisStatus;
  overallScore?: number;
  summary?: string;
  topSkills?: string[];
  missingAreas?: string[];
  developmentGaps?: string[];
  matchedSkillsBreakdown?: SkillMatch[];
  sectionScoring?: Record<string, SectionScore>;
  companies?: CompanyEntry[];
  errorMsg?: string;
}

interface JobMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  organizationId: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SCAN_DURATION_MS = 3800;

const AI_THINKING_STEPS = [
  { delay: 0,    text: 'Parsing job requirements and extracting skill vectors…' },
  { delay: 600,  text: 'Loading talent pool index for organisation…' },
  { delay: 1100, text: 'Running semantic similarity across candidate profiles…' },
  { delay: 1700, text: 'Applying experience threshold filters…' },
  { delay: 2200, text: 'Scoring candidates by composite match formula…' },
  { delay: 2700, text: 'Ranking results by descending match confidence…' },
  { delay: 3200, text: 'Preparing Xrilic.ai match report…' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getMatchTier = (pct: number) => {
  if (pct >= 75) return { ring: '#10b981', glow: '0 0 12px rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.1)', text: '#059669', label: 'Excellent' };
  if (pct >= 50) return { ring: '#f59e0b', glow: '0 0 12px rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)', text: '#d97706', label: 'Good' };
  return { ring: '#f97316', glow: '0 0 12px rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.08)', text: '#ea580c', label: 'Fair' };
};

const avatarGradient = (name: string) => {
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue},55%,42%), hsl(${(hue + 45) % 360},55%,32%))`;
};

const initials = (name: string) =>
  (name || 'NA').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── SVG Score Ring ─────────────────────────────────────────────────────────────

const ScoreRing: FC<{ pct: number; size?: number; strokeWidth?: number }> = ({
  pct, size = 56, strokeWidth = 5,
}) => {
  const tier = getMatchTier(pct);
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={tier.ring} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)', filter: tier.glow }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{
          transform: 'rotate(90deg)', transformOrigin: '50% 50%',
          fill: tier.text,
          fontSize: size < 50 ? 10 : size > 70 ? 16 : 12,
          fontWeight: 800, fontFamily: 'monospace',
        }}
      >
        {pct}%
      </text>
    </svg>
  );
};

// ─── AI Thinking Stream ─────────────────────────────────────────────────────────

const AIThinkingStream: FC<{ active: boolean }> = ({ active }) => {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [typedChars, setTypedChars] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    AI_THINKING_STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
        let charIdx = 0;
        const charInterval = setInterval(() => {
          charIdx++;
          setTypedChars(prev => ({ ...prev, [i]: charIdx }));
          if (charIdx >= step.text.length) clearInterval(charInterval);
        }, 18);
        timers.push(charInterval as unknown as ReturnType<typeof setTimeout>);
      }, step.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        {/* ── Xrilic.ai terminal label ── */}
        <span className="ml-2 text-xs text-white/40 font-mono">xrilic.ai · matcher</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-mono">live</span>
        </div>
      </div>
      <div className="p-4 space-y-2 min-h-[160px] font-mono text-xs">
        {AI_THINKING_STEPS.map((step, i) => {
          const visible = visibleLines.includes(i);
          const chars = typedChars[i] ?? 0;
          const isLatest = visibleLines[visibleLines.length - 1] === i;
          if (!visible) return null;
          return (
            <div key={i} className="flex items-start gap-2"
              style={{ opacity: isLatest ? 1 : 0.45, transition: 'opacity 0.3s' }}>
              {chars >= step.text.length
                ? <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                : <div className="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full border border-violet-400 animate-spin"
                    style={{ borderTopColor: 'transparent' }} />}
              <span style={{ color: isLatest ? '#e2d9f3' : '#7c6fa0' }}>
                {step.text.slice(0, chars)}
                {isLatest && chars < step.text.length && (
                  <span className="inline-block w-[2px] h-[12px] ml-0.5 align-middle"
                    style={{ background: '#a78bfa', animation: 'blink 0.7s step-end infinite' }} />
                )}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
};

// ─── Scanning Phase ─────────────────────────────────────────────────────────────

const ScanningPhase: FC<{
  jobTitle: string;
  totalPool: number;
  jobSkills: string[];
  scannedCount: number;
}> = ({ jobTitle, totalPool, jobSkills, scannedCount }) => {
  const progress = Math.min((scannedCount / Math.max(totalPool, 1)) * 100, 100);
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-6 gap-8">
      {/* Radar */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="absolute rounded-full"
            style={{ width: 200, height: 200, border: '1px solid rgba(139,92,246,0.3)', animation: `radarPing 2.4s ${i * 0.55}s ease-out infinite` }} />
        ))}
        <div className="absolute rounded-full overflow-hidden"
          style={{ width: 160, height: 160, background: 'radial-gradient(circle, rgba(109,40,217,0.12), transparent 70%)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'conic-gradient(from 0deg, transparent 240deg, rgba(139,92,246,0.7) 360deg)', animation: 'sweep 1.6s linear infinite' }} />
        </div>
        {[120, 85].map(s => (
          <div key={s} className="absolute rounded-full" style={{ width: s, height: s, border: '1px solid rgba(139,92,246,0.2)' }} />
        ))}
        <div className="relative z-10 flex items-center justify-center rounded-2xl"
          style={{ width: 68, height: 68, background: 'linear-gradient(135deg, #5b21b6, #3730a3)', boxShadow: '0 0 40px rgba(109,40,217,0.7), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
          <Brain className="text-white" size={30} />
        </div>
        {[{ top: '20%', left: '65%', delay: '0.3s' }, { top: '58%', left: '78%', delay: '1.1s' },
          { top: '72%', left: '38%', delay: '0.7s' }, { top: '30%', left: '25%', delay: '1.5s' }].map((pos, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full"
            style={{ ...pos, background: '#a78bfa', animation: `blip 2s ${pos.delay} ease-in-out infinite`, boxShadow: '0 0 6px rgba(167,139,250,0.8)' }} />
        ))}
      </div>

      <div className="text-center">
        {/* Xrilic.ai badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            ✦ xrilic.ai
          </span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-1">Scanning Talent Pool</h2>
        <p className="text-sm" style={{ color: 'rgba(196,181,253,0.8)' }}>
          Finding best matches for <span className="font-semibold text-white">{jobTitle}</span>
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black tabular-nums" style={{ color: '#c4b5fd', fontFamily: 'monospace' }}>
          {scannedCount.toLocaleString()}
        </span>
        <span className="text-lg font-medium" style={{ color: 'rgba(196,181,253,0.5)' }}>/ {totalPool.toLocaleString()}</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #c084fc)', boxShadow: '0 0 12px rgba(192,132,252,0.6)', transition: 'width 0.2s linear' }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs font-mono" style={{ color: 'rgba(196,181,253,0.5)' }}>{Math.round(progress)}% scanned</span>
          <span className="text-xs font-mono" style={{ color: 'rgba(196,181,253,0.5)' }}>ETA ~{Math.max(0, Math.round((1 - progress / 100) * (SCAN_DURATION_MS / 1000)))}s</span>
        </div>
      </div>

      <AIThinkingStream active />

      {jobSkills.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {jobSkills.slice(0, 10).map((s, i) => (
            <span key={s} className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd', animation: `tagIn 0.35s ${i * 70}ms both` }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <style>{`
        @keyframes radarPing { 0% { transform:scale(0.3);opacity:0.8; } 100% { transform:scale(1.05);opacity:0; } }
        @keyframes sweep { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes blip { 0%,100%{opacity:0;transform:scale(0.5);} 50%{opacity:1;transform:scale(1);} }
        @keyframes tagIn { from{opacity:0;transform:scale(0.85);} to{opacity:1;transform:scale(1);} }
      `}</style>
    </div>
  );
};

// ─── Analysis Detail Panel ──────────────────────────────────────────────────────

const AnalysisDetailPanel: FC<{
  candidate: MatchedCandidate | null;
  analysis?: CandidateAnalysis;
  jobSkills: string[];
  jobDescription: string;
  jobTitle: string;
  onRunAnalysis: (c: MatchedCandidate) => void;
  onClose: () => void;
}> = ({ candidate, analysis, jobSkills, jobTitle, onRunAnalysis, onClose }) => {
  const tier = getMatchTier(analysis?.overallScore ?? 0);

  const sectionColors: Record<string, string> = {
    'Technical Skills': '#7c3aed', 'Work Experience': '#2563eb',
    'Projects': '#0891b2', 'Education': '#059669',
    'Achievements': '#d97706', 'Soft Skills': '#db2777',
  };

  const getSectionAchievedPct = (sec: SectionScore) => {
    const earned = sec.submenus.reduce((acc, sm) => {
      const maxForSub = (sm.weightage / 100) * sec.weightage;
      return acc + (sm.score / 10) * maxForSub;
    }, 0);
    return Math.round((earned / sec.weightage) * 100);
  };

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(109,40,217,0.08)' }}>
          <Brain size={26} style={{ color: '#7c3aed' }} />
        </div>
        <p className="text-[11px] font-bold text-gray-600 mb-1">Xrilic.ai Analysis</p>
        <p className="text-xs text-gray-400 max-w-[190px]">Click any card to view or run AI-powered deep analysis.</p>
      </div>
    );
  }

  const isRunning = analysis?.status === 'running';
  const isDone    = analysis?.status === 'done';
  const isError   = analysis?.status === 'error';
  const notYet    = !analysis || analysis.status === 'idle';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/10"
        style={{ background: 'linear-gradient(135deg, #1a0a3e, #2e1065)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
            ✦ xrilic.ai
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: avatarGradient(candidate.candidate_name || '') }}>
            {initials(candidate.candidate_name || '')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{candidate.candidate_name}</p>
            <p className="text-[11px] text-violet-300/80 truncate">
              {candidate.suggested_title || candidate.current_designation || '—'}
            </p>
          </div>
          {isDone && <ScoreRing pct={analysis!.overallScore ?? 0} size={52} strokeWidth={5} />}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Not started ── */}
{/* ── Not started ── */}
        {notYet && (
          <div className="p-5 flex flex-col gap-6">
            
            {/* Quick Contact & Education */}
            <div className="grid grid-cols-2 gap-4">
              {candidate.email && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Mail size={10}/> Email
                  </span>
                  <span className="text-xs text-gray-800 truncate" title={candidate.email}>
                    {candidate.email}
                  </span>
                </div>
              )}
              {candidate.phone && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Phone size={10}/> Phone
                  </span>
                  <span className="text-xs text-gray-800">{candidate.phone}</span>
                </div>
              )}
              {candidate.highest_education && (
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <GraduationCap size={10}/> Education
                  </span>
                  <span className="text-xs text-gray-800">{candidate.highest_education}</span>
                </div>
              )}
            </div>

            {/* Experience Preview */}
            {Array.isArray(candidate.work_experience) && candidate.work_experience.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Recent Experience
                </span>
                <div className="space-y-3">
                  {candidate.work_experience.slice(0, 2).map((exp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 p-1.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex-shrink-0">
                        <Building2 size={10} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {exp.designation || 'Professional'}
                        </p>
                        <p className="text-[10px] text-gray-600 truncate">{exp.company}</p>
                        {exp.duration && <p className="text-[10px] font-mono text-gray-400">{exp.duration}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Action Card */}
            <div className="p-4 rounded-xl border border-violet-100 mt-2" style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, rgba(139,92,246,0.02) 100%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-900">AI Deep Analysis</span>
              </div>
              <p className="text-[11px] text-violet-600/80 mb-3 leading-relaxed">
                Run Xrilic.ai to evaluate this candidate's resume against <strong className="text-violet-800">{jobTitle}</strong>.
              </p>
              <Button className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                onClick={() => onRunAnalysis(candidate)}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(124,58,237,0.35)', padding: '10px 16px' }}>
                <Sparkles size={15} />Run Analysis
              </Button>
            </div>
            
          </div>
        )}

        {/* ── Running ── */}
        {isRunning && (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={15} className="animate-spin text-violet-500 flex-shrink-0" />
              <p className="text-xs text-violet-600 font-medium">Analysing with Xrilic.ai…</p>
            </div>
            <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                style={{ width: '65%', animation: 'indeterminate 1.8s ease-in-out infinite' }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-mono">
              Evaluating {jobSkills.length} requirements…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{analysis?.errorMsg || 'Analysis failed'}</p>
            </div>
            <Button variant="outline" className="w-full text-xs h-8 rounded-lg" onClick={() => onRunAnalysis(candidate)}>
              Retry
            </Button>
          </div>
        )}

        {/* ── Done — full rich report ── */}
        {isDone && analysis && (
          <div className="divide-y divide-gray-100">

            {/* Summary */}
            {analysis.summary && (
              <div className="px-4 py-3">
                <p className="text-[11px] leading-relaxed text-gray-600 italic">"{analysis.summary}"</p>
              </div>
            )}

            {/* Overall score breakdown bar */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex-1 h-3 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${analysis.overallScore}%`, background: tier.ring, boxShadow: `0 0 8px ${tier.ring}60` }} />
                </div>
                <span className="text-sm font-black flex-shrink-0" style={{ color: tier.text }}>
                  {analysis.overallScore}%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Overall match · {tier.label}</p>
            </div>

            {/* ── Section-wise Scoring ── */}
            {analysis.sectionScoring && Object.keys(analysis.sectionScoring).length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <BarChart2 size={12} style={{ color: '#7c3aed' }} />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Section Scores</p>
                </div>
                <div className="space-y-3">
                  {Object.values(analysis.sectionScoring).map(sec => {
                    const pct = getSectionAchievedPct(sec);
                    const color = sectionColors[sec.section] ?? '#7c3aed';
                    return (
                      <div key={sec.section}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-gray-700">{sec.section}</span>
                          <div className="flex items-center gap-1.5">
                            {/* <span className="text-[9px] text-gray-400">wt {sec.weightage}%</span> */}
                            <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
                          </div>
                        </div>
                        {/* Main section bar */}
                        <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                        </div>
                        {/* Sub-score rows */}
                        <div className="space-y-1 pl-2 border-l-2" style={{ borderColor: `${color}30` }}>
                          {sec.submenus.map(sm => {
                            const smPct = Math.round((sm.score / 10) * 100);
                            const smColor = smPct >= 70 ? '#10b981' : smPct >= 40 ? '#f59e0b' : '#ef4444';
                            return (
                              <div key={sm.submenu}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-gray-400">{sm.submenu}</span>
                                  <span className="text-[10px] font-bold" style={{ color: smColor }}>{sm.score}/10</span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden mt-0.5" style={{ background: 'rgba(0,0,0,0.05)' }}>
                                  <div className="h-full rounded-full"
                                    style={{ width: `${smPct}%`, background: smColor, opacity: 0.7 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Requirement Fit Breakdown ── */}
            {analysis.matchedSkillsBreakdown && analysis.matchedSkillsBreakdown.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={12} style={{ color: '#7c3aed' }} />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Requirement Fit</p>
                </div>
                {/* Quick legend */}
                <div className="flex items-center gap-3 mb-2.5">
                  {[
                    { icon: <CheckCircle2 size={9} />, color: '#10b981', label: 'Met' },
                    { icon: <Minus size={9} />,        color: '#f59e0b', label: 'Partial' },
                    { icon: <XCircle size={9} />,       color: '#ef4444', label: 'Missing' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1" style={{ color: l.color }}>
                      {l.icon}
                      <span className="text-[9px] font-semibold">{l.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {analysis.matchedSkillsBreakdown.map((skill, i) => {
                    const isYes     = skill.matched === 'yes';
                    const isPartial = skill.matched === 'partial';
                    const color  = isYes ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
                    const bg     = isYes ? 'rgba(16,185,129,0.05)' : isPartial ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)';
                    const Icon   = isYes ? CheckCircle2 : isPartial ? Minus : XCircle;
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-default"
                            style={{ background: bg, border: `1px solid ${color}20` }}>
                            <Icon size={10} className="flex-shrink-0 mt-0.5" style={{ color }} />
                            <p className="text-[10px] text-gray-700 leading-tight line-clamp-1 flex-1">{skill.requirement}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[230px] text-xs">
                          <p className="font-bold mb-1" style={{ color }}>
                            {isYes ? '✓ Met' : isPartial ? '~ Partial match' : '✗ Not found'}
                          </p>
                          <p className="text-gray-600">{skill.details}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Strengths ── */}
            {analysis.topSkills && analysis.topSkills.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} style={{ color: '#10b981' }} />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Strengths</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.topSkills.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Gaps ── */}
            {analysis.missingAreas && analysis.missingAreas.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Gaps</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingAreas.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Company Timeline ── */}
            {analysis.companies && analysis.companies.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <Building2 size={12} style={{ color: '#2563eb' }} />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Experience</p>
                </div>
                <div className="relative space-y-0">
                  <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gray-200" />
                  {analysis.companies.map((co, i) => (
                    <div key={i} className="flex items-start gap-3 pb-3 last:pb-0">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5"
                        style={{ background: i === 0 ? '#2563eb' : '#f1f5f9', border: '2px solid white', boxShadow: '0 0 0 1px #e5e7eb' }}>
                        <Building2 size={10} style={{ color: i === 0 ? 'white' : '#94a3b8' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{co.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{co.designation}</p>
                        <p className="text-[10px] font-mono text-gray-400">{co.years}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile link */}
            <div className="px-4 py-3">
              <Link to={`/talent-pool/${candidate.id}`}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 py-2 rounded-lg border border-violet-200 hover:bg-violet-50 transition-colors">
                View Full Profile <ExternalLink size={11} />
              </Link>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); width: 40%; }
          50% { transform: translateX(80%); width: 60%; }
          100% { transform: translateX(200%); width: 40%; }
        }
      `}</style>
    </div>
  );
};

// ─── Candidate Card ─────────────────────────────────────────────────────────────

const CandidateCard: FC<{
  candidate: MatchedCandidate;
  index: number;
  jobSkills: string[];
  isWishlisted: boolean;
  analysis?: CandidateAnalysis;
  isViewing: boolean;
  onView: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}> = ({ candidate, index, jobSkills, isWishlisted, analysis, isViewing, onView, onToggleWishlist }) => {
  const matchCount     = candidate.matching_skill_count ?? 0;
  const matchedSkills  = candidate.matching_skills ?? [];
  const missingSkills  = jobSkills.filter(s =>
    !matchedSkills.some(m => m.toLowerCase() === s.toLowerCase())
  );
  const totalSkills = jobSkills.length || 1;
  const pct  = Math.min(Math.round((matchCount / totalSkills) * 100), 100);
  const tier = getMatchTier(pct);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background:  isViewing ? 'rgba(109,40,217,0.05)' : '#fff',
        border:      isViewing ? '1.5px solid rgba(139,92,246,0.45)' : '1.5px solid rgba(0,0,0,0.07)',
        boxShadow:   isViewing ? '0 0 0 3px rgba(139,92,246,0.1)' : '0 2px 10px rgba(0,0,0,0.05)',
        animation:   `cardReveal 0.45s ${Math.min(index, 8) * 55}ms both`,
        transition:  'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      }}
      onClick={() => onView(candidate.id)}
    >
      {/* Tier stripe */}
      <div className="h-0.5 w-full" style={{ background: tier.ring }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
            style={{ background: avatarGradient(candidate.candidate_name || '') }}>
            {initials(candidate.candidate_name || '')}
          </div>

          {/* Name / title */}
          <div className="flex-1 min-w-0">
            <Link to={`/talent-pool/${candidate.id}`}
              className="block font-bold text-sm text-gray-900 hover:text-violet-700 truncate transition-colors"
              onClick={e => e.stopPropagation()}>
              {candidate.candidate_name || 'Unknown'}
            </Link>
            <p className="text-xs text-gray-500 truncate">
              {candidate.suggested_title || candidate.current_designation || '—'}
            </p>
          </div>

          {/* Score ring + bookmark stack */}
<div className="flex items-center gap-3 flex-shrink-0">

      {/* Wishlist bookmark */}
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
        style={{
          background: isWishlisted
            ? 'rgba(245,158,11,0.12)'
            : 'rgba(0,0,0,0.04)',
          border: isWishlisted
            ? '1px solid rgba(245,158,11,0.25)'
            : '1px solid transparent',
        }}
        onClick={e => {
          e.stopPropagation();
          onToggleWishlist(candidate.id);
        }}
      >
        {isWishlisted ? (
          <BookmarkCheck size={13} style={{ color: '#d97706' }} />
        ) : (
          <Bookmark
            size={13}
            className="text-gray-400 group-hover:text-gray-600 transition-colors"
          />
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent>
      {isWishlisted ? 'Remove from Shortlist' : 'Save to Shortlist'}
    </TooltipContent>
  </Tooltip>

  {/* AI score if done */}
  {analysis?.status === 'done' && analysis.overallScore !== undefined && (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{
        background: 'rgba(109,40,217,0.08)',
        border: '1px solid rgba(109,40,217,0.18)',
      }}
    >
      <Brain size={8} style={{ color: '#7c3aed' }} />
      <span
        className="text-[10px] font-mono font-bold"
        style={{ color: '#7c3aed' }}
      >
        {analysis.overallScore}%
      </span>
    </div>
  )}
  <ScoreRing pct={pct} size={46} strokeWidth={4} />




</div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-3">
          {candidate.current_location && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <MapPin size={9} />{candidate.current_location}
            </span>
          )}
          {candidate.total_experience && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Briefcase size={9} />{candidate.total_experience}
            </span>
          )}
          {candidate.notice_period && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock size={9} />{candidate.notice_period}
            </span>
          )}
          {candidate.current_salary && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <DollarSign size={9} />{candidate.current_salary}
            </span>
          )}
        </div>

        {/* ── Skills: matched ✓ + missing ✗ ── */}
        <div className="space-y-1.5 mb-3">
          {/* Matched — green */}
          {matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matchedSkills.slice(0, 4).map(skill => (
                <span key={skill}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.ring}30` }}>
                  <CheckCircle2 size={8} />{skill}
                </span>
              ))}
{matchedSkills.length > 4 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className="px-1.5 py-0.5 rounded-md text-[10px] font-medium cursor-default"
        style={{ background: tier.bg, color: tier.text }}
      >
        +{matchedSkills.length - 4}
      </span>
    </TooltipTrigger>

    <TooltipContent className="max-w-[220px]">
      <div className="flex flex-wrap gap-1">
        {matchedSkills.slice(4).map(skill => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
            style={{
              background: tier.bg,
              color: tier.text,
              border: `1px solid ${tier.ring}30`,
            }}
          >
            <CheckCircle2 size={8} />
            {skill}
          </span>
        ))}
      </div>
    </TooltipContent>
  </Tooltip>
)}
            </div>
          )}

          {/* Missing — red */}
          {missingSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {missingSkills.slice(0, 3).map(skill => (
                <span key={skill}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <XCircle size={8} />{skill}
                </span>
              ))}
             {missingSkills.length > 3 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="px-1.5 py-0.5 rounded-md text-[10px] text-gray-400 bg-gray-100 cursor-default">
        +{missingSkills.length - 3} missing
      </span>
    </TooltipTrigger>

    <TooltipContent className="max-w-[220px]">
      <div className="flex flex-wrap gap-1">
        {missingSkills.slice(3).map(skill => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{
              background: 'rgba(239,68,68,0.07)',
              color: '#dc2626',
              border: '1px solid rgba(239,68,68,0.18)',
            }}
          >
            <XCircle size={8} />
            {skill}
          </span>
        ))}
      </div>
    </TooltipContent>
  </Tooltip>
)}
            </div>
          )}
        </div>

        {/* Analysis teaser */}
        {analysis?.status === 'done' && analysis.summary && (
          <div className="rounded-lg px-2.5 py-1.5 mb-2"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Brain size={9} style={{ color: '#10b981' }} />
              <span className="text-[10px] font-bold text-gray-600">AI {analysis.overallScore}%</span>
            </div>
            <p className="text-[10px] text-gray-500 line-clamp-1">{analysis.summary}</p>
          </div>
        )}
        {analysis?.status === 'running' && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-2"
            style={{ background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.15)' }}>
            <Loader2 size={10} className="animate-spin text-violet-500" />
            <span className="text-[10px] text-violet-600 font-medium">Xrilic.ai analysing…</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: tier.bg, color: tier.text }}>
            {matchCount}/{totalSkills} · {tier.label}
          </span>
          <div className="flex items-center gap-1.5">
            {isViewing && (
              <span className="text-[10px] font-semibold text-violet-600 flex items-center gap-1">
                <Brain size={9} />Viewing
              </span>
            )}
            <Link to={`/talent-pool/${candidate.id}`}
              className="text-[10px] text-gray-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => e.stopPropagation()}>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardReveal {
          from { opacity:0; transform:translateY(18px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
};

// ─── Results Phase ──────────────────────────────────────────────────────────────

const ResultsPhase: FC<{
  candidates: MatchedCandidate[];
  totalMatched: number;
  job: Job;
  totalPool: number;
  organizationId: string;
  onClose: () => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  isFetching: boolean;
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
}> = ({
  candidates, totalMatched, job, totalPool, organizationId,
  onClose, page, pageSize, onPageChange, isFetching,
  wishlistIds, onToggleWishlist,
}) => {

    console.log('totalMatched', totalMatched);
    console.log('totalPool', totalPool);
  const [search, setSearch]                               = useState('');
  const [sort, setSort]                                   = useState<'match' | 'name'>('match');
  const [viewingId, setViewingId]                         = useState<string | null>(null);
  const [analyses, setAnalyses]                           = useState<Record<string, CandidateAnalysis>>({});

  const jobSkills   = job.primary_skills?.length ? job.primary_skills : job.skills;
  const matchRate   = totalPool > 0 ? Math.round((totalMatched / totalPool) * 100) : 0;
  const totalPages  = Math.ceil(totalMatched / pageSize);
  const viewingCandidate = candidates.find(c => c.id === viewingId) ?? null;

  const filtered = useMemo(() => {
    let list = [...candidates];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.candidate_name || '').toLowerCase().includes(q) ||
        (c.current_location || '').toLowerCase().includes(q) ||
        (c.suggested_title || '').toLowerCase().includes(q)
      );
    }
    if (sort === 'match') list.sort((a, b) => (b.matching_skill_count ?? 0) - (a.matching_skill_count ?? 0));
    if (sort === 'name')  list.sort((a, b) => (a.candidate_name || '').localeCompare(b.candidate_name || ''));
    return list;
  }, [candidates, search, sort]);

  const handleAnalysisUpdate = (result: CandidateAnalysis) =>
    setAnalyses(prev => ({ ...prev, [result.candidateId]: result }));

  const runAnalysisForCandidate = useCallback(async (candidate: MatchedCandidate) => {
    if (analyses[candidate.id]?.status === 'done') return;
    handleAnalysisUpdate({ candidateId: candidate.id, status: 'running' });
    try {
      let resumeText = candidate.resume_text as string | undefined;
      if (!resumeText) {
        const { data } = await supabase
          .from('hr_talent_pool').select('resume_text').eq('id', candidate.id).single();
        resumeText = data?.resume_text ?? '';
      }
      const { data, error } = await supabase.functions.invoke('initial-analysis-4o', {
        body: { type: 'initial', payload: { jobDescription: job.description, resumeText } },
      });
      if (error) throw new Error(error.message);
      const a = data?.analysis;
      handleAnalysisUpdate({
        candidateId: candidate.id,
        status: 'done',
        overallScore:          a?.overall_match_score ?? 0,
        summary:               a?.summary ?? '',
        topSkills:             a?.top_skills ?? [],
        missingAreas:          a?.missing_or_weak_areas ?? [],
        developmentGaps:       a?.development_gaps ?? [],
        matchedSkillsBreakdown: a?.matched_skills ?? [],
        sectionScoring:        a?.section_wise_scoring ?? {},
        companies:             a?.companies ?? [],
      });
    } catch (err: unknown) {
      handleAnalysisUpdate({
        candidateId: candidate.id,
        status: 'error',
        errorMsg: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [analyses, job.description]);

  const handleViewCard = (id: string) => setViewingId(prev => prev === id ? null : id);

  return (
    <div className="flex flex-col h-full" style={{ animation: 'resultsIn 0.5s both' }}>

      {/* ── Summary bar ── */}
      <div className="flex-shrink-0 px-6 py-3"
        style={{ background: 'linear-gradient(135deg, #1a0a3e 0%, #2e1065 100%)', borderBottom: '1px solid rgba(139,92,246,0.3)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Target size={18} className="text-violet-300" />
            </div>
            <div className="min-w-0">
              {/* Xrilic.ai brand badge */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                  ✦ xrilic.ai
                </span>
                <p className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">Results for</p>
              </div>
              <h2 className="text-white font-black text-base truncate">{job.title}</h2>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 flex-shrink-0 mr-4">
            {[
              { label: 'Matched',    value: totalMatched,             color: '#c4b5fd' },
              { label: 'Scanned',    value: totalPool.toLocaleString(), color: '#94a3b8' },
              { label: 'Match Rate', value: `${matchRate}%`,          color: matchRate >= 10 ? '#34d399' : '#fbbf24' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-medium" style={{ color: 'rgba(196,181,253,0.6)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skill tags */}
        {jobSkills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {jobSkills.slice(0, 14).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search candidates…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg border-gray-200 bg-white" />
        </div>
        <Select value={sort} onValueChange={v => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg border-gray-200">
            <SlidersHorizontal size={11} className="mr-1.5 flex-shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Best Match</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          {isFetching
            ? <><Loader2 size={11} className="animate-spin text-violet-500" />Loading…</>
            : <>{filtered.length} shown · {totalMatched} total</>}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Users size={36} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium text-sm">No candidates found</p>
              {search && <p className="text-xs text-gray-400 mt-1">Try a different search</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c, i) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  index={i}
                  jobSkills={jobSkills}
                  isWishlisted={wishlistIds.includes(c.id)}
                  analysis={analyses[c.id]}
                  isViewing={viewingId === c.id}
                  onView={handleViewCard}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          )}
        </div>

        {/* Analysis panel */}
        <div
          className="flex-shrink-0 border-l border-gray-100 overflow-hidden flex flex-col transition-all duration-300"
          style={{
            width: viewingId ? 340 : 0,
            background: '#fafafa',
            opacity: viewingId ? 1 : 0,
          }}
        >
          {viewingId && (
            <AnalysisDetailPanel
              candidate={viewingCandidate}
              analysis={analyses[viewingId]}
              jobSkills={jobSkills}
              jobDescription={job.description}
              jobTitle={job.title}
              onRunAnalysis={runAnalysisForCandidate}
              onClose={() => setViewingId(null)}
            />
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2.5 border-t border-gray-100 bg-white">
          <Button variant="outline" size="sm"
            disabled={page === 0 || isFetching}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg h-8 px-4 text-xs font-medium">
            ← Prev
          </Button>
          <span className="text-xs font-semibold text-gray-600 tabular-nums">
            Page {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm"
            disabled={page >= totalPages - 1 || isFetching}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg h-8 px-4 text-xs font-medium">
            Next →
          </Button>
          {isFetching && <Loader2 size={13} className="animate-spin text-violet-500" />}
        </div>
      )}

      <style>{`
        @keyframes resultsIn  { from{opacity:0;} to{opacity:1;} }
        @keyframes slidePanel { from{opacity:0;transform:translateX(20px);} to{opacity:1;transform:translateX(0);} }
      `}</style>
    </div>
  );
};

// ─── Main Modal ─────────────────────────────────────────────────────────────────

const JobMatchModal: FC<JobMatchModalProps> = ({ isOpen, onClose, job, organizationId }) => {
  const user        = useSelector((state: RootState) => state.auth.user);
  const queryClient = useQueryClient();

  const [phase, setPhase]           = useState<'scanning' | 'results'>('scanning');
  const [scannedCount, setScannedCount] = useState(0);
  const [matchPage, setMatchPage]   = useState(0);
  const PAGE_SIZE = 20;
  const animFrameRef = useRef<number | null>(null);
  const startRef     = useRef<number | null>(null);
  const isLoadingRef = useRef(true);

  const jobSkills = job?.primary_skills?.length ? job.primary_skills : (job?.skills ?? []);

  useEffect(() => { setMatchPage(0); }, [job?.id]);

  // ── Matched candidates ────────────────────────────────────────────────────
  const { data: matchData, isLoading, isFetching } = useQuery({
    queryKey: ['jobMatchModal', job?.id, organizationId, matchPage],
    queryFn: async () => {
      if (!job?.id || !organizationId) return { candidates: [], total: 0 };
      const { data, error } = await supabase.rpc('match_candidates_to_job', {
        p_job_id: job.id, p_organization_id: organizationId,
        p_limit: PAGE_SIZE, p_offset: matchPage * PAGE_SIZE,
      });
      if (error) throw error;
      const raw = (data as any[]) ?? [];
      const candidates: MatchedCandidate[] = raw.map(row => ({
        id:                    row.r_id,
        candidate_name:        row.r_candidate_name,
        email:                 row.r_email,
        phone:                 row.r_phone,
        suggested_title:       row.r_suggested_title,
        created_at:            row.r_created_at,
        current_salary:        row.r_current_salary,
        current_location:      row.r_current_location,
        total_experience:      row.r_total_experience,
        current_company:       row.r_current_company,
        current_designation:   row.r_current_designation,
        notice_period:         row.r_notice_period,
        highest_education:     row.r_highest_education,
        work_experience:       row.r_work_experience,
        matching_skill_count:  Number(row.r_matching_skill_count ?? 0),
        matching_skills:       row.r_matching_skills ?? [],
        total_candidate_count: Number(row.r_total_candidate_count ?? 0),
        created_by:            row.r_created_by,
      }));
      return { candidates, total: Number(raw[0]?.r_total_candidate_count ?? 0) };
    },
    enabled: isOpen && !!job?.id,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000,
  });

  // Sync loading ref for the animation check loop
  isLoadingRef.current = isLoading;

  // ── Wishlist ──────────────────────────────────────────────────────────────
  const wishlistQueryKey = ['existingWishlistForJobMatch', job?.id, user?.id];

  const { data: wishlistIds = [] } = useQuery({
    queryKey: wishlistQueryKey,
    queryFn: async () => {
      if (!job?.id || !user?.id) return [];
      const { data, error } = await supabase
        .from('hr_talent_wishlist')
        .select('hr_talent_id')
        .eq('hr_job_id', job.id)
        .eq('created_by', user.id);
      if (error) { console.error('Wishlist fetch error:', error); return []; }
      return (data as any[]).map(item => item.hr_talent_id as string);
    },
    enabled: isOpen && !!job?.id && !!user?.id,
    staleTime: 30_000,
  });

  const handleToggleWishlist = async (candidateId: string) => {
    if (!user?.id || !job?.id) return;
    const isIn = (wishlistIds as string[]).includes(candidateId);
    // Optimistic update
    queryClient.setQueryData<string[]>(wishlistQueryKey, prev =>
      isIn ? (prev ?? []).filter(id => id !== candidateId) : [...(prev ?? []), candidateId]
    );
    try {
      if (isIn) {
        await supabase.from('hr_talent_wishlist')
          .delete()
          .eq('hr_job_id', job.id)
          .eq('hr_talent_id', candidateId)
          .eq('created_by', user.id);
      } else {
        await supabase.from('hr_talent_wishlist').insert({
          hr_job_id:       job.id,
          hr_talent_id:    candidateId,
          created_by:      user.id,
          organization_id: organizationId,
        });
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    }
  };

  // ── Pool count estimate ───────────────────────────────────────────────────
  const { data: poolData } = useQuery({
    queryKey: ['totalPoolEstimate', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_talent_pool_estimate', { p_organization_id: organizationId });
      if (error) return 5000;
      return Number(data ?? 5000);
    },
    enabled: isOpen && !!organizationId,
    staleTime: 5 * 60_000,
  });

  const totalPool = poolData ?? 5000;

  // Reset on open
  useEffect(() => {
    if (isOpen) { setPhase('scanning'); setScannedCount(0); startRef.current = null; }
  }, [isOpen, job?.id]);

  // Scan animation → transition to results
  useEffect(() => {
    if (!isOpen || phase !== 'scanning') return;
    const target = totalPool || 500;
    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const t = Math.min((now - startRef.current) / SCAN_DURATION_MS, 1);
      setScannedCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        let checks = 0;
        const check = () => {
          checks++;
          if (!isLoadingRef.current || checks >= 150) setTimeout(() => setPhase('results'), 300);
          else setTimeout(check, 200);
        };
        check();
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isOpen, phase, totalPool]);

  if (!isOpen || !job) return null;

  return createPortal(
    <TooltipProvider delayDuration={100}>
      <div className="fixed inset-0 z-50 flex items-stretch"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
        <div className="relative flex flex-col w-full max-w-7xl mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: phase === 'scanning'
              ? 'linear-gradient(160deg, #0f0520 0%, #1a0940 50%, #0f0a28 100%)'
              : '#f8f9fb',
            animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
          <button onClick={onClose}
            className="absolute top-4 right-4 z-50 flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110"
            style={{ background: phase === 'scanning' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: phase === 'scanning' ? 'white' : 'white' }}>
            <X size={16} />
          </button>

          {phase === 'scanning' ? (
            <div className="flex-1 overflow-y-auto">
              <ScanningPhase jobTitle={job.title} totalPool={totalPool} jobSkills={jobSkills} scannedCount={scannedCount} />
            </div>
          ) : (
            <ResultsPhase
              candidates={matchData?.candidates ?? []}
              totalMatched={matchData?.total ?? 0}
              job={job}
              totalPool={totalPool}
              organizationId={organizationId}
              onClose={onClose}
              page={matchPage}
              pageSize={PAGE_SIZE}
              onPageChange={setMatchPage}
              isFetching={isFetching}
              wishlistIds={wishlistIds as string[]}
              onToggleWishlist={handleToggleWishlist}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.95) translateY(20px); }
          to   { opacity:1; transform:scale(1)    translateY(0);    }
        }
      `}</style>
</TooltipProvider>,
document.body
);
};

export default JobMatchModal;
