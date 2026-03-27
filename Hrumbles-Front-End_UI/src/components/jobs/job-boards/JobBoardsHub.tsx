// src/components/jobs/job-boards/JobBoardsHub.tsx
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Radio, Zap, Settings, Search,
  LayoutGrid, List, Sparkles, ArrowUpRight, Clock, Info,
} from "lucide-react";
import { ConfigureModal } from "./ConfigureModal";
import { BoardLogo } from "./BoardLogos";
import {
  JOB_BOARDS, BOARDS_COUNT, FREE_REACH,
  type JobBoard,
} from "./jobBoardsData";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  available:      { label: "Ready",        dot: "bg-blue-400",  pill: "bg-blue-50   text-blue-600   border-blue-100"  },
  partial:        { label: "Feed Ready",   dot: "bg-amber-400", pill: "bg-amber-50  text-amber-700  border-amber-100", pulse: true },
  not_configured: { label: "Setup needed", dot: "bg-slate-300", pill: "bg-slate-50  text-slate-500  border-slate-200" },
  coming_soon:    { label: "Coming soon",  dot: "bg-slate-200", pill: "bg-slate-50  text-slate-400  border-slate-100" },
};

const TIER_CLS = {
  free:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  freemium: "bg-amber-50   text-amber-700   border-amber-200",
  premium:  "bg-purple-50  text-purple-700  border-purple-200",
};

// ─── Board card ───────────────────────────────────────────────────────────────
const BoardCard: React.FC<{ board: JobBoard; onConfigure: () => void }> = ({ board, onConfigure }) => {
  const st = STATUS[board.status];
  const isComingSoon = board.status === "coming_soon";

  return (
    <div className={cn(
      "group bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center text-center transition-all duration-200",
      isComingSoon ? "opacity-50" : "hover:border-slate-300 hover:shadow-md",
    )}>
      {/* Logo */}
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-sm border border-slate-100",
          isComingSoon && "opacity-40 grayscale",
          board.status === "not_configured" && "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300",
        )}
        style={{ background: `${board.brandColor}0E` }}
      >
        <BoardLogo boardId={board.id} size={36} />
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-slate-800 mb-0.5">{board.name}</p>

      {/* Region + tier */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[9px] text-slate-400">{board.region}</span>
        <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", TIER_CLS[board.tier])}>
          {board.tierLabel}
        </span>
      </div>

      {/* Status pill */}
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border mb-4", st.pill)}>
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", st.dot, (st as any).pulse && "animate-pulse")} />
        <span className="text-[10px] font-medium">{st.label}</span>
      </div>

      {/* Action button */}
      {!isComingSoon ? (
        <button
          onClick={onConfigure}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all duration-200",
            board.status === "partial"
              ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
              : board.status === "available"
              ? "border-slate-200 text-slate-600 hover:border-purple-200 hover:text-purple-600 hover:bg-purple-50"
              : "border-dashed border-slate-200 text-slate-400 hover:border-purple-200 hover:text-purple-500 hover:bg-purple-50",
          )}
        >
          <Settings size={11} />
          {board.status === "partial" ? "View Setup" :
           board.status === "available" ? "Setup Feed" : "Configure"}
        </button>
      ) : (
        <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-100 bg-slate-50">
          <Clock size={10} className="text-slate-300" />
          <span className="text-[10px] text-slate-400">Coming soon</span>
        </div>
      )}
    </div>
  );
};

// ─── List row ─────────────────────────────────────────────────────────────────
const ListRow: React.FC<{ board: JobBoard; onConfigure: () => void }> = ({ board, onConfigure }) => {
  const st = STATUS[board.status];
  const isComingSoon = board.status === "coming_soon";

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 transition-all",
      isComingSoon ? "opacity-50" : "hover:border-slate-300 hover:shadow-sm",
    )}>
      {/* Logo */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden",
          isComingSoon && "grayscale opacity-40",
          board.status === "not_configured" && "grayscale opacity-60",
        )}
        style={{ background: `${board.brandColor}0E` }}
      >
        <BoardLogo boardId={board.id} size={24} />
      </div>

      {/* Name + tagline */}
      <div className="w-44 flex-shrink-0">
        <p className="text-sm font-semibold text-slate-700">{board.name}</p>
        <p className="text-[10px] text-slate-400 truncate">{board.tagline}</p>
      </div>

      <p className="hidden md:block flex-1 text-[10px] text-slate-400">{board.region}</p>

      <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full border hidden sm:inline", TIER_CLS[board.tier])}>
        {board.tierLabel}
      </span>

      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border min-w-[110px] justify-center", st.pill)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", st.dot, (st as any).pulse && "animate-pulse")} />
        <span className="text-[10px] font-medium">{st.label}</span>
      </div>

      {!isComingSoon ? (
        <button
          onClick={onConfigure}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500
            hover:border-purple-200 hover:text-purple-600 hover:bg-purple-50 transition-all flex-shrink-0"
        >
          <Settings size={11} /> Configure
        </button>
      ) : (
        <div className="w-24 flex items-center justify-center">
          <Clock size={12} className="text-slate-300" />
        </div>
      )}
    </div>
  );
};

// ─── Filter chip ──────────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({
  label, count, active, onClick,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all",
      active
        ? "text-white border-transparent shadow-sm"
        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700",
    )}
    style={active ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" } : undefined}
  >
    {label}
    <span className={cn(
      "text-[9px] font-bold px-1 rounded-full",
      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
    )}>
      {count}
    </span>
  </button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
type FilterKey = "all" | "available" | "partial" | "not_configured" | "coming_soon";

export const JobBoardsHub: React.FC = () => {
  const [view,      setView]      = useState<ViewMode>("grid");
  const [filter,    setFilter]    = useState<FilterKey>("all");
  const [search,    setSearch]    = useState("");
  // ── FIX: typed as JobBoard | null — never passes null! with assertion ──
  const [configure, setConfigure] = useState<JobBoard | null>(null);

  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/careerjet-xml-feed?org=demo`;

  const filtered = JOB_BOARDS.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.name.toLowerCase().includes(q) || b.region.toLowerCase().includes(q)
      || b.tags.some(t => t.toLowerCase().includes(q));
    const matchFilter = filter === "all" || b.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all:            JOB_BOARDS.length,
    available:      JOB_BOARDS.filter(b => b.status === "available").length,
    partial:        JOB_BOARDS.filter(b => b.status === "partial").length,
    not_configured: JOB_BOARDS.filter(b => b.status === "not_configured").length,
    coming_soon:    JOB_BOARDS.filter(b => b.status === "coming_soon").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 ">
      <div className="max-w-9xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}>
                <Radio size={13} className="text-white" />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Market Places
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Job Boards</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Connect your ATS to {BOARDS_COUNT} job platforms and broadcast openings in one click.
            </p>
          </div>
          <button
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}
          >
            <Sparkles size={13} />
            Post to Free Boards
          </button>
        </div>

        {/* Info banner */}
        {/* <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl border border-blue-100 bg-blue-50">
          <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-600 leading-relaxed">
            <strong className="text-blue-700">Demo mode</strong> — Configure each board to save credentials.
            Use the <strong className="text-blue-700">Broadcast</strong> button on any job row to post.
          </p>
        </div> */}

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search boards…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 pr-3 w-44 rounded-xl bg-white border border-slate-200 text-xs text-slate-600
                placeholder:text-slate-400 outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <Chip label="All"          count={counts.all}            active={filter === "all"}            onClick={() => setFilter("all")} />
            <Chip label="Ready"        count={counts.available}      active={filter === "available"}      onClick={() => setFilter("available")} />
            <Chip label="Feed Ready"   count={counts.partial}        active={filter === "partial"}        onClick={() => setFilter("partial")} />
            <Chip label="Setup Needed" count={counts.not_configured} active={filter === "not_configured"} onClick={() => setFilter("not_configured")} />
            <Chip label="Coming Soon"  count={counts.coming_soon}    active={filter === "coming_soon"}    onClick={() => setFilter("coming_soon")} />
          </div>

          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
            {([["grid", LayoutGrid], ["list", List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setView(mode as ViewMode)}
                className={cn("p-1.5 rounded-md transition-all",
                  view === mode ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600")}>
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mb-4">
          {filtered.length} board{filtered.length !== 1 ? "s" : ""}
          {filter !== "all" && ` · ${filter.replace(/_/g, " ")}`}
          {search && ` · "${search}"`}
        </p>

        {view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((board, i) => (
              <div key={board.id}
                className="animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
                <BoardCard board={board} onConfigure={() => setConfigure(board)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((board, i) => (
              <div key={board.id}
                className="animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${i * 20}ms`, animationFillMode: "both" }}>
                <ListRow board={board} onConfigure={() => setConfigure(board)} />
              </div>
            ))}
          </div>
        )}

        {/* Free callout */}
        {/* <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={13} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-800">Start for free — ₹0/month</h3>
              </div>
              <p className="text-[11px] text-emerald-700 max-w-md leading-relaxed">
                CareerJet, WhatJobs, Talent.com and Recruit.net accept your existing XML feed.
                Submit the URL once — jobs sync every 24–48h automatically.
              </p>
            </div>
            <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl
              text-xs font-semibold text-emerald-700 border border-emerald-200 bg-white
              hover:bg-emerald-50 transition-all whitespace-nowrap">
              Set up free boards <ArrowUpRight size={11} />
            </button>
          </div>
        </div> */}
      </div>

      {/*
        ── FIX: Only render ConfigureModal when configure is non-null.
           No board! assertion needed — TypeScript knows it's JobBoard here.
      */}
      {configure && (
        <ConfigureModal
          board={configure}
          feedUrl={feedUrl}
          isOpen={true}
          onClose={() => setConfigure(null)}
        />
      )}
    </div>
  );
};