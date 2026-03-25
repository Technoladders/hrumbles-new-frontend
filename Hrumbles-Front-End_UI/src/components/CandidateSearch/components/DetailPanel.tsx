import React from "react";
import { createPortal } from "react-dom";
import {
  X, Building2, MapPin, Calendar,
  Check, Minus, ExternalLink, Mail, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApolloCandidate } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800",
  "bg-purple-200 text-purple-800",
  "bg-indigo-200 text-indigo-800",
  "bg-fuchsia-200 text-fuchsia-800",
  "bg-violet-300 text-violet-900",
  "bg-purple-100 text-purple-700",
];
const avatarColor = (id: string) =>
  AVATAR_COLORS[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_COLORS.length];

const initials = (fn: string, ln: string) =>
  ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase();

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
};

// ─── Section header ───────────────────────────────────────────────────────
const SectionHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">
    {children}
  </p>
);

// ─── Meta row with icon ───────────────────────────────────────────────────
const MetaRow: React.FC<{ icon: React.ElementType; value: string }> = ({ icon: Icon, value }) => (
  <div className="flex items-center gap-2 py-1.5 border-b border-violet-100/60 last:border-0">
    <Icon size={11} className="text-violet-400 flex-shrink-0" />
    <span className="text-[11px] text-slate-600 truncate">{value}</span>
  </div>
);

// ─── Contact row ─────────────────────────────────────────────────────────
const ContactRow: React.FC<{
  icon: React.ElementType;
  label: string;
  ok: boolean;
}> = ({ icon: Icon, label, ok }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-violet-100/40 last:border-0">
    <div className="flex items-center gap-2">
      <Icon size={11} className={cn(ok ? "text-violet-400" : "text-slate-300")} />
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
    <span className={cn(
      "flex items-center gap-1 text-[10px] font-semibold",
      ok ? "text-violet-600" : "text-slate-300"
    )}>
      {ok
        ? <><Check size={9} strokeWidth={3} />Available</>
        : <><Minus size={9} />Not on file</>
      }
    </span>
  </div>
);

// ─── Props ────────────────────────────────────────────────────────────────
interface DetailPanelProps {
  candidate: ApolloCandidate;
  matchedSkills?: string[];
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────
export const DetailPanel: React.FC<DetailPanelProps> = ({
  candidate: c, matchedSkills = [], onClose,
}) => {
  const avCls    = avatarColor(c.id);
  const init     = initials(c.first_name, c.last_name_obfuscated);
  const org      = c.organization?.name || null;
  const hasLoc   = c.has_city || c.has_state || c.has_country;
  const hasPhone = c.has_direct_phone === "Yes";

  const locDesc = [
    c.has_city    && "City",
    c.has_state   && "State",
    c.has_country && "Country",
  ].filter(Boolean).join(", ") || null;

  return createPortal(
    <>
      <style>{`
        @keyframes panelSlide {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[998]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[400px] bg-white z-[999] flex flex-col"
        style={{
          animation: "panelSlide 0.18s cubic-bezier(0.4,0,0.2,1) both",
          boxShadow: "-4px 0 32px rgba(109,40,217,0.12), -1px 0 0 rgba(139,92,246,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── DARK VIOLET HEADER BAND ── */}
        <div
          className="flex-shrink-0 px-4 pt-4 pb-5"
          style={{ background: "linear-gradient(160deg, #4c1d95 0%, #5b21b6 60%, #6d28d9 100%)" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300/70">
              Candidate
            </span>
            <button
              onClick={onClose}
              className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white/70" />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "text-[13px] font-bold flex-shrink-0",
              avCls,
            )}>
              {init}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[14px] font-bold text-white leading-tight">
                {c.first_name} {c.last_name_obfuscated}
              </h2>
              {c.title && (
                <p className="text-[11px] text-violet-200/80 mt-0.5 leading-snug line-clamp-2">
                  {c.title}
                </p>
              )}
            </div>
          </div>

          {/* Quick meta pills under name */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {org && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <Building2 size={9} className="text-violet-300" /> {org}
              </span>
            )}
            {locDesc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <MapPin size={9} className="text-violet-300" /> {locDesc}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
              <Calendar size={9} className="text-violet-300" /> {fmtDate(c.last_refreshed_at)}
            </span>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto">

          {/* CONTACT DATA */}
          <div className="px-4 py-3 border-b border-violet-100">
            <SectionHead>Contact Data</SectionHead>
            <div>
              <ContactRow icon={Mail}   label="Email address" ok={c.has_email} />
              <ContactRow icon={Phone}  label="Direct phone"  ok={hasPhone}    />
              <ContactRow icon={MapPin} label="Location info" ok={hasLoc}      />
            </div>
          </div>

          {/* ORGANISATION — name only */}
          {org && (
            <div className="px-4 py-3 border-b border-violet-100">
              <SectionHead>Organisation</SectionHead>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0 shadow-sm">
                  {org[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 leading-tight truncate">{org}</p>
                  {c.organization?.has_industry && (
                    <p className="text-[10px] text-violet-500 mt-0.5">Industry data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MATCHED FILTERS */}
          {matchedSkills.length > 0 && (
            <div className="px-4 py-3 border-b border-violet-100">
              <SectionHead>Matched filters</SectionHead>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.map(s => (
                  <span
                    key={s}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* DATA SNAPSHOT — compact grid */}
          <div className="px-4 py-3 border-b border-violet-100">
            <SectionHead>Data snapshot</SectionHead>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Email",      ok: c.has_email                          },
                { label: "Phone",      ok: hasPhone                             },
                { label: "Location",   ok: hasLoc                               },
                { label: "Company",    ok: !!org                                },
                { label: "Industry",   ok: !!c.organization?.has_industry       },
                { label: "Headcount",  ok: !!c.organization?.has_employee_count },
              ].map(({ label, ok }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium border",
                    ok
                      ? "bg-violet-50 text-violet-700 border-violet-200"
                      : "bg-slate-50 text-slate-400 border-slate-100"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", ok ? "bg-violet-500" : "bg-slate-300")} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ENRICHMENT */}
          <div className="px-4 py-3">
            <div
              className="p-3 rounded-xl border border-violet-200"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.06), rgba(139,92,246,0.04))" }}
            >
              <p className="text-[11px] font-bold text-violet-800 mb-0.5">Full profile available</p>
              <p className="text-[10px] text-violet-500/80 leading-relaxed mb-2.5">
                Verified contact, full work history &amp; enriched data on request.
              </p>
              <button
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #5b21b6, #7c3aed)" }}
              >
                Request Enrichment <ExternalLink size={9} />
              </button>
            </div>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex-shrink-0 px-4 py-2 border-t border-violet-100"
          style={{ background: "rgba(109,40,217,0.03)" }}
        >
          <p className="text-[9px] text-violet-400/70 text-center">
            Name &amp; company shown · full contact via enrichment
          </p>
        </div>
      </div>
    </>,
    document.body
  );
};