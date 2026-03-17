import React from "react";
import { Typeahead } from "./Typeahead";
import { ALL_TECHS } from "../constants/technologies";
import {
  POPULAR_TITLES,
  POPULAR_LOCATIONS,
  SENIORITIES,
  POPULAR_SKILLS,
} from "../constants/filters";

interface SearchSidebarProps {
  skills: string[];
  titles: string[];
  locations: string[];
  seniorities: string[];
  isLoading: boolean;
  hasFilters: boolean;
  onAddSkill: (s: string) => void;
  onRemoveSkill: (s: string) => void;
  onAddTitle: (t: string) => void;
  onRemoveTitle: (t: string) => void;
  onAddLocation: (l: string) => void;
  onRemoveLocation: (l: string) => void;
  onToggleSeniority: (s: string) => void;
  onSearch: () => void;
  onClearAll: () => void;
}

/* ── Small reusable pieces ── */
const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({
  children, right,
}) => (
  <label style={{
    display: "flex", alignItems: "center", gap: 6,
    fontSize: "0.66rem", fontWeight: 700,
    color: "rgba(255,255,255,0.82)",
    marginBottom: 8,
    textTransform: "uppercase", letterSpacing: "0.7px",
  }}>
    {children}
    {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
  </label>
);

const SkillChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span
    className="cs-chip-in"
    style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 6,
      background: "rgba(37,99,235,0.18)", border: "1px solid rgba(37,99,235,0.38)",
      color: "#93C5FD", fontFamily: "var(--font-m)", fontSize: "0.7rem", fontWeight: 500,
    }}
  >
    {label}
    <button
      onClick={onRemove}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 0, color: "inherit", opacity: 0.6, fontSize: "0.95rem", lineHeight: 1,
      }}
    >×</button>
  </span>
);

const TextChip: React.FC<{ label: string; color: string; onRemove: () => void }> = ({
  label, color, onRemove,
}) => (
  <span
    className="cs-chip-in"
    style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 6,
      background: `${color}22`, border: `1px solid ${color}44`,
      color: color, fontFamily: "var(--font-b)", fontSize: "0.7rem",
    }}
  >
    {label}
    <button
      onClick={onRemove}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 0, color: "inherit", opacity: 0.55, fontSize: "0.95rem", lineHeight: 1,
      }}
    >×</button>
  </span>
);

const Divider = () => (
  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0 18px" }} />
);

/* ── Main component ── */
export const SearchSidebar: React.FC<SearchSidebarProps> = ({
  skills, titles, locations, seniorities,
  isLoading, hasFilters,
  onAddSkill, onRemoveSkill,
  onAddTitle, onRemoveTitle,
  onAddLocation, onRemoveLocation,
  onToggleSeniority,
  onSearch, onClearAll,
}) => (
  <aside style={{
    width: 298, flexShrink: 0,
    background: "var(--sidebar)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    padding: "22px 16px 28px",
    overflowY: "auto",
    position: "sticky", top: 54,
    height: "calc(100vh - 54px)",
    display: "flex", flexDirection: "column",
  }}>

    {/* Header */}
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: "var(--font-m)", fontSize: "0.52rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "2.5px",
        color: "rgba(255,255,255,0.25)", marginBottom: 4,
      }}>
        Search Parameters
      </div>
      <div style={{ fontFamily: "var(--font-d)", fontSize: "0.98rem", fontWeight: 700, color: "#fff" }}>
        Build Your Search
      </div>
    </div>

    {/* ── Technologies ── */}
    <div style={{ marginBottom: 18 }}>
      <SectionLabel
        right={
          <span style={{
            fontSize: "0.56rem", padding: "2px 6px", borderRadius: 10,
            background: "rgba(37,99,235,0.28)", color: "#93C5FD", fontFamily: "var(--font-m)",
          }}>
            1,500+
          </span>
        }
      >
        ⚡ Technologies & Skills
      </SectionLabel>

      <Typeahead
        placeholder="Python, Kubernetes, React…"
        options={ALL_TECHS}
        selected={skills}
        onAdd={onAddSkill}
        dark
        showCategoryBadge
      />

      {skills.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {skills.map(s => (
            <SkillChip key={s} label={s} onRemove={() => onRemoveSkill(s)} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontFamily: "var(--font-m)", fontSize: "0.52rem",
            textTransform: "uppercase", letterSpacing: "1px",
            color: "rgba(255,255,255,0.2)", marginBottom: 6,
          }}>
            Popular picks
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {POPULAR_SKILLS.map(t => (
              <button
                key={t}
                onClick={() => onAddSkill(t)}
                className="cs-sb-btn-pop"
                style={{
                  padding: "3px 8px", borderRadius: 5,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.38)",
                  fontFamily: "var(--font-m)", fontSize: "0.64rem",
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    <Divider />

    {/* ── Job Titles ── */}
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>🎯 Job Titles</SectionLabel>
      <Typeahead
        placeholder="Senior Engineer, Data Scientist…"
        options={POPULAR_TITLES}
        selected={titles}
        onAdd={onAddTitle}
        dark
      />
      {titles.length > 0 && (
        <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {titles.map(t => (
            <TextChip key={t} label={t} color="#A78BFA" onRemove={() => onRemoveTitle(t)} />
          ))}
        </div>
      )}
    </div>

    {/* ── Location ── */}
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>📍 Location</SectionLabel>
      <Typeahead
        placeholder="India, Remote, London…"
        options={POPULAR_LOCATIONS}
        selected={locations}
        onAdd={onAddLocation}
        dark
      />
      {locations.length > 0 && (
        <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {locations.map(l => (
            <TextChip key={l} label={l} color="#67E8F9" onRemove={() => onRemoveLocation(l)} />
          ))}
        </div>
      )}
    </div>

    {/* ── Seniority ── */}
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>📊 Seniority</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {SENIORITIES.map(s => {
          const on = seniorities.includes(s.v);
          return (
            <button
              key={s.v}
              onClick={() => onToggleSeniority(s.v)}
              style={{
                padding: "5px 10px", borderRadius: 6,
                border: `1px solid ${on ? "#2563EB" : "rgba(255,255,255,0.1)"}`,
                background: on ? "#2563EB" : "rgba(255,255,255,0.04)",
                color: on ? "#fff" : "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-b)", fontSize: "0.72rem",
                fontWeight: on ? 600 : 400,
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {s.l} <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>{s.d}</span>
            </button>
          );
        })}
      </div>
    </div>

    <Divider />

    {/* ── Search button ── */}
    <button
      onClick={onSearch}
      disabled={!hasFilters || isLoading}
      className="cs-search-btn"
      style={{
        padding: "12px", borderRadius: 10, border: "none",
        background: hasFilters && !isLoading ? "#2563EB" : "rgba(37,99,235,0.25)",
        color: "#fff",
        fontFamily: "var(--font-d)", fontSize: "0.88rem", fontWeight: 700,
        cursor: hasFilters && !isLoading ? "pointer" : "not-allowed",
        letterSpacing: "0.2px", transition: "all 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {isLoading ? (
        <>
          <span
            className="cs-spinner"
            style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
              display: "inline-block",
            }}
          />
          Searching
          <span>
            <span className="cs-dot1">.</span>
            <span className="cs-dot2">.</span>
            <span className="cs-dot3">.</span>
          </span>
        </>
      ) : !hasFilters ? (
        "Add filters to search"
      ) : (
        "Search Candidates"
      )}
    </button>

    {hasFilters && !isLoading && (
      <button
        onClick={onClearAll}
        style={{
          marginTop: 8, padding: "8px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "transparent",
          color: "rgba(255,255,255,0.28)",
          fontFamily: "var(--font-b)", fontSize: "0.74rem", cursor: "pointer",
        }}
      >
        Clear all filters
      </button>
    )}

    {/* ── Beta notice ── */}
    <div style={{ marginTop: "auto", paddingTop: 22 }}>
      <div style={{
        padding: "12px 14px", borderRadius: 9,
        background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.16)",
      }}>
        <div style={{
          fontFamily: "var(--font-m)", fontSize: "0.56rem", color: "#F59E0B",
          fontWeight: 600, marginBottom: 4,
          textTransform: "uppercase", letterSpacing: "1px",
        }}>
          ⚡ Beta Feature
        </div>
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", lineHeight: 1.65 }}>
          Skill signals are detected from public professional data and updated regularly.
          Results are paginated — 25 per request.
        </div>
      </div>
    </div>
  </aside>
);