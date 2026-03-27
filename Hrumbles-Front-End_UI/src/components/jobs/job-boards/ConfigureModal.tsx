// src/components/jobs/job-boards/ConfigureModal.tsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import {
  X, ExternalLink, Save, CheckCircle2, Eye, EyeOff,
  Lock, Info, Copy, Check,
} from "lucide-react";
import type { JobBoard } from "./jobBoardsData";
import { BoardLogo } from "./BoardLogos";

interface ConfigureModalProps {
  board:   JobBoard | null;
  feedUrl: string;
  isOpen:  boolean;
  onClose: () => void;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

export const ConfigureModal: React.FC<ConfigureModalProps> = ({
  board, feedUrl, isOpen, onClose,
}) => {
  const [vals,  setVals]  = useState<Record<string, string>>({});
  const [show,  setShow]  = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Reset state when a different board opens
  useEffect(() => {
    if (isOpen && board) {
      setVals({});
      setShow({});
      setSaved(false);
    }
  }, [isOpen, board?.id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  // ── Guard: don't render if board is null or modal is closed ──
  if (!isOpen || !board) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  const tierLabel = {
    free:     { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "Free" },
    freemium: { cls: "bg-amber-50   text-amber-700   border-amber-200",   text: "Freemium" },
    premium:  { cls: "bg-purple-50  text-purple-700  border-purple-200",  text: "Paid" },
  }[board.tier];

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[9998] animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md pointer-events-auto bg-white rounded-2xl border border-slate-200
            shadow-xl shadow-slate-200/50 overflow-hidden
            animate-in fade-in slide-in-from-bottom-2 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient top bar */}
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, #9333ea, #ec4899)" }} />

          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm"
                  style={{ background: `${board.brandColor}0D` }}
                >
                  <BoardLogo boardId={board.id} size={30} />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-800">{board.name}</h2>
                    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", tierLabel.cls)}>
                      {tierLabel.text}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {board.region} · {board.indexTime}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200
                  text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">

            {/* Setup note */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-[11px] text-blue-700 leading-relaxed">{board.setupNote}</p>
                {board.setupUrl && (
                  <a
                    href={board.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Open {board.name} portal <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>

            {/* Config fields */}
            {board.configFields.length > 0 && (
              <div className="space-y-3">
                {board.configFields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      {field.label}
                      {field.required && (
                        <span className="text-[9px] text-red-400 font-medium">required</span>
                      )}
                      {field.type === "password" && (
                        <Lock size={9} className="text-slate-300" />
                      )}
                    </label>

                    {field.type === "readonly" ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono truncate flex-1">
                          {field.key === "feed_url" ? feedUrl : ""}
                        </span>
                        <CopyButton text={field.key === "feed_url" ? feedUrl : ""} />
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === "password" && !show[field.key] ? "password" : "text"}
                          value={vals[field.key] || ""}
                          onChange={e => setVals(v => ({ ...v, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white
                            text-[11px] text-slate-700 placeholder:text-slate-400 placeholder:text-[10px]
                            focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
                        />
                        {field.type === "password" && (
                          <button
                            type="button"
                            onClick={() => setShow(s => ({ ...s, [field.key]: !s[field.key] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {show[field.key] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </div>
                    )}

                    {field.helpText && (
                      <p className="text-[9px] text-slate-400 pl-0.5">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Coming soon — no fields */}
            {board.status === "coming_soon" && (
              <p className="text-[11px] text-slate-400 text-center py-2">
                No configuration needed yet — integration in progress.
              </p>
            )}
          </div>

          {/* Footer */}
          {board.configFields.length > 0 && (
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200
                  hover:border-slate-300 hover:text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm",
                  saved ? "bg-emerald-500" : "hover:opacity-90 active:scale-95",
                )}
                style={!saved ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" } : undefined}
              >
                {saved ? <><CheckCircle2 size={11} /> Saved!</> : <><Save size={11} /> Save</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};