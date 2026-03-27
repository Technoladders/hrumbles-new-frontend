// src/components/jobs/job-boards/JobBoardCard.tsx
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, Globe, Users, Clock, CheckCircle2, ArrowRight, Wifi } from "lucide-react";
import type { JobBoard } from "./jobBoardsData";

interface JobBoardCardProps {
  board: JobBoard;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  showStats?: boolean;
  compact?: boolean;
}

const TIER_STYLES: Record<string, string> = {
  free:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  freemium:  "bg-amber-500/15  text-amber-400  border-amber-500/25",
  premium:   "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

const STATUS_CONFIG = {
  connected:    { label: "Connected",    dot: "bg-emerald-400", pulse: true  },
  partial:      { label: "Feed Ready",   dot: "bg-amber-400",   pulse: true  },
  available:    { label: "Available",    dot: "bg-slate-500",   pulse: false },
  coming_soon:  { label: "Coming Soon",  dot: "bg-slate-600",   pulse: false },
};

export const JobBoardCard: React.FC<JobBoardCardProps> = ({
  board, isSelected = false, onToggle, showStats = true, compact = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const status = STATUS_CONFIG[board.status];

  return (
    <div
      onClick={() => onToggle?.(board.id)}
      className={cn(
        "relative rounded-2xl border transition-all duration-300 group",
        "bg-slate-900/60 backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        onToggle && "cursor-pointer",
        isSelected
          ? "border-transparent shadow-lg shadow-purple-500/10"
          : "border-slate-700/50 hover:border-slate-600/70",
      )}
      style={isSelected ? {
        background: `linear-gradient(135deg, ${board.brandColor}12, transparent 60%)`,
        borderImage: `linear-gradient(135deg, ${board.brandColor}80, #ec489940) 1`,
      } : undefined}
    >
      {/* Selected glow ring */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${board.brandColor}` }}
        />
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle2
            size={16}
            className="text-white drop-shadow"
            style={{ color: board.brandColor }}
          />
        </div>
      )}

      {/* Top row — logo + name + status */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo */}
        <div
          className={cn(
            "flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden",
            "border border-slate-700/60",
            compact ? "w-8 h-8" : "w-10 h-10",
          )}
          style={{ background: `${board.brandColor}18` }}
        >
          {!imgError ? (
            <img
              src={board.logoUrl}
              alt={board.name}
              className={cn(
                "object-contain",
                compact ? "w-5 h-5" : "w-6 h-6",
                board.status === "available" && !isSelected && "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300",
              )}
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              className={cn(
                "font-bold tracking-tight",
                compact ? "text-[9px]" : "text-[10px]",
              )}
              style={{ color: board.brandColor }}
            >
              {board.logoFallback}
            </span>
          )}
        </div>

        {/* Name + tagline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              "font-semibold text-slate-100",
              compact ? "text-xs" : "text-sm",
            )}>
              {board.name}
            </span>
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
              TIER_STYLES[board.tier],
            )}>
              {board.tierLabel}
            </span>
          </div>
          {!compact && (
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{board.tagline}</p>
          )}
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            status.dot,
            status.pulse && "animate-pulse",
          )} />
          <span className="text-[10px] text-slate-400">{status.label}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Globe size={9} />
          <span className="text-[9px]">{board.region}</span>
        </div>
      </div>

      {/* Stats — only shown when not compact */}
      {showStats && !compact && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { icon: Users,  label: "Monthly",  value: board.monthlyVisitors },
            { icon: Zap,    label: "Reach",    value: board.estimatedReach.toLocaleString("en-IN") },
            { icon: Clock,  label: "Index",    value: board.indexTime },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-slate-800/60 rounded-xl px-2 py-1.5 text-center border border-slate-700/30"
            >
              <Icon size={9} className="mx-auto mb-0.5 text-slate-500" />
              <p className="text-[9px] text-slate-500 leading-none mb-0.5">{label}</p>
              <p className="text-[10px] font-semibold text-slate-300 leading-none">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {!compact && (
        <div className="flex flex-wrap gap-1">
          {board.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Connect CTA — available boards */}
      {board.status === "available" && !onToggle && (
        <button
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold
            border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500
            transition-all group/btn"
        >
          Connect
          <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Feed Ready badge for partial */}
      {board.status === "partial" && !onToggle && (
        <div className="mt-3 flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Wifi size={10} className="text-amber-400" />
          <span className="text-[10px] text-amber-400 font-medium">XML Feed configured</span>
        </div>
      )}
    </div>
  );
};