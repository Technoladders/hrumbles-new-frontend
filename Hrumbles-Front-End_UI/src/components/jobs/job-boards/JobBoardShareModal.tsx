// src/components/jobs/job-boards/JobBoardShareModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { BoardLogo } from "./BoardLogos";
import { cn } from "@/lib/utils";
import {
  X, Radio, Zap, CheckCircle2, Loader2, ArrowRight,
  Users, Globe, Clock, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, History, RefreshCw, Lock, Info,
} from "lucide-react";
import {
  JOB_BOARDS, recordPost, getJobPosts, formatPostedDate,
  type JobBoard, type PostRecord,
} from "./jobBoardsData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobData {
  id: string; title: string; job_id?: string;
  location: string | string[]; status?: string;
}
type Phase = "select" | "posting" | "done";
interface PostingResult { boardId: string; success: boolean; message: string; reach: number; }

// ─── Board row inside modal ───────────────────────────────────────────────────
const ModalBoardRow: React.FC<{
  board:        JobBoard;
  selected:     boolean;
  onToggle:     () => void;
  result?:      PostingResult;
  posting?:     boolean;
  prevPost?:    PostRecord;
  disabled?:    boolean;
}> = ({ board, selected, onToggle, result, posting, prevPost, disabled }) => {

  const getState = () => {
    if (result?.success)         return "success";
    if (result && !result.success) return "error";
    if (posting)                 return "posting";
    if (selected)                return "selected";
    return "idle";
  };
  const state = getState();

  const isComingSoon     = board.status === "coming_soon";
  const isNotConfigured  = board.status === "not_configured";
  const isBlocked        = isComingSoon || (isNotConfigured && !prevPost);

  return (
    <div
      onClick={() => !result && !posting && !disabled && !isBlocked && onToggle()}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
        isBlocked        && "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100",
        !isBlocked && !result && !posting && "cursor-pointer",
        state === "success"  && "bg-emerald-50  border-emerald-200",
        state === "error"    && "bg-red-50      border-red-200",
        state === "posting"  && "bg-purple-50   border-purple-200",
        state === "selected" && !result && !posting && "bg-purple-50 border-purple-200",
        state === "idle" && !isBlocked && "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg border border-slate-100 flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
        <BoardLogo boardId={board.id} size={16} />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 truncate">{board.name}</span>

          {/* Tier badge */}
          <span className={cn("text-[8px] font-medium px-1 py-0.5 rounded-full border flex-shrink-0",
            board.tier === "free"     ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
            board.tier === "freemium" ? "text-amber-700   border-amber-200   bg-amber-50" :
                                        "text-purple-700  border-purple-200  bg-purple-50",
          )}>
            {board.tierLabel}
          </span>

          {/* Blocked reasons */}
          {isComingSoon && (
            <span className="text-[8px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded-full border border-slate-200">
              Coming soon
            </span>
          )}
          {isNotConfigured && !prevPost && !isComingSoon && (
            <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5">
              <Lock size={7} /> Not configured
            </span>
          )}
        </div>

        {/* Sub info */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-slate-400">{board.region}</span>

          {/* Already posted */}
          {prevPost && !result && !posting && (
            <span className="flex items-center gap-0.5 text-[9px] text-blue-500">
              <History size={8} />
              Posted {formatPostedDate(prevPost.postedAt)}
            </span>
          )}

          {/* Live result message */}
          {result && (
            <span className={cn("text-[9px] font-medium",
              result.success ? "text-emerald-600" : "text-red-500")}>
              {result.message}
            </span>
          )}
          {posting && <span className="text-[9px] text-purple-500">Posting…</span>}
        </div>
      </div>

      {/* Stats */}
      {/* <div className="hidden sm:flex items-center gap-3 text-right">
        <div className="flex items-center gap-1">
          <Users size={9} className="text-slate-300" />
          <span className="text-[9px] text-slate-400">~{(board.estimatedReach / 1000).toFixed(1)}K</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={9} className="text-slate-300" />
          <span className="text-[9px] text-slate-400">{board.indexTime}</span>
        </div>
      </div> */}

      {/* Right indicator */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {state === "success"  && <CheckCircle2 size={14} className="text-emerald-500" />}
        {state === "error"    && <AlertCircle  size={14} className="text-red-400" />}
        {state === "posting"  && <Loader2      size={14} className="text-purple-500 animate-spin" />}
        {state === "selected" && !result && !posting && (
          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: "#9333ea" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#9333ea" }} />
          </div>
        )}
        {state === "idle" && !isBlocked && (
          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
        )}
        {state === "idle" && isBlocked && (
          <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
        )}
      </div>
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

    {/* Progress bar */}
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${total > 0 ? (current / total) * 100 : 0}%`,
          background: "linear-gradient(90deg, #9333ea, #ec4899)" }} />
    </div>

    {/* Logo parade */}
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

// ─── Success screen ───────────────────────────────────────────────────────────
const SuccessScreen: React.FC<{
  results: PostingResult[]; boards: JobBoard[];
  jobTitle: string; totalReach: number; onClose: () => void;
}> = ({ results, boards, jobTitle, totalReach, onClose }) => {
  const ok = results.filter(r => r.success);
  return (
    <div className="text-center space-y-4 py-2">
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 rounded-full opacity-20 animate-ping"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }} />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center border border-emerald-100"
          style={{ background: "linear-gradient(135deg, #10b98112, #05966912)" }}>
          <CheckCircle2 size={30} className="text-emerald-500" />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-800">
          Posted to {ok.length} board{ok.length !== 1 ? "s" : ""}
        </h3>
        <p className="text-[12px] text-slate-500 mt-0.5">
          <strong className="text-slate-700">{jobTitle}</strong> is now being distributed
        </p>
      </div>

      {/* Reach */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-100 bg-purple-50">
        <Globe size={13} className="text-purple-500" />
        <span className="text-sm font-bold text-purple-700">~{(totalReach / 1000).toFixed(1)}K</span>
        <span className="text-[11px] text-purple-500">estimated reach</span>
      </div>

      {/* Board logos */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {ok.map(r => {
          const board = boards.find(b => b.id === r.boardId);
          if (!board) return null;
          return (
            <div key={r.boardId} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white shadow-sm">
                <BoardLogo boardId={board.id} size={20} />
              </div>
              <span className="text-[8px] text-slate-400">{board.name}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
        Jobs may take up to 48h to appear on aggregator boards.
      </p>

      <button onClick={onClose}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
        style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}>
        Done
      </button>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────
interface JobBoardShareModalProps {
  job:      JobData;
  isOpen:   boolean;
  onClose:  () => void;
  onPosted?: (boardIds: string[]) => void;
}

export const JobBoardShareModal: React.FC<JobBoardShareModalProps> = ({
  job, isOpen, onClose, onPosted,
}) => {
  const [phase,       setPhase]       = useState<Phase>("select");
  const [selected,    setSelected]    = useState<string[]>([]);
  const [postingIdx,  setPostingIdx]  = useState(-1);
  const [results,     setResults]     = useState<PostingResult[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [prevPosts,   setPrevPosts]   = useState<Record<string, PostRecord>>({});

  // Load post history from localStorage on open
  useEffect(() => {
    if (isOpen) {
      setPhase("select");
      setSelected([]);
      setPostingIdx(-1);
      setResults([]);
      setPrevPosts(getJobPosts(job.id));
    }
  }, [isOpen, job.id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  const toggleBoard = useCallback((id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Boards that are postable: available, partial, or not_configured-but-previously-posted
  const canPost = (b: JobBoard) =>
    b.status === "available" || b.status === "partial" ||
    (b.status === "not_configured" && !!prevPosts[b.id]);

  const freeBoards    = JOB_BOARDS.filter(b => (b.tier === "free" || b.tier === "freemium"));
  const premiumBoards = JOB_BOARDS.filter(b => b.tier === "premium");

  const selectAllFree = () => {
    const ids = freeBoards.filter(canPost).map(b => b.id);
    const allSel = ids.every(id => selected.includes(id));
    setSelected(prev => allSel ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const startPosting = async () => {
    if (!selected.length) return;
    setPhase("posting");
    setPostingIdx(0);

    const boards = JOB_BOARDS.filter(b => selected.includes(b.id));
    const res: PostingResult[] = [];

    for (let i = 0; i < boards.length; i++) {
      setPostingIdx(i);
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      res.push({ boardId: boards[i].id, success: true, message: boards[i].status === "partial" ? "Feed updated" : "Posted", reach: boards[i].estimatedReach });
      setResults([...res]);
    }

    setPostingIdx(boards.length);
    await new Promise(r => setTimeout(r, 400));

    // Persist to localStorage
    recordPost(job.id, selected);

    setPhase("done");
    onPosted?.(selected);
  };

  const postingBoards  = JOB_BOARDS.filter(b => selected.includes(b.id));
  const totalReach     = postingBoards.reduce((s, b) => s + b.estimatedReach, 0);
  const location       = Array.isArray(job.location) ? job.location[0] : job.location;
  const alreadyPosted  = Object.keys(prevPosts).length;

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg pointer-events-auto rounded-2xl border border-slate-200
            bg-white shadow-2xl shadow-slate-200/80 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient top bar */}
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
                  <h2 className="text-sm font-bold text-slate-800">Broadcast Job</h2>
                  <p className="text-[10px] text-slate-400">Post to multiple job boards</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200
                  text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                <X size={13} />
              </button>
            </div>

            {/* Job pill */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-700 truncate block">{job.title}</span>
                <span className="text-[10px] text-slate-400">{job.job_id} · {location}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Previously posted summary */}
                {alreadyPosted > 0 && phase === "select" && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <History size={11} />
                    <span className="text-[10px] font-medium">{alreadyPosted} board{alreadyPosted !== 1 ? "s" : ""} before</span>
                  </div>
                )}
                {/* Selected reach */}
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
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">

            {/* ── SELECT ── */}
            {phase === "select" && (
              <div className="space-y-4">

                {/* Previously posted boards notice */}
                {alreadyPosted > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-blue-100 bg-blue-50">
                    <History size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-semibold text-blue-700">Previously posted</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        This job was posted to {alreadyPosted} board{alreadyPosted !== 1 ? "s" : ""} before.
                        Reposting will update listings and refresh timestamps.
                      </p>
                    </div>
                  </div>
                )}

                {/* Free & Freemium */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={11} className="text-emerald-500" />
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                        Free & Freemium
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {freeBoards.filter(b => selected.includes(b.id)).length}/{freeBoards.filter(canPost).length} selected
                      </span>
                    </div>
                    <button onClick={selectAllFree}
                      className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
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
                        posting={phase === "posting" && postingBoards[postingIdx]?.id === board.id}
                        prevPost={prevPosts[board.id]}
                        disabled={!canPost(board)}
                      />
                    ))}
                  </div>
                </div>

                {/* Premium — collapsible */}
                <div>
                  <button onClick={() => setShowPremium(v => !v)}
                    className="w-full flex items-center justify-between mb-2 group">
                    <div className="flex items-center gap-2">
                      <Zap size={11} className="text-purple-500" />
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                        Premium Boards
                      </span>
                      <span className="text-[9px] text-slate-400">Configure first to enable</span>
                    </div>
                    {showPremium
                      ? <ChevronUp size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      : <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    }
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

                {/* Configure reminder */}
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50">
                  <Info size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700">
                    Boards marked <strong>Not Configured</strong> need credentials in
                    <strong> Job Boards → Configure</strong> before posting.
                  </p>
                </div>
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
                      return (
                        <ModalBoardRow key={r.boardId} board={board} selected onToggle={() => {}} result={r} />
                      );
                    })}
                    {postingIdx < postingBoards.length && !results.find(r => r.boardId === postingBoards[postingIdx]?.id) && (
                      <ModalBoardRow
                        board={postingBoards[postingIdx]} selected onToggle={() => {}} posting />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <SuccessScreen
                results={results} boards={JOB_BOARDS} jobTitle={job.title}
                totalReach={results.reduce((s, r) => s + r.reach, 0)} onClose={onClose} />
            )}
          </div>

          {/* Footer */}
          {phase === "select" && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400">
                  {selected.length === 0
                    ? "Select boards above to broadcast"
                    : `${selected.length} board${selected.length !== 1 ? "s" : ""} · ~${(totalReach/1000).toFixed(1)}K est. reach`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200
                      hover:border-slate-300 hover:text-slate-700 transition-all">
                    Cancel
                  </button>
                  <button onClick={startPosting} disabled={selected.length === 0}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm",
                      selected.length === 0 ? "opacity-40 cursor-not-allowed bg-slate-400" : "hover:opacity-90 active:scale-95",
                    )}
                    style={selected.length > 0 ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" } : undefined}
                  >
                    <Radio size={11} />
                    Broadcast {selected.length > 0 ? `to ${selected.length}` : ""}
                    {selected.length > 0 && <ArrowRight size={11} />}
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