import React, { useState, useEffect, useCallback } from "react";
import { GLOBAL_CSS } from "./components/styles/globalCss";
import { SearchSidebar } from "./components/SearchSidebar";
import { ResultsArea } from "./components/ResultsArea";
import { ActiveFilterBar } from "./components/ActiveFilterBar";
import { DetailPanel } from "./components/DetailPanel";
import { useFilterState } from "./hooks/useFilterState";
import { useCandidateSearch } from "./hooks/useCandidateSearch";
import { ApolloCandidate } from "./types";

const CandidateSearchPage: React.FC = () => {
  const [selected, setSelected] = useState<ApolloCandidate | null>(null);
  const [banner,   setBanner]   = useState(true);

  const filters = useFilterState();

  const {
    state, people, totalEntries, currentPage, error,
    search, loadMore, loadPrev, reset,
  } = useCandidateSearch({
    skills:      filters.skills,
    titles:      filters.titles,
    locations:   filters.locations,
    seniorities: filters.seniorities,
  });

  // Deselect panel whenever results refresh
  useEffect(() => { setSelected(null); }, [state]);

  const handleClearAll = useCallback(() => {
    filters.clearAll();
    reset();
    setSelected(null);
  }, [filters, reset]);

  const handleQuickSearch = useCallback((skills: string[]) => {
    filters.setSkillsFromQuickSearch(skills);
  }, [filters]);

  // Auto-trigger search when quick-search presets populate skills
  useEffect(() => {
    if (filters.skills.length > 0 && state === "idle") {
      const t = setTimeout(() => search(1), 80);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.skills]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="cs-root">

        {/* ── Top Bar ─────────────────────────────────────────── */}
        <div style={{
          background: "var(--sidebar)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0, zIndex: 200,
        }}>
          <div style={{
            maxWidth: 1440, margin: "0 auto", padding: "0 26px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            height: 54,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{
                fontFamily: "var(--font-d)", fontWeight: 800,
                fontSize: "1rem", color: "#fff", letterSpacing: "-0.2px",
              }}>
                Talent Intelligence
              </span>
              <div style={{ height: 16, width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 5,
                  background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.3)",
                  fontFamily: "var(--font-m)", fontSize: "0.52rem", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "1.8px", color: "#F59E0B",
                }}>
                  β Beta
                </span>
                <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.35)" }}>
                  Skill-Based Search
                </span>
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 20,
              background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.22)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "block" }} />
              <span style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "#6EE7B7" }}>
                275M+ Professionals
              </span>
            </div>
          </div>
        </div>

        {/* ── Onboarding banner ────────────────────────────────── */}
        {banner && (
          <div style={{
            background: "linear-gradient(90deg,rgba(37,99,235,0.05),rgba(124,58,237,0.03))",
            borderBottom: "1px solid rgba(37,99,235,0.1)",
            padding: "9px 26px",
          }}>
            <div style={{
              maxWidth: 1440, margin: "0 auto",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <p style={{ fontSize: "0.76rem", color: "#1E3A8A", lineHeight: 1.5, margin: 0 }}>
                💡 <strong>Pro tip:</strong> Stack 2–3 core technologies for the strongest signal — e.g.{" "}
                <code style={{
                  background: "rgba(37,99,235,0.1)", padding: "1px 6px", borderRadius: 4,
                  fontFamily: "var(--font-m)", fontSize: "0.72rem", color: "#1D4ED8",
                }}>
                  Python + FastAPI + PostgreSQL
                </code>
                . Results show name + company only — use enrichment for verified contact info.
              </p>
              <button
                onClick={() => setBanner(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-3)", fontSize: "1.1rem", padding: 4, flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ── Body ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", maxWidth: 1440, margin: "0 auto", minHeight: "calc(100vh - 54px)" }}>

          {/* Sidebar */}
          <SearchSidebar
            skills={filters.skills}
            titles={filters.titles}
            locations={filters.locations}
            seniorities={filters.seniorities}
            isLoading={state === "loading"}
            hasFilters={filters.hasFilters}
            onAddSkill={filters.addSkill}
            onRemoveSkill={filters.removeSkill}
            onAddTitle={filters.addTitle}
            onRemoveTitle={filters.removeTitle}
            onAddLocation={filters.addLocation}
            onRemoveLocation={filters.removeLocation}
            onToggleSeniority={filters.toggleSeniority}
            onSearch={() => search(1)}
            onClearAll={handleClearAll}
          />

          {/* Main */}
          <main style={{
            flex: 1,
            overflowX: "hidden",
            paddingRight: selected ? 432 : 0,
            transition: "padding-right 0.22s ease",
          }}>
            <ActiveFilterBar
              skills={filters.skills}
              titles={filters.titles}
              locations={filters.locations}
              seniorities={filters.seniorities}
              onRemoveSkill={filters.removeSkill}
              onRemoveTitle={filters.removeTitle}
              onRemoveLocation={filters.removeLocation}
              onRemoveSeniority={filters.toggleSeniority}
            />

            <div style={{ padding: "22px 24px 56px" }}>
              <ResultsArea
                state={state}
                people={people}
                totalEntries={totalEntries}
                currentPage={currentPage}
                matchedSkills={filters.skills}
                selectedId={selected?.id || null}
                error={error}
                onSelectCandidate={setSelected}
                onQuickSearch={handleQuickSearch}
                onClearAll={handleClearAll}
                onRetry={() => search(currentPage)}
                onLoadMore={loadMore}
                onLoadPrev={loadPrev}
              />
            </div>
          </main>
        </div>

        {/* Detail panel */}
        {selected && (
          <DetailPanel
            candidate={selected}
            matchedSkills={filters.skills}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  );
};

export default CandidateSearchPage;