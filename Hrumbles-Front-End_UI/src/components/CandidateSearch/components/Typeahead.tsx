import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { TECH_CAT_MAP, TECH_CATS } from "../constants/technologies";

interface TypeaheadProps {
  placeholder: string;
  options: string[];
  selected: string[];
  onAdd: (val: string) => void;
  dark?: boolean;
  showCategoryBadge?: boolean;
}

export const Typeahead: React.FC<TypeaheadProps> = ({
  placeholder,
  options,
  selected,
  onAdd,
  dark = false,
  showCategoryBadge = false,
}) => {
  const [val,  setVal]  = useState("");
  const [open, setOpen] = useState(false);
  const [hi,   setHi]   = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!val.trim()) return [];
    const q = val.toLowerCase();
    return options
      .filter(o => !selected.includes(o) && o.toLowerCase().includes(q))
      .slice(0, 12);
  }, [val, options, selected]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const commit = useCallback((opt: string) => {
    onAdd(opt); setVal(""); setOpen(false); setHi(0);
  }, [onAdd]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && filtered[hi]) commit(filtered[hi]);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  const base: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    outline: "none",
    fontFamily: "var(--font-b)",
    fontSize: "0.82rem",
    border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--border)",
    background: dark ? "rgba(255,255,255,0.05)" : "#fff",
    color: dark ? "rgba(255,255,255,0.88)" : "var(--text)",
    transition: "border-color 0.15s",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={val}
        placeholder={placeholder}
        style={base}
        autoComplete="off"
        onChange={e => { setVal(e.target.value); setOpen(true); setHi(0); }}
        onFocus={e => {
          (e.target as HTMLInputElement).style.borderColor = "#2563EB";
          if (val) setOpen(true);
        }}
        onBlur={e => {
          (e.target as HTMLInputElement).style.borderColor =
            dark ? "rgba(255,255,255,0.1)" : "var(--border)";
        }}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0, zIndex: 9999,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 10,
          boxShadow: "0 14px 40px rgba(0,0,0,0.14)",
          maxHeight: 268,
          overflowY: "auto",
        }}>
          {filtered.map((opt, i) => {
            const cat  = TECH_CAT_MAP[opt];
            const cc   = cat ? TECH_CATS[cat] : null;
            return (
              <div
                key={opt}
                onMouseDown={() => commit(opt)}
                onMouseEnter={() => setHi(i)}
                style={{
                  padding: "9px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: i === hi ? "#EFF6FF" : "transparent",
                  borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  fontFamily: "var(--font-b)",
                  fontSize: "0.82rem",
                  color: "var(--text)",
                }}
              >
                <span>{opt}</span>
                {showCategoryBadge && cc && (
                  <span style={{
                    fontSize: "0.58rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: cc.bg,
                    color: cc.color,
                    border: `1px solid ${cc.border}`,
                    fontFamily: "var(--font-m)",
                  }}>
                    {cat}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};