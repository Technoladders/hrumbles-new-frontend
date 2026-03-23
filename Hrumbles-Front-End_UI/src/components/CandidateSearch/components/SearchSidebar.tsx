/**
 * SearchSidebar — Global Candidate Search
 *
 * Design: clean recruitment / talent-tool aesthetic (not sales).
 * - Always-visible flat sections, no accordion collapsing needed
 * - Every filter auto-triggers search on change (debounced 600ms)
 * - country-state-city library for location (same as DiscoverySidebar)
 * - Job title suggestions from supabase contacts table + free-text add
 * - Each filter field is multi-tag select
 * - No "Run Search" button — search fires automatically
 */

import React, {
  useState, useRef, useEffect, useMemo, useCallback,
} from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Country, State, City } from "country-state-city";
import {
  Search, MapPin, Briefcase, Building2, UserSearch,
  X, Loader2, Sparkles, RotateCcw, Check,
} from "lucide-react";
import { SENIORITIES } from "../constants/filters";

// ─────────────────────────────────────────────────────────────────────────────
// Location helpers (same logic as DiscoverySidebar)
// ─────────────────────────────────────────────────────────────────────────────

type LocType = "country" | "state" | "city";

interface LocOpt {
  value: string;
  label: string;
  type: LocType;
}

const LOC_STYLE: Record<LocType, { dot: string; badge: string; tag: string }> = {
  country: {
    dot:   "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    tag:   "bg-blue-50 text-blue-700 border-blue-200",
  },
  state: {
    dot:   "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    tag:   "bg-orange-50 text-orange-700 border-orange-200",
  },
  city: {
    dot:   "bg-purple-400",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    tag:   "bg-purple-50 text-purple-700 border-purple-200",
  },
};

const LOC_TYPE_LABEL: Record<LocType, string> = {
  country: "Country",
  state:   "State",
  city:    "City",
};

const ALL_COUNTRIES: LocOpt[] = Country.getAllCountries().map(c => ({
  value: c.name,
  label: `${c.flag ?? ""} ${c.name}`.trim(),
  type:  "country",
}));

const ALL_STATES: LocOpt[] = State.getAllStates().map(s => ({
  value: s.name,
  label: s.name,
  type:  "state",
}));

const POPULAR_COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "Singapore", "Netherlands", "UAE", "France",
];

function searchLocations(q: string, selected: string[]): LocOpt[] {
  const lq = q.toLowerCase().trim();
  if (!lq) {
    return ALL_COUNTRIES
      .filter(c => POPULAR_COUNTRIES.includes(c.value) && !selected.includes(c.value))
      .slice(0, 10);
  }
  const out: LocOpt[] = [];
  ALL_COUNTRIES
    .filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value))
    .slice(0, 8)
    .forEach(c => out.push(c));
  ALL_STATES
    .filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value))
    .slice(0, 6)
    .forEach(s => out.push(s));
  if (lq.length >= 3) {
    City.getAllCities()
      .filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name))
      .slice(0, 10)
      .forEach(c => out.push({ value: c.name, label: c.name, type: "city" }));
  }
  return out.slice(0, 25);
}

function getLocType(value: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === value)) return "country";
  if (ALL_STATES.some(s => s.value === value)) return "state";
  return "city";
}

// ─────────────────────────────────────────────────────────────────────────────
// AbovePortal — renders dropdown via portal, always positions correctly
// (same pattern as DiscoverySidebar — prevents ScrollArea clipping)
// ─────────────────────────────────────────────────────────────────────────────

interface PortalDropdownProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  maxH?: number;
  children: React.ReactNode;
}

function PortalDropdown({ anchorRef, isOpen, maxH = 260, children }: PortalDropdownProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        const desiredW = Math.max(r.width, 220);
        const left     = Math.min(r.left, window.innerWidth - desiredW - 8);
        const spaceAbove = r.top;
        const spaceBelow = window.innerHeight - r.bottom;
        const goUp = spaceAbove > maxH || spaceAbove > spaceBelow;

        setStyle({
          position:  "fixed",
          left:      Math.max(4, left),
          width:     desiredW,
          zIndex:    99999,
          maxHeight: maxH,
          ...(goUp
            ? { bottom: window.innerHeight - r.top + 4 }
            : { top: r.bottom + 4 }),
        });
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, anchorRef, maxH]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={style}
      className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden"
    >
      {children}
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LocationMultiSelect — country-state-city with AbovePortal
// ─────────────────────────────────────────────────────────────────────────────

function LocationMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [q,    setQ]    = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchLocations(q, selected), [q, selected]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const add = (opt: LocOpt) => {
    onChange([...selected, opt.value]);
    setQ("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const remove = (v: string) => onChange(selected.filter(x => x !== v));

return (
  <div ref={wrapRef} className="space-y-2">
    
    {/* Selected tags */}
    {selected.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {selected.map(val => {
          const t = getLocType(val);
          const st = LOC_STYLE[t];

          return (
            <span
              key={val}
              className="
                inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full
                text-[10px] font-medium
                bg-white border-[1px]
                text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600
                [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]
              "
            >
              {/* keep semantic dot */}
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", st.dot)} />

              <span className="truncate max-w-[80px]">{val}</span>

              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  remove(val);
                }}
                className="text-red-700 hover:opacity-60"
              >
                <X size={9} />
              </button>
            </span>
          );
        })}
      </div>
    )}

    {/* Input */}
    <div
      ref={anchorRef}
      className="
        relative group rounded-lg p-[1px]
        bg-slate-200
        focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600
        transition-all
      "
    >
      <div className="relative bg-white rounded-lg">

        {/* Default icon */}
        <MapPin
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            text-slate-400 pointer-events-none transition-all
            group-focus-within:opacity-0
          "
        />

        {/* Gradient icon */}
        <MapPin
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            pointer-events-none opacity-0
            group-focus-within:opacity-100 transition-all
          "
          style={{ stroke: "url(#primary-gradient)" }}
        />

        <input
          ref={inputRef}
          placeholder="Country, state or city…"
          autoComplete="new-password"   // 🔥 main fix
  name="new-password"           // 🔥 must match
  inputMode="search"            // reduces location autofill
  autoCorrect="off"
  autoCapitalize="off"
  spellCheck={false}
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            setTimeout(() => {
              setOpen(false);
              setQ("");
            }, 150)
          }
          className={cn(
            "w-full h-8 pl-7 pr-7 rounded-lg",

            // text
            "text-[11px] text-slate-600 font-medium",

            // placeholder
            "placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic",

            // reset
            "bg-transparent border-none outline-none focus:ring-0"
          )}
        />

        {/* Count badge */}
        {selected.length > 0 && (
          <span
            className="
              absolute right-2 top-1.5
              text-white text-[9px] font-bold
              rounded-full w-4 h-4 flex items-center justify-center
              pointer-events-none
              bg-gradient-to-r from-purple-600 to-pink-600
            "
          >
            {selected.length}
          </span>
        )}
      </div>

      {/* Dropdown */}
      <PortalDropdown anchorRef={anchorRef} isOpen={open} maxH={240}>

        {/* Type legend */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
          {(["country", "state", "city"] as LocType[]).map(t => (
            <span
              key={t}
              className="flex items-center gap-1 text-[9px] text-slate-400 font-medium"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", LOC_STYLE[t].dot)} />
              {LOC_TYPE_LABEL[t]}
            </span>
          ))}
        </div>

        {/* Options */}
        <div className="overflow-y-auto flex-1">
          {options.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
              {q.length > 0 && q.length < 3
                ? "Type 3+ chars for cities"
                : "No matches"}
            </p>
          ) : (
            <div className="py-1">
              {options.map((opt, i) => {
                const st = LOC_STYLE[opt.type];

                return (
                  <button
                    key={`${opt.type}-${i}`}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      add(opt);
                    }}
                    className="
                      w-full flex items-center justify-between px-3 py-1.5
                      hover:bg-violet-50/40 text-left transition-colors
                    "
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />

                      <span className="text-[11px] text-slate-700 font-medium truncate">
                        {opt.label}
                      </span>
                    </span>

                    {/* Type badge */}
                    <span
                      className="
                        text-[9px] font-semibold px-1.5 py-0.5 rounded-full border
                        text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600
                        [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]
                      "
                    >
                      {LOC_TYPE_LABEL[opt.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!q && (
          <p className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            Popular countries · type to search all
          </p>
        )}
      </PortalDropdown>
    </div>
  </div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// JobTitleMultiSelect — DB suggestions from supabase + free-text add
// ─────────────────────────────────────────────────────────────────────────────

function JobTitleMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [q,    setQ]    = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["title-suggestions", q],
    queryFn:  async () => {
      if (!q.trim()) return [];
      const { data } = await supabase
        .from("contacts")
        .select("job_title")
        .not("job_title", "is", null)
        .ilike("job_title", `%${q}%`)
        .limit(200);
      const unique = [
        ...new Set((data || []).map((r: any) => r.job_title?.trim()).filter(Boolean)),
      ] as string[];
      return unique.sort().slice(0, 40);
    },
    enabled:   q.trim().length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const add = useCallback((val: string) => {
    const v = val.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setQ("");
    setOpen(false);
    inputRef.current?.focus();
  }, [selected, onChange]);

  const remove = (v: string) => onChange(selected.filter(x => x !== v));

  const filtered   = suggestions.filter(s => !selected.includes(s));
  const showManual = q.trim() && !selected.includes(q.trim()) && !suggestions.includes(q.trim());
  const showDrop   = open && q.trim().length > 0 && (filtered.length > 0 || !!showManual || isFetching);

return (
  <div ref={wrapRef} className="space-y-2">
    {/* Selected tags */}
    {selected.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {selected.map(t => (
          <span
            key={t}
            className="
              inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium
              bg-white border-[1px]
              text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600
              [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]
            "
          >
            <span className="truncate max-w-[100px]">{t}</span>
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-red-700 hover:opacity-60"
            >
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
    )}

    {/* Input */}
    <div
      ref={anchorRef}
      className="
        relative group rounded-lg p-[1px]
        bg-slate-200
        focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600
        transition-all
      "
    >
      <div className="relative bg-white rounded-lg">

        {/* Default Icon */}
        <Briefcase
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            text-slate-400 pointer-events-none transition-all
            group-focus-within:opacity-0
          "
        />

        {/* Gradient Icon */}
        <Briefcase
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            pointer-events-none opacity-0
            group-focus-within:opacity-100 transition-all
          "
          style={{ stroke: "url(#primary-gradient)" }}
        />

        <input
          ref={inputRef}
          placeholder="e.g. Software Engineer, PM…"
          value={q}
          autoComplete="off"
          onChange={e => {
            setQ(e.target.value);
            if (e.target.value.trim()) setOpen(true);
            else setOpen(false);
          }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => {
            if (e.key === "Enter" && q.trim()) {
              e.preventDefault();
              add(q);
            }
            if (e.key === "Backspace" && !q && selected.length) {
              remove(selected[selected.length - 1]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          onBlur={() =>
            setTimeout(() => {
              setOpen(false);
              setQ("");
            }, 150)
          }
          className={cn(
            "w-full h-8 pl-7 pr-7 rounded-lg",

            // text
            "text-[11px] text-slate-600 font-medium",

            // placeholder
            "placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic",

            // reset
            "bg-transparent border-none outline-none focus:ring-0"
          )}
        />

        {/* Count badge */}
        {selected.length > 0 && (
          <span
            className="
              absolute right-2 top-1.5
              text-white text-[9px] font-bold
              rounded-full w-4 h-4 flex items-center justify-center
              pointer-events-none
              bg-gradient-to-r from-purple-600 to-pink-600
            "
          >
            {selected.length}
          </span>
        )}
      </div>

      {/* Dropdown */}
      <PortalDropdown anchorRef={anchorRef} isOpen={showDrop} maxH={220}>
        <div className="overflow-y-auto flex-1">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" /> Searching…
            </div>
          )}

          {!isFetching && showManual && (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                add(q);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100 text-left"
            >
              <Sparkles size={10} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                Add "<strong className="text-slate-800">{q.trim()}</strong>"
              </span>
            </button>
          )}

          {!isFetching &&
            filtered.map(title => (
              <button
                key={title}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  add(title);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left"
              >
                <Briefcase size={10} className="text-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-700 truncate">
                  {title}
                </span>
              </button>
            ))}
        </div>

        <p className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50 flex-shrink-0">
         Enter to add custom
        </p>
      </PortalDropdown>
    </div>
  </div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// CompanyMultiSelect — free-text, enter to add
// ─────────────────────────────────────────────────────────────────────────────

function CompanyMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const v = val.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setVal("");
  };

  const remove = (v: string) => onChange(selected.filter(x => x !== v));

return (
  <div className="space-y-2">

    {/* Selected tags */}
    {selected.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {selected.map(c => (
          <span
            key={c}
            className="
              inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium
              bg-white border-[1px]
              text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600
              [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]
            "
          >
            {/* icon stays neutral (better readability) */}
            <Building2 size={9} className="text-slate-400 flex-shrink-0" />

            <span className="truncate max-w-[90px]">{c}</span>

            <button
              type="button"
              onClick={() => remove(c)}
              className="text-red-700 hover:opacity-60"
            >
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
    )}

    {/* Input */}
    <div
      className="
        relative group rounded-lg p-[1px]
        bg-slate-200
        focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600
        transition-all
      "
    >
      <div className="relative bg-white rounded-lg">

        {/* Default icon */}
        <Building2
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            text-slate-400 pointer-events-none transition-all
            group-focus-within:opacity-0
          "
        />

        {/* Gradient icon */}
        <Building2
          size={11}
          className="
            absolute left-2.5 top-1/2 -translate-y-1/2
            pointer-events-none opacity-0
            group-focus-within:opacity-100 transition-all
          "
          style={{ stroke: "url(#primary-gradient)" }}
        />

        <input
          ref={inputRef}
          value={val}
          placeholder="Company name…"

          autoComplete="new-password"
          name="new-password"
          inputMode="search"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}

          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
            if (e.key === "Backspace" && !val && selected.length) {
              remove(selected[selected.length - 1]);
            }
          }}
          onBlur={add}
          className={cn(
            "w-full h-8 pl-7 pr-3 rounded-lg",

            // text
            "text-[11px] text-slate-600 font-medium",

            // placeholder
            "placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic",

            // reset
            "bg-transparent border-none outline-none focus:ring-0"
          )}
        />
      </div>
    </div>

    {/* Helper text */}
    <p className="text-[9px] text-slate-400">
      Press Enter to add
    </p>
  </div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// SeniorityMultiSelect — tag-chip style (not checkboxes)
// ─────────────────────────────────────────────────────────────────────────────

function SeniorityMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SENIORITIES.map(s => {
        const on = selected.includes(s.v);
        return (
          <button
  key={s.v}
  type="button"
  onClick={() => onChange(s.v)}
  className={cn(
    "px-1.5 py-1 rounded-md text-xs font-medium border transition-all",
    on
      // ✅ ACTIVE
      ? [
          "bg-white",
          "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600",
          "border-[1px]",
          "[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]",
        ].join(" ")
    
      : [
          "bg-slate-100 text-slate-600 border-slate-200",
          "hover:bg-white",
          "hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600",
          "hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]",
        ].join(" ")
  )}
>
  {s.l}
</button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvailabilitySelect — tag-chip style
// ─────────────────────────────────────────────────────────────────────────────

const AVAILABILITY_OPTS = [
  { v: "open_to_work",   l: "Open to Work"     },
  { v: "serving_notice", l: "Serving Notice"   },
  { v: "immediate",      l: "Immediate Joiner" },
  { v: "freelance",      l: "Freelance / Contract" },
] as const;

function AvailabilitySelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {AVAILABILITY_OPTS.map(opt => {
        const on = selected.includes(opt.v);

        return (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              "px-1.5 py-1 rounded-md text-xs font-medium border transition-all",

              on
                // ✅ ACTIVE (same as Seniority)
                ? [
                    "bg-white",
                    "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600",
                    "border-[1px]",
                    "[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]",
                  ].join(" ")

                // ❌ INACTIVE
                : [
                    "bg-slate-100 text-slate-600 border-slate-200",
                    "hover:bg-white",
                    "hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600",
                    "hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]",
                  ].join(" ")
            )}
          >
            {opt.l}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section label
// ─────────────────────────────────────────────────────────────────────────────

const SLabel: React.FC<{
  children: React.ReactNode;
  count?: number;
  accent?: string; // tailwind bg+text classes for the count pill
}> = ({ children, count, accent = "bg-slate-100 text-slate-500" }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
      {children}
    </span>
    {!!count && count > 0 && (
      <span className={cn("text-[9px] font-bold rounded-full px-1.5 py-0.5", accent)}>
        {count}
      </span>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SearchSidebarProps {
  keywords: string;
  titles: string[];
  locations: string[];
  seniorities: string[];
  companyNames: string[];
  availabilityIntent: string[];
  isLoading: boolean;
  totalEntries: number;
  hasFilters: boolean;
  filterCount: number;
  onSetKeywords: (v: string) => void;
  onAddTitle: (t: string) => void;
  onRemoveTitle: (t: string) => void;
  onAddLocation: (l: string) => void;
  onRemoveLocation: (l: string) => void;
  onToggleSeniority: (s: string) => void;
  onAddCompany: (c: string) => void;
  onRemoveCompany: (c: string) => void;
  onToggleAvailability: (v: string) => void;
  onClearAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const SearchSidebar: React.FC<SearchSidebarProps> = ({
  keywords, titles, locations, seniorities, companyNames, availabilityIntent,
  isLoading, totalEntries, hasFilters, filterCount,
  onSetKeywords,
  onAddTitle, onRemoveTitle,
  onAddLocation, onRemoveLocation,
  onToggleSeniority,
  onAddCompany, onRemoveCompany,
  onToggleAvailability,
  onClearAll,
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-150">

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="0" height="0" style={{ position: "absolute" }}>
  <defs>
    <linearGradient id="primary-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#9333ea" />
      <stop offset="100%" stopColor="#ec4899" />
    </linearGradient>
  </defs>
</svg>
           <UserSearch
  size={12}
  style={{ stroke: "url(#primary-gradient)" }}
/>
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Candidate Search
            </span>
            {isLoading && (
              <Loader2 size={11} className="animate-spin text-slate-400" />
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>

        {/* Result count pill */}
        {totalEntries > 0 && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
  Matched profiles
</span>
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {totalEntries.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Keyword search */}
<div className="relative group">
  {/* Wrapper */}
  <div className="
    rounded-lg p-[1px]
    bg-slate-200
    focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600
    transition-all
  ">
    <div className="relative bg-white rounded-lg">

      {/* Search Icon */}
      <Search
        size={11}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-all
                   group-focus-within:text-transparent"
        style={{
          // fallback default
          stroke: "currentColor",
        }}
      />

      {/* Gradient overlay icon (only on focus) */}
      <Search
        size={11}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-all"
        style={{ stroke: "url(#primary-gradient)" }}
      />

      <input
        type="text"
        placeholder="Name, role, skill…"
        value={keywords}
        onChange={e => onSetKeywords(e.target.value)}
        className={cn(
          "w-full h-8 pl-7 pr-3 rounded-lg",
          "text-[11px] text-slate-600 font-small",
          "placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic",
          "bg-transparent border-none outline-none",
          "focus:ring-0 focus:outline-none"
        )}
      />
    </div>
  </div>
</div>
      </div>

      {/* ── FILTERS ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-5">

          {/* ── Job Title ── */}
          <div>
            <SLabel count={titles.length} accent="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Job Title</SLabel>
            <JobTitleMultiSelect
              selected={titles}
              onChange={v => {
                // replace entire array from JobTitleMultiSelect
                const removed = titles.find(t => !v.includes(t));
                const added   = v.find(t => !titles.includes(t));
                if (removed) onRemoveTitle(removed);
                if (added)   onAddTitle(added);
              }}
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Seniority ── */}
          <div>
            <SLabel count={seniorities.length} accent="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Seniority</SLabel>
            <SeniorityMultiSelect
              selected={seniorities}
              onChange={onToggleSeniority}
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Location ── */}
          <div>
            <SLabel count={locations.length} accent="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Location</SLabel>
            <LocationMultiSelect
              selected={locations}
              onChange={next => {
                const removed = locations.find(l => !next.includes(l));
                const added   = next.find(l => !locations.includes(l));
                if (removed) onRemoveLocation(removed);
                if (added)   onAddLocation(added);
              }}
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Company ── */}
          <div>
            <SLabel count={companyNames.length} accent="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Current Company</SLabel>
            <CompanyMultiSelect
              selected={companyNames}
              onChange={next => {
                const removed = companyNames.find(c => !next.includes(c));
                const added   = next.find(c => !companyNames.includes(c));
                if (removed) onRemoveCompany(removed);
                if (added)   onAddCompany(added);
              }}
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Availability ── */}
          <div>
            <SLabel count={availabilityIntent.length} accent="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Availability</SLabel>
            <AvailabilitySelect
              selected={availabilityIntent}
              onChange={onToggleAvailability}
            />
            <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
              Matched against profile signals. All results have verified email.
            </p>
          </div>

        </div>
      </ScrollArea>

      {/* ── STATUS BAR ── */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLoading ? "bg-amber-400 animate-pulse" : hasFilters ? "bg-emerald-400" : "bg-slate-300"
            )} />
            <span className="text-[10px] text-slate-500">
              {isLoading ? "Searching…"
                : hasFilters ? `${filterCount} filter${filterCount !== 1 ? "s" : ""} active`
                : "No filters — add one to search"
              }
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">
            auto ↺
          </span>
        </div>
      </div>
    </div>
  );
};
// 