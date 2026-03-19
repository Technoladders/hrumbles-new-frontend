import React, { useState } from "react";
import { ApolloCandidate, SearchState, SearchError } from "../types";
import { CandidateRow } from "./CandidateRow";
import { SkeletonRow, SkeletonCard } from "./SkeletonRow";
import { IdleState } from "./states/IdleState";
import { EmptyState } from "./states/EmptyState";
import { ErrorState } from "./states/ErrorState";

interface ResultsAreaProps {
  state: SearchState;
  people: ApolloCandidate[];
  totalEntries: number;
  currentPage: number;
  matchedSkills: string[];
  selectedId: string | null;
  error: SearchError | null;
  onSelectCandidate: (c: ApolloCandidate | null) => void;
  onQuickSearch: (skills: string[]) => void;
  onClearAll: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onLoadPrev: () => void;
}

const RESULTS_PER_PAGE = 25;

export const ResultsArea: React.FC<ResultsAreaProps> = ({
  state, people, totalEntries, currentPage, matchedSkills,
  selectedId, error,
  onSelectCandidate, onQuickSearch, onClearAll, onRetry, onLoadMore, onLoadPrev,
}) => {
  const [view, setView] = useState<"list" | "card">("list");

  const handleRowClick = (c: ApolloCandidate) => {
    onSelectCandidate(selectedId === c.id ? null : c);
  };

  if (state === "idle")  return <IdleState onQuickSearch={onQuickSearch} />;
  if (state === "error") return <ErrorState error={error!} onRetry={onRetry} onClearAll={onClearAll} />;
  if (state === "empty") return <EmptyState onClearAll={onClearAll} />;

  return (
    <div>
      {/* Results header */}
      {state === "results" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: "0.54rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-3)", marginBottom: 4 }}>
              Search Results · Page {currentPage}
            </div>
            <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
              {people.length} shown
              <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "var(--text-3)", fontFamily: "var(--font-b)", marginLeft: 8 }}>
                of ~{totalEntries.toLocaleString("en-IN")} matched
              </span>
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
            {[{ id: "list", icon: "≡ List" }, { id: "card", icon: "⊞ Cards" }].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as "list" | "card")}
                style={{
                  padding: "5px 11px", borderRadius: 6, border: "none",
                  background: view === v.id ? "#2563EB" : "transparent",
                  color: view === v.id ? "#fff" : "var(--text-3)",
                  cursor: "pointer", fontFamily: "var(--font-b)", fontSize: "0.74rem",
                  fontWeight: view === v.id ? 600 : 400, transition: "all 0.14s",
                }}
              >
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List header labels (list view only) */}
      {state === "results" && view === "list" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "6px 18px", marginBottom: 6,
        }}>
          <div style={{ width: 40, flexShrink: 0 }} />
          <div style={{ flex: "0 0 190px", fontFamily: "var(--font-m)", fontSize: "0.54rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-3)" }}>
            Name / Title
          </div>
          <div style={{ flex: "0 0 170px", fontFamily: "var(--font-m)", fontSize: "0.54rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-3)" }}>
            Company
          </div>
          <div style={{ flex: 1, fontFamily: "var(--font-m)", fontSize: "0.54rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-3)" }}>
            Matched Skills
          </div>
          <div style={{ width: 80 }} />
        </div>
      )}

      {/* Loading skeleton */}
      {state === "loading" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div className="cs-skel-bg" style={{ width: 140, height: 12, borderRadius: 4, background: "#E2E8F0" }} />
            <div className="cs-skel-bg" style={{ width: 80, height: 12, borderRadius: 4, background: "#E2E8F0" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {state === "results" && (
        <>
          {view === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {people.map((c, i) => (
                <div key={c.id} className="cs-row-in" style={{ animationDelay: `${i * 0.03}s` }}>
                  <CandidateRow
                    candidate={c}
                    matchedSkills={matchedSkills}
                    selected={selectedId === c.id}
                    onClick={() => handleRowClick(c)}
                    view="list"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: 12 }}>
              {people.map((c, i) => (
                <div key={c.id} className="cs-row-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <CandidateRow
                    candidate={c}
                    matchedSkills={matchedSkills}
                    selected={selectedId === c.id}
                    onClick={() => handleRowClick(c)}
                    view="card"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onLoadPrev}
              disabled={currentPage <= 1}
              style={{
                padding: "8px 18px", borderRadius: 8,
                border: "1px solid var(--border)", background: "#fff",
                color: currentPage > 1 ? "var(--text-2)" : "var(--text-3)",
                fontFamily: "var(--font-b)", fontSize: "0.78rem", cursor: currentPage > 1 ? "pointer" : "not-allowed",
                opacity: currentPage <= 1 ? 0.4 : 1,
              }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "var(--font-m)" }}>
              Page {currentPage} · showing {people.length} of ~{totalEntries.toLocaleString("en-IN")}
            </span>
            <button
              onClick={onLoadMore}
              disabled={people.length < RESULTS_PER_PAGE}
              style={{
                padding: "8px 18px", borderRadius: 8,
                border: "1px solid var(--border)", background: "#fff",
                color: "var(--text-2)", fontFamily: "var(--font-b)", fontSize: "0.78rem",
                cursor: people.length >= RESULTS_PER_PAGE ? "pointer" : "not-allowed",
                opacity: people.length < RESULTS_PER_PAGE ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};