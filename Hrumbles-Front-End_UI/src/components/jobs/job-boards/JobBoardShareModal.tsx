// src/components/jobs/job-boards/JobBoardShareModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { BoardLogo } from "./BoardLogos";
import { cn } from "@/lib/utils";
import {
  X, Radio, Zap, CheckCircle2, Loader2, ArrowRight,
  Globe, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, History, Lock, Info, Pause, Play,
  ExternalLink, RefreshCw,
} from "lucide-react";
import {
  JOB_BOARDS, XML_FEED_BOARDS, API_PUSH_BOARDS,
  formatPostedDate,
  type JobBoard, type PostRecord,
} from "./jobBoardsData";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobData {
  id:              string;
  title:           string;
  job_id?:         string;
  location:        string | string[];
  status?:         string;
  description?:    string;
  budget?:         number | null;
  budget_type?:    string | null;
  job_type?:       string | null;
  client_details?: any;
}

type Phase = "select" | "review" | "posting" | "done";

interface PostingResult {
  boardId:  string;
  success:  boolean;
  message:  string;
  reach:    number;
}

interface ReviewFormData {
  title:       string;
  company:     string;
  city:        string;
  state:       string;
  country:     string;
  salaryMin:   string;
  salaryMax:   string;
  jobType:     string;
  isRemote:    boolean;
  description: string;
}

interface ExtendedPostRecord extends PostRecord {
  postId?:              string;
  externalJobId?:       string;
  externalJobUrl?:      string;
  syncStatus?:          string;
  override_title?:       string | null;
  override_company?:     string | null;
  override_city?:        string | null;
  override_state?:       string | null;
  override_country?:     string | null;
  override_salary_min?:  number | null;
  override_salary_max?:  number | null;
  override_description?: string | null;
  override_job_type?:    string | null;
  override_is_remote?:   boolean | null;
}

// ─── Error message parser ─────────────────────────────────────────────────────
function parseWjError(msg: any): string {
  if (!msg) return "WhatJobs API error";
  // Already a readable string
  if (typeof msg === "string") {
    try {
      const parsed = JSON.parse(msg);
      return parseWjError(parsed);
    } catch {
      return msg;
    }
  }
  // Nested object like { jobDescription: { jobDescription: ["..."] } }
  if (typeof msg === "object") {
    const firstKey = Object.keys(msg)[0];
    if (!firstKey) return "Validation error";
    const sub = msg[firstKey];
    if (typeof sub === "object" && !Array.isArray(sub)) {
      const subKey = Object.keys(sub)[0];
      if (subKey && Array.isArray(sub[subKey]) && sub[subKey][0]) {
        return `${firstKey}: ${sub[subKey][0]}`;
      }
    }
    if (Array.isArray(sub) && sub[0]) return `${firstKey}: ${sub[0]}`;
    return JSON.stringify(msg);
  }
  return String(msg);
}

// ─── Board row ────────────────────────────────────────────────────────────────
const ModalBoardRow: React.FC<{
  board:       JobBoard;
  selected:    boolean;
  onToggle:    () => void;
  result?:     PostingResult;
  posting?:    boolean;
  prevPost?:   ExtendedPostRecord;
  disabled?:   boolean;
  onPause?:    () => void;
  onActivate?: () => void;
  pausing?:    boolean;
}> = ({ board, selected, onToggle, result, posting, prevPost, disabled, onPause, onActivate, pausing }) => {

  const getState = () => {
    if (result?.success)           return "success";
    if (result && !result.success) return "error";
    if (posting)                   return "posting";
    if (selected)                  return "selected";
    return "idle";
  };

  const state = getState();

  const isComingSoon    = board.status === "coming_soon";
  // Visual blocked: coming soon, OR disabled API-push without prior post
  const isApiPush       = board.integrationMode === "api_push";
  const isBlocked       = isComingSoon
    || (isApiPush && disabled && !prevPost)
    || (board.status === "not_configured" && !isApiPush && !prevPost);

  const isPaused        = prevPost?.syncStatus === "paused";
  const isFailed        = prevPost?.syncStatus === "failed" && !result && !selected;
  // Only show pause button if last sync was actually successful
  const hasLiveExternal = !!prevPost?.externalJobId && prevPost?.syncStatus === "success";

  return (
    <div
      onClick={() => !result && !posting && !disabled && !isBlocked && onToggle()}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
        isBlocked         && "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100",
        !isBlocked && !result && !posting && !isFailed && "cursor-pointer",
        state === "success"  && "bg-emerald-50  border-emerald-200",
        state === "error"    && "bg-red-50      border-red-200",
        state === "posting"  && "bg-purple-50   border-purple-200",
        state === "selected" && !result && !posting && "bg-purple-50 border-purple-200",
        isPaused && !selected && !result   && "bg-amber-50  border-amber-200",
        isFailed                           && "bg-red-50/40 border-red-100",
        state === "idle" && !isBlocked && !isPaused && !isFailed && "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg border border-slate-100 flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
        <BoardLogo boardId={board.id} size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 truncate">{board.name}</span>

          {/* Tier */}
          <span className={cn(
            "text-[8px] font-medium px-1 py-0.5 rounded-full border flex-shrink-0",
            board.tier === "free"     ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
            board.tier === "freemium" ? "text-amber-700   border-amber-200   bg-amber-50"   :
                                        "text-purple-700  border-purple-200  bg-purple-50",
          )}>
            {board.tierLabel}
          </span>

          {/* Integration mode */}
          <span className={cn(
            "text-[8px] font-medium px-1 py-0.5 rounded-full border flex-shrink-0",
            board.integrationMode === "xml_feed" ? "text-blue-600 border-blue-100 bg-blue-50" :
            board.integrationMode === "api_push" ? "text-violet-600 border-violet-100 bg-violet-50" :
                                                    "text-slate-500 border-slate-200 bg-slate-50",
          )}>
            {board.integrationMode === "xml_feed" ? "XML Feed" :
             board.integrationMode === "api_push" ? "API Push" : "Manual"}
          </span>

          {/* Status badges */}
          {isPaused && (
            <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full border border-amber-200">
              Paused
            </span>
          )}
          {isFailed && (
            <span className="text-[8px] text-red-500 bg-red-50 px-1 py-0.5 rounded-full border border-red-200 flex items-center gap-0.5">
              <AlertCircle size={7} /> Last failed
            </span>
          )}
          {isComingSoon && (
            <span className="text-[8px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded-full border border-slate-200">
              Coming soon
            </span>
          )}
          {/* Configure first — for API push not configured AND for other not_configured */}
          {isBlocked && !isComingSoon && (
            <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5">
              <Lock size={7} /> Configure first
            </span>
          )}
        </div>

        {/* Sub-line */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-slate-400">{board.region}</span>

          {/* Status sub-text — only for non-failed, non-selected */}
          {prevPost && !result && !posting && !selected && (() => {
            if (prevPost.syncStatus === "failed") {
              return (
                <span className="flex items-center gap-0.5 text-[9px] text-red-400">
                  <RefreshCw size={8} /> Retry needed
                </span>
              );
            }
            if (prevPost.syncStatus === "paused") {
              return (
                <span className="flex items-center gap-0.5 text-[9px] text-amber-500">
                  <Pause size={8} /> Paused
                </span>
              );
            }
            if (prevPost.syncStatus === "success") {
              return (
                <span className="flex items-center gap-0.5 text-[9px] text-blue-500">
                  <History size={8} />
                  Posted {formatPostedDate(prevPost.postedAt)}
                </span>
              );
            }
            return null;
          })()}

          {/* External job URL */}
          {prevPost?.externalJobUrl && prevPost.syncStatus === "success" && !result && !posting && (
            <a
              href={prevPost.externalJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-0.5 text-[9px] text-purple-500 hover:text-purple-700"
            >
              <ExternalLink size={8} /> View live
            </a>
          )}

          {/* Result message */}
          {result && (
            <span className={cn("text-[9px] font-medium",
              result.success ? "text-emerald-600" : "text-red-500")}>
              {result.message}
            </span>
          )}

          {posting && <span className="text-[9px] text-purple-500">Posting…</span>}
        </div>
      </div>

      {/* Pause/Activate — only for live API push posts */}
      {hasLiveExternal && !result && !posting && !selected && (
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isPaused ? (
            <button
              onClick={onActivate}
              disabled={pausing}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-medium
                text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
            >
              {pausing ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
              Activate
            </button>
          ) : (
            <button
              onClick={onPause}
              disabled={pausing}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-medium
                text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50"
            >
              {pausing ? <Loader2 size={9} className="animate-spin" /> : <Pause size={9} />}
              Pause
            </button>
          )}
        </div>
      )}

      {/* Right indicator */}
      {(!hasLiveExternal || selected || result) && (
        <div className="flex-shrink-0 w-5 flex items-center justify-center">
          {state === "success"  && <CheckCircle2 size={14} className="text-emerald-500" />}
          {state === "error"    && <AlertCircle  size={14} className="text-red-400" />}
          {state === "posting"  && <Loader2      size={14} className="text-purple-500 animate-spin" />}
          {state === "selected" && !result && !posting && (
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#9333ea" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#9333ea" }} />
            </div>
          )}
          {state === "idle" && !isBlocked && !hasLiveExternal && (
            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
          )}
          {state === "idle" && isBlocked && (
            <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
          )}
        </div>
      )}
    </div>
  );
};

// ─── Posting progress ─────────────────────────────────────────────────────────
const PostingProgress: React.FC<{
  boards: JobBoard[]; current: number; total: number;
}> = ({ boards, current, total }) => (
  <div className="space-y-4 py-2">
    <div className="text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 border border-purple-100"
        style={{ background: "linear-gradient(135deg, #9333ea10, #ec489910)" }}>
        <Radio size={24} className="text-purple-500 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-800">Broadcasting job…</p>
      <p className="text-[11px] text-slate-400 mt-0.5">Posting to {total} board{total !== 1 ? "s" : ""}</p>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{
          width:      `${total > 0 ? (current / total) * 100 : 0}%`,
          background: "linear-gradient(90deg, #9333ea, #ec4899)",
        }} />
    </div>
    <div className="flex items-center justify-center gap-2 flex-wrap min-h-[36px]">
      {boards.slice(0, current).map(b => (
        <div key={b.id}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white shadow-sm animate-in zoom-in-50 duration-300">
          <BoardLogo boardId={b.id} size={16} />
        </div>
      ))}
      {current < total && (
        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Loader2 size={11} className="text-slate-400 animate-spin" />
        </div>
      )}
    </div>
    <p className="text-center text-[10px] text-slate-400">{current} / {total} completed</p>
  </div>
);

// ─── Review form ──────────────────────────────────────────────────────────────
const ReviewForm: React.FC<{
  form:        ReviewFormData;
  onChange:    (f: ReviewFormData) => void;
  isWhatJobs?: boolean;
}> = ({ form, onChange, isWhatJobs }) => {
  const set = (key: keyof ReviewFormData, val: any) => onChange({ ...form, [key]: val });

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 " +
    "placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all";
  const labelCls = "block text-[10px] font-semibold text-slate-500 mb-1";

  const wordCount   = form.description.trim().split(/\s+/).filter(Boolean).length;
  const minWords    = isWhatJobs ? 150 : 0;
  const descOk      = isWhatJobs ? wordCount >= 150 : form.description.length >= 50;

  return (
    <div className="space-y-3">
      {/* Title */}
      <div>
        <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
        <input className={inputCls} value={form.title}
          onChange={e => set("title", e.target.value)} placeholder="e.g. Senior React Developer" />
        {form.title && !/^[a-zA-Z]/.test(form.title) && (
          <p className="text-[9px] text-red-400 mt-0.5">Must start with a letter (WhatJobs requirement)</p>
        )}
      </div>

      {/* Company */}
      <div>
        <label className={labelCls}>Company Name <span className="text-red-400">*</span></label>
        <input className={inputCls} value={form.company}
          onChange={e => set("company", e.target.value)} placeholder="e.g. Acme Pvt Ltd" />
      </div>

      {/* Location */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={form.city}
            onChange={e => set("city", e.target.value)} placeholder="Delhi" />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} value={form.state}
            onChange={e => set("state", e.target.value)} placeholder="Maharashtra" />
        </div>
        <div>
          <label className={labelCls}>Country</label>
          <input className={inputCls} value={form.country}
            onChange={e => set("country", e.target.value)} placeholder="India" />
        </div>
      </div>

      {/* Remote toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => set("isRemote", !form.isRemote)}
          className={cn(
            "relative w-8 h-4 rounded-full transition-colors duration-200",
            form.isRemote ? "bg-purple-500" : "bg-slate-300",
          )}
        >
          <span className={cn(
            "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200",
            form.isRemote ? "translate-x-4" : "translate-x-0.5",
          )} />
        </button>
        <label className={labelCls + " mb-0"}>Remote position</label>
      </div>

      {/* Job type */}
      <div>
        <label className={labelCls}>Job Type</label>
        <select className={inputCls} value={form.jobType} onChange={e => set("jobType", e.target.value)}>
          <option>Full time</option>
          <option>Part time</option>
          <option>Contract</option>
          <option>Internship</option>
          <option>Temporary</option>
        </select>
      </div>

      {/* Salary */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Salary Min (₹/yr) <span className="text-slate-400">optional</span></label>
          <input className={inputCls} value={form.salaryMin} type="number"
            onChange={e => set("salaryMin", e.target.value)} placeholder="e.g. 1200000" />
        </div>
        <div>
          <label className={labelCls}>Salary Max (₹/yr) <span className="text-slate-400">optional</span></label>
          <input className={inputCls} value={form.salaryMax} type="number"
            onChange={e => set("salaryMax", e.target.value)} placeholder="e.g. 1800000" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>
          Description <span className="text-red-400">*</span>
          {isWhatJobs && (
            <span className="text-slate-400 font-normal ml-1">
              (min 150 words for WhatJobs)
            </span>
          )}
        </label>
        <textarea
          className={inputCls + " min-h-[120px] resize-y"}
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Job description shown on job boards…"
        />
        <div className="flex items-center justify-between mt-0.5">
          <p className={cn("text-[9px]", descOk ? "text-slate-400" : "text-red-400")}>
            {isWhatJobs
              ? `${wordCount} words ${!descOk ? `(need ${minWords - wordCount} more words)` : "✓"}`
              : `${form.description.length} chars ${!descOk ? "(need 50+)" : "✓"}`}
          </p>
          {isWhatJobs && !descOk && (
            <p className="text-[9px] text-amber-500">
              WhatJobs requires minimum 150 words
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Done screen (success + errors combined) ───────────────────────────────────
const DoneScreen: React.FC<{
  results:  PostingResult[];
  boards:   JobBoard[];
  jobTitle: string;
  onClose:  () => void;
}> = ({ results, boards, jobTitle, onClose }) => {
  const ok       = results.filter(r => r.success);
  const failed   = results.filter(r => !r.success);
  const allFailed = ok.length === 0;
  const totalReach = ok.reduce((s, r) => s + r.reach, 0);

  return (
    <div className="text-center space-y-4 py-2">
      {/* Icon */}
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 rounded-full opacity-20 animate-ping"
          style={{ background: allFailed
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #10b981, #059669)" }} />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center border"
          style={{
            borderColor: allFailed ? "#fecaca" : "#a7f3d0",
            background:  allFailed
              ? "linear-gradient(135deg, #ef444412, #dc262612)"
              : "linear-gradient(135deg, #10b98112, #05966912)",
          }}>
          {allFailed
            ? <AlertCircle size={30} className="text-red-500" />
            : <CheckCircle2 size={30} className="text-emerald-500" />}
        </div>
      </div>

      {/* Summary */}
      <div>
        <h3 className="text-base font-bold text-slate-800">
          {allFailed
            ? "Posting failed"
            : ok.length === results.length
              ? `Posted to ${ok.length} board${ok.length !== 1 ? "s" : ""}`
              : `${ok.length} posted · ${failed.length} failed`}
        </h3>
        <p className="text-[12px] text-slate-500 mt-0.5">
          <strong className="text-slate-700">{jobTitle}</strong>
        </p>
      </div>

      {/* Reach */}
      {ok.length > 0 && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-100 bg-purple-50">
          <Globe size={13} className="text-purple-500" />
          <span className="text-sm font-bold text-purple-700">~{(totalReach / 1000).toFixed(1)}K</span>
          <span className="text-[11px] text-purple-500">estimated reach</span>
        </div>
      )}

      {/* Successful boards */}
      {ok.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {ok.map(r => {
            const board = boards.find(b => b.id === r.boardId);
            if (!board) return null;
            return (
              <div key={r.boardId} className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-emerald-200 bg-emerald-50 shadow-sm">
                  <BoardLogo boardId={board.id} size={20} />
                </div>
                <span className="text-[8px] text-slate-400">{board.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Failed boards with error details */}
      {failed.length > 0 && (
        <div className="space-y-2 text-left">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">
            Failed · {failed.length} board{failed.length !== 1 ? "s" : ""}
          </p>
          {failed.map(r => {
            const board = boards.find(b => b.id === r.boardId);
            if (!board) return null;
            return (
              <div key={r.boardId}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-200 bg-white flex-shrink-0 mt-0.5">
                  <BoardLogo boardId={board.id} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-red-700">{board.name}</p>
                  <p className="text-[10px] text-red-500 leading-relaxed break-words mt-0.5">
                    {r.message}
                  </p>
                </div>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              </div>
            );
          })}
        </div>
      )}

      {!allFailed && (
        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
          XML-feed boards update within 24–48h. WhatJobs is instant.
        </p>
      )}

      <button onClick={onClose}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
        style={{ background: allFailed
          ? "linear-gradient(135deg, #ef4444, #dc2626)"
          : "linear-gradient(135deg, #9333ea, #ec4899)" }}>
        {allFailed ? "Close" : "Done"}
      </button>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────
interface JobBoardShareModalProps {
  job:       JobData;
  isOpen:    boolean;
  onClose:   () => void;
  onPosted?: (boardIds: string[]) => void;
}

export const JobBoardShareModal: React.FC<JobBoardShareModalProps> = ({
  job, isOpen, onClose, onPosted,
}) => {
  const [phase,            setPhase]            = useState<Phase>("select");
  const [selected,         setSelected]         = useState<string[]>([]);
  const [postingIdx,       setPostingIdx]        = useState(-1);
  const [results,          setResults]          = useState<PostingResult[]>([]);
  const [showPremium,      setShowPremium]      = useState(false);
  const [prevPosts,        setPrevPosts]        = useState<Record<string, ExtendedPostRecord>>({});
  const [loading,          setLoading]          = useState(false);
  const [orgProfile,       setOrgProfile]       = useState<any>(null);
  const [reviewForms,      setReviewForms]      = useState<Record<string, ReviewFormData>>({});
  const [configuredBoards, setConfiguredBoards] = useState<string[]>([]);
  const [pausingBoard,     setPausingBoard]     = useState<string | null>(null);

  const user            = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // ── Load on open ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !job.id) return;
    setPhase("select");
    setSelected([]);
    setPostingIdx(-1);
    setResults([]);
    setLoading(true);

    Promise.all([
      supabase
        .from("hr_job_board_posts")
        .select("id, board_id, posted_at, reach, is_active, sync_status, external_job_id, external_job_url, override_title, override_company, override_city, override_state, override_country, override_salary_min, override_salary_max, override_description, override_job_type, override_is_remote")
        .eq("job_id", job.id)
        .eq("is_active", true),
      supabase
        .from("hr_organization_profile")
        .select("company_name, logo_url, website, city, state, country")
        .eq("organization_id", organization_id)
        .single(),
      supabase
        .from("hr_job_board_configs")
        .select("board_id")
        .eq("organization_id", organization_id)
        .eq("is_active", true),
    ]).then(([postsRes, profileRes, configsRes]) => {
      if (!postsRes.error && postsRes.data) {
        const history: Record<string, ExtendedPostRecord> = {};
        postsRes.data.forEach((row: any) => {
          history[row.board_id] = {
            boardId:              row.board_id,
            postedAt:             row.posted_at,
            reach:                row.reach,
            isActive:             row.is_active,
            postId:               row.id,
            externalJobId:        row.external_job_id,
            externalJobUrl:       row.external_job_url,
            syncStatus:           row.sync_status,
            override_title:       row.override_title,
            override_company:     row.override_company,
            override_city:        row.override_city,
            override_state:       row.override_state,
            override_country:     row.override_country,
            override_salary_min:  row.override_salary_min,
            override_salary_max:  row.override_salary_max,
            override_description: row.override_description,
            override_job_type:    row.override_job_type,
            override_is_remote:   row.override_is_remote,
          };
        });
        setPrevPosts(history);
      }
      if (!profileRes.error && profileRes.data) setOrgProfile(profileRes.data);
      if (!configsRes.error && configsRes.data) {
        setConfiguredBoards(configsRes.data.map((r: any) => r.board_id));
      }
      setLoading(false);
    });
  }, [isOpen, job.id, organization_id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  const toggleBoard = useCallback((id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // ── Dynamic canPost ───────────────────────────────────────────────────────────
  const canPost = useCallback((b: JobBoard): boolean => {
    if (b.status === "coming_soon") return false;
    if (b.integrationMode === "xml_feed") return b.status === "available" || b.status === "partial";
    if (b.integrationMode === "api_push") return configuredBoards.includes(b.id) || !!prevPosts[b.id];
    return b.status === "available" || b.status === "not_configured";
  }, [configuredBoards, prevPosts]);

  const freeBoards    = JOB_BOARDS.filter(b => b.tier === "free" || b.tier === "freemium");
  const premiumBoards = JOB_BOARDS.filter(b => b.tier === "premium");

  const selectAllFree = () => {
    const ids    = freeBoards.filter(canPost).map(b => b.id);
    const allSel = ids.every(id => selected.includes(id));
    setSelected(prev => allSel
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]);
  };

  // ── Pause / Activate ──────────────────────────────────────────────────────────
  const handleWhatJobsCommand = async (boardId: string, command: "pause" | "activate") => {
    const prevPost = prevPosts[boardId];
    if (!prevPost?.postId) return;
    setPausingBoard(boardId);
    try {
      const { data, error } = await supabase.functions.invoke("whatjobs-post", {
        body: { job_board_post_id: prevPost.postId, command },
      });
      if (!error && data?.success) {
        toast.success(`Job ${command === "pause" ? "paused on" : "activated on"} WhatJobs`);
        setPrevPosts(prev => ({
          ...prev,
          [boardId]: { ...prev[boardId], syncStatus: command === "pause" ? "paused" : "success" },
        }));
      } else {
        const errMsg = parseWjError(data?.message || data?.error || "Failed");
        toast.error(errMsg);
      }
    } catch {
      toast.error("Error calling WhatJobs API");
    } finally {
      setPausingBoard(null);
    }
  };

  const REVIEW_BOARDS = [...XML_FEED_BOARDS, ...API_PUSH_BOARDS];

  const handleBroadcastClick = () => {
    const reviewNeeded = selected.filter(id => REVIEW_BOARDS.includes(id));
    if (reviewNeeded.length > 0) {
      const forms: Record<string, ReviewFormData> = {};
      reviewNeeded.forEach(boardId => {
        const prevPost = prevPosts[boardId];
        forms[boardId] = buildReviewDefaults(job, orgProfile);
        if (prevPost?.override_title)       forms[boardId].title       = prevPost.override_title!;
        if (prevPost?.override_company)     forms[boardId].company     = prevPost.override_company!;
        if (prevPost?.override_city)        forms[boardId].city        = prevPost.override_city!;
        if (prevPost?.override_state)       forms[boardId].state       = prevPost.override_state!;
        if (prevPost?.override_country)     forms[boardId].country     = prevPost.override_country!;
        if (prevPost?.override_salary_min)  forms[boardId].salaryMin   = String(prevPost.override_salary_min);
        if (prevPost?.override_salary_max)  forms[boardId].salaryMax   = String(prevPost.override_salary_max);
        if (prevPost?.override_description) forms[boardId].description = prevPost.override_description!;
        if (prevPost?.override_job_type)    forms[boardId].jobType     = prevPost.override_job_type!;
        if (prevPost?.override_is_remote != null) forms[boardId].isRemote = prevPost.override_is_remote!;
      });
      setReviewForms(forms);
      setPhase("review");
    } else {
      startPosting({});
    }
  };

  // ── Build review defaults ─────────────────────────────────────────────────────
  function buildReviewDefaults(job: JobData, orgProfile: any): ReviewFormData {
    const locArr   = Array.isArray(job.location) ? job.location : [job.location || ""];
    const loc      = locArr[0] || "";
    const parts    = loc.split(",").map((s: string) => s.trim());
    const isRemote = locArr.some(l => l.toLowerCase().includes("remote"));

    let company = "";
    try {
      const cd = typeof job.client_details === "string"
        ? JSON.parse(job.client_details) : (job.client_details || {});
      company = cd?.clientName?.trim() || "";
    } catch {}
    if (!company && orgProfile?.company_name) company = orgProfile.company_name;

    let salaryMin = "";
    let salaryMax = "";
    if (job.budget) {
      const b = Number(job.budget);
      if (!(job.budget_type === "LPA" && b > 500)) {
        salaryMin = String(b);
        salaryMax = String(b);
      }
    }

    const jt = (job.job_type || "").toLowerCase();
    const jobType = jt.includes("part") ? "Part time"
      : jt.includes("contract") ? "Contract"
      : jt.includes("internship") ? "Internship"
      : "Full time";

    return {
      title:       job.title || "",
      company,
      city:        parts[0] || "",
      state:       parts[1] || "",
      country:     parts[2] || "India",
      salaryMin,
      salaryMax,
      jobType,
      isRemote,
      description: job.description || "",
    };
  }

  // ── Start posting ─────────────────────────────────────────────────────────────
  const startPosting = async (overrides: Record<string, ReviewFormData>) => {
    setPhase("posting");
    setPostingIdx(0);

    const boards = JOB_BOARDS.filter(b => selected.includes(b.id));
    const res: PostingResult[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < boards.length; i++) {
      setPostingIdx(i);
      const board = boards[i];
      const form  = overrides[board.id];
      const isXml = XML_FEED_BOARDS.includes(board.id);
      const isApi = API_PUSH_BOARDS.includes(board.id);

      const upsertData: any = {
        job_id:          job.id,
        organization_id: organization_id,
        board_id:        board.id,
        posted_at:       now,
        posted_by:       user?.id ?? null,
        reach:           board.estimatedReach,
        is_active:       true,
        sync_status:     "pending",
      };

      if ((isXml || isApi) && form) {
        upsertData.override_title       = form.title       !== job.title       ? form.title       : null;
        upsertData.override_company     = form.company     || null;
        upsertData.override_city        = form.city        || null;
        upsertData.override_state       = form.state       || null;
        upsertData.override_country     = form.country     || null;
        upsertData.override_salary_min  = form.salaryMin   ? Number(form.salaryMin)  : null;
        upsertData.override_salary_max  = form.salaryMax   ? Number(form.salaryMax)  : null;
        upsertData.override_description = form.description !== job.description ? form.description : null;
        upsertData.override_job_type    = form.jobType     || null;
        upsertData.override_is_remote   = form.isRemote;
      }

      const { data: upsertResult, error: upsertErr } = await supabase
        .from("hr_job_board_posts")
        .upsert(upsertData, { onConflict: "job_id,board_id" })
        .select("id")
        .single();

      if (upsertErr || !upsertResult) {
        res.push({ boardId: board.id, success: false, message: "Failed to save record", reach: board.estimatedReach });
        setResults([...res]);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      if (isApi && board.id === "whatjobs") {
        const prevWjPost = prevPosts["whatjobs"] as ExtendedPostRecord | undefined;
        // Only update if previous post was ACTUALLY successful on WhatJobs side
        const isRepost = !!(prevWjPost?.externalJobId) && prevWjPost?.syncStatus === "success";
        const command  = isRepost ? "update" : "add";

        const { data: wjData, error: wjErr } = await supabase.functions.invoke("whatjobs-post", {
          body: { job_board_post_id: upsertResult.id, command },
        });

        const wjSuccess = !wjErr && wjData?.success === true;
        const wjMessage = wjSuccess
          ? (wjData?.external_url ? "Live on WhatJobs" : "Posted to WhatJobs")
          : parseWjError(wjData?.message || wjErr?.message || "WhatJobs API error");

        res.push({
          boardId: board.id,
          success: wjSuccess,
          message: wjMessage,
          reach:   board.estimatedReach,
        });
      } else {
        res.push({
          boardId: board.id,
          success: true,
          message: isXml ? "Feed updated" : "Posted",
          reach:   board.estimatedReach,
        });
      }

      setResults([...res]);
      await new Promise(r => setTimeout(r, 350));
    }

    setPostingIdx(boards.length);
    await new Promise(r => setTimeout(r, 300));
    setPhase("done");
    onPosted?.(selected);
  };

  const postingBoards     = JOB_BOARDS.filter(b => selected.includes(b.id));
  const totalReach        = postingBoards.reduce((s, b) => s + b.estimatedReach, 0);
  const location          = Array.isArray(job.location) ? job.location[0] : job.location;
  const alreadyPosted     = Object.keys(prevPosts).filter(k => prevPosts[k].syncStatus !== "failed").length;
  const selectedReviewIds = selected.filter(id => REVIEW_BOARDS.includes(id));
  const reviewBoardNames  = selectedReviewIds
    .map(id => JOB_BOARDS.find(b => b.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const hasWhatJobsInReview = selectedReviewIds.includes("whatjobs");

  const currentReviewForm = reviewForms[selectedReviewIds[0]];
  const reviewWordCount   = (currentReviewForm?.description || "").trim().split(/\s+/).filter(Boolean).length;

  const reviewFormValid = selectedReviewIds.length === 0 || (
    !!currentReviewForm?.title &&
    /^[a-zA-Z]/.test(currentReviewForm?.title || "") &&
    !!currentReviewForm?.company &&
    (hasWhatJobsInReview
      ? reviewWordCount >= 150
      : (currentReviewForm?.description?.length || 0) >= 50)
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg pointer-events-auto rounded-2xl border border-slate-200
            bg-white shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, #9333ea, #ec4899)" }} />

          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}>
                  <Radio size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {phase === "review" ? "Review Job Details" : "Broadcast Job"}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    {phase === "review"
                      ? "Auto-filled — edit anything before posting"
                      : "Post to multiple job boards"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {phase === "review" && (
                  <button onClick={() => setPhase("select")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-500
                      border border-slate-200 hover:border-slate-300 transition-all">
                    ← Back
                  </button>
                )}
                <button onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200
                    text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Job pill */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-700 truncate block">{job.title}</span>
                <span className="text-[10px] text-slate-400">{job.job_id} · {location}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {alreadyPosted > 0 && phase === "select" && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <History size={11} />
                    <span className="text-[10px] font-medium">{alreadyPosted} live</span>
                  </div>
                )}
                {selected.length > 0 && phase === "select" && (
                  <div className="flex items-center gap-1">
                    <Globe size={11} className="text-purple-500" />
                    <span className="text-[11px] font-semibold text-purple-600">
                      ~{(totalReach / 1000).toFixed(1)}K
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">

            {loading && phase === "select" && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            )}

            {/* ── SELECT ── */}
            {!loading && phase === "select" && (
              <div className="space-y-4">
                {alreadyPosted > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-blue-100 bg-blue-50">
                    <History size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-semibold text-blue-700">
                        Live on {alreadyPosted} board{alreadyPosted !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        Reposting refreshes the listing. Use Pause to hide without removing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Free & Freemium */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={11} className="text-emerald-500" />
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Free & Freemium</span>
                      <span className="text-[9px] text-slate-400">
                        {freeBoards.filter(b => selected.includes(b.id)).length}/{freeBoards.filter(canPost).length} selected
                      </span>
                    </div>
                    <button onClick={selectAllFree}
                      className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80">
                      {freeBoards.filter(canPost).every(b => selected.includes(b.id)) ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {freeBoards.map(board => (
                      <ModalBoardRow
                        key={board.id}
                        board={board}
                        selected={selected.includes(board.id)}
                        onToggle={() => toggleBoard(board.id)}
                        result={results.find(r => r.boardId === board.id)}
                        prevPost={prevPosts[board.id]}
                        disabled={!canPost(board)}
                        onPause={board.integrationMode === "api_push"
                          ? () => handleWhatJobsCommand(board.id, "pause") : undefined}
                        onActivate={board.integrationMode === "api_push"
                          ? () => handleWhatJobsCommand(board.id, "activate") : undefined}
                        pausing={pausingBoard === board.id}
                      />
                    ))}
                  </div>
                </div>

                {/* Premium */}
                <div>
                  <button onClick={() => setShowPremium(v => !v)}
                    className="w-full flex items-center justify-between mb-2 group">
                    <div className="flex items-center gap-2">
                      <Zap size={11} className="text-purple-500" />
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Premium Boards</span>
                      <span className="text-[9px] text-slate-400">Configure first to enable</span>
                    </div>
                    {showPremium
                      ? <ChevronUp  size={13} className="text-slate-400 group-hover:text-slate-600" />
                      : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
                  </button>
                  {showPremium && (
                    <div className="space-y-1.5">
                      {premiumBoards.map(board => (
                        <ModalBoardRow
                          key={board.id}
                          board={board}
                          selected={selected.includes(board.id)}
                          onToggle={() => toggleBoard(board.id)}
                          result={results.find(r => r.boardId === board.id)}
                          prevPost={prevPosts[board.id]}
                          disabled={!canPost(board)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50">
                  <Info size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700">
                    Boards showing <strong>Configure first</strong> need API credentials saved in{" "}
                    <strong>Job Boards → Configure</strong> before posting.
                  </p>
                </div>
              </div>
            )}

            {/* ── REVIEW ── */}
            {phase === "review" && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-purple-100 bg-purple-50">
                  <Info size={12} className="text-purple-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-purple-700">
                    Details for <strong>{reviewBoardNames}</strong>. Auto-filled — edit anything before posting.
                    {hasWhatJobsInReview && (
                      <span className="block mt-0.5 text-violet-600">
                        WhatJobs requires job title starting with a letter and description ≥ 150 words.
                      </span>
                    )}
                  </p>
                </div>
                <ReviewForm
                  form={reviewForms[selectedReviewIds[0]] || buildReviewDefaults(job, orgProfile)}
                  onChange={(f) => {
                    const updated: Record<string, ReviewFormData> = {};
                    selectedReviewIds.forEach(id => { updated[id] = f; });
                    setReviewForms(prev => ({ ...prev, ...updated }));
                  }}
                  isWhatJobs={hasWhatJobsInReview}
                />
              </div>
            )}

            {/* ── POSTING ── */}
            {phase === "posting" && (
              <div className="space-y-4">
                <PostingProgress boards={postingBoards} current={postingIdx} total={postingBoards.length} />
                {results.length > 0 && (
                  <div className="space-y-1.5">
                    {results.map(r => {
                      const board = JOB_BOARDS.find(b => b.id === r.boardId);
                      if (!board) return null;
                      return <ModalBoardRow key={r.boardId} board={board} selected onToggle={() => {}} result={r} />;
                    })}
                    {postingIdx < postingBoards.length && !results.find(r => r.boardId === postingBoards[postingIdx]?.id) && (
                      <ModalBoardRow board={postingBoards[postingIdx]} selected onToggle={() => {}} posting />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <DoneScreen
                results={results}
                boards={JOB_BOARDS}
                jobTitle={job.title}
                onClose={onClose}
              />
            )}
          </div>

          {/* Footer — SELECT */}
          {phase === "select" && !loading && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400">
                  {selected.length === 0
                    ? "Select boards above to broadcast"
                    : `${selected.length} board${selected.length !== 1 ? "s" : ""} · ~${(totalReach / 1000).toFixed(1)}K est. reach`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:border-slate-300 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleBroadcastClick}
                    disabled={selected.length === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm",
                      selected.length === 0 ? "opacity-40 cursor-not-allowed bg-slate-400" : "hover:opacity-90 active:scale-95",
                    )}
                    style={selected.length > 0 ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" } : undefined}
                  >
                    <Radio size={11} />
                    {selectedReviewIds.length > 0 ? "Review & Broadcast" : `Broadcast to ${selected.length}`}
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer — REVIEW */}
          {phase === "review" && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400">
                  {selected.length - selectedReviewIds.length > 0 &&
                    `+${selected.length - selectedReviewIds.length} more board${selected.length - selectedReviewIds.length !== 1 ? "s" : ""} will also post`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPhase("select")}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:border-slate-300 transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={() => startPosting(reviewForms)}
                    disabled={!reviewFormValid}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm",
                      !reviewFormValid ? "opacity-40 cursor-not-allowed bg-slate-400" : "hover:opacity-90 active:scale-95",
                    )}
                    style={reviewFormValid ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" } : undefined}
                  >
                    <Radio size={11} />
                    Confirm & Broadcast
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};