// src/pages/TalentIntelligence/TalentIntelligencePage.tsx
// Change vs v5: onInvite for TIProfileModal now receives (p, email, phone)
// because TIProfileModal v2 handles personal-email picker internally
// and passes the selected contact up before opening CandidateInviteGate.

import React, { useState, useCallback } from "react";
import { Database, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { useTISearch } from "@/hooks/useTISearch";
import { TISearchSidebar }  from "@/components/talent-intelligence/TISearchSidebar";
import { TIResultsTable }   from "@/components/talent-intelligence/TIResultsTable";
import { TIProfileModal }   from "@/components/talent-intelligence/TIProfileModal";
import { TIFilterChips }    from "@/components/talent-intelligence/TIFilterChips";
import { TIEmptyState }     from "@/components/talent-intelligence/TIEmptyState";
import { CandidateInviteGate } from "@/components/CandidateSearch/components/CandidateInviteGate";
import { TIProfile, TIRevealedEmail, TIRevealedPhone } from "@/types/talentIntelligence";

interface InviteTarget { profile: TIProfile; email: string|null; phone: string|null; }

export function TalentIntelligencePage() {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;
  const userId         = auth?.userId ?? null;

  const {
    profiles, total, page, isLoading, isSearching,
    error, filters, hasFilters, stats,
    setFilters, setPage, resetFilters, refetch, patchProfile,
  } = useTISearch();

  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<TIProfile | null>(null);
  const [inviteTarget,    setInviteTarget]    = useState<InviteTarget | null>(null);

  const handleProfileUpdate = useCallback((id: string, patch: Partial<TIProfile>) => {
    patchProfile(id, patch);
    setSelectedProfile(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }, [patchProfile]);

  const handleRevealUpdate = useCallback((id: string, emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => {
    patchProfile(id, { revealed_emails: emails, revealed_phones: phones, revealed_at: new Date().toISOString() });
    setSelectedProfile(prev => prev?.id === id ? { ...prev, revealed_emails: emails, revealed_phones: phones } : prev);
  }, [patchProfile]);

  // Receives pre-selected personal email (or phone) from table InvitePicker
  // or from modal's internal picker — no first-email guessing here
  const handleInvite = useCallback((profile: TIProfile, email: string|null, phone: string|null) => {
    setInviteTarget({ profile, email, phone });
  }, []);

  const activeFilters = { skillChips: filters.skillChips, titles: filters.titles, query: filters.query };
  const SIDEBAR_W = 266;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 70px - 8px)", background: "#f8f9fc" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-0 bg-gradient-to-r from-violet-700 to-purple-700 border-b border-violet-800/30 shadow-sm" style={{ height: 44 }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
            <Database size={13} className="text-white" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-white leading-tight">Talent Intelligence</h1>
            <p className="text-[9px] text-violet-200 leading-none">
              {total.toLocaleString()} profile{total !== 1 ? "s" : ""} in your database
            </p>
          </div>
          {isSearching && (
            <span className="ml-2 text-[10px] text-violet-200 flex items-center gap-1">
              <RefreshCw size={9} className="animate-spin" /> Searching…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {stats && (
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <span className="text-[9px] text-violet-200">
                <span className="font-bold text-white">{Number(stats.email_revealed).toLocaleString()}</span> email
              </span>
              <span className="text-[9px] text-violet-200">
                <span className="font-bold text-white">{Number(stats.phone_revealed).toLocaleString()}</span> phone revealed
              </span>
              <span className="text-[9px] text-violet-200">
                <span className="font-bold text-white">{Number(stats.open_to_work).toLocaleString()}</span> OTW
              </span>
            </div>
          )}
          <button onClick={refetch} title="Refresh"
            className="p-1.5 text-violet-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Sidebar */}
        <div className="flex-shrink-0 border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out bg-white"
          style={{ width: sidebarOpen ? SIDEBAR_W : 0 }}>
          <div style={{ width: SIDEBAR_W, height: "100%" }}>
            <TISearchSidebar filters={filters} onChange={setFilters} onReset={resetFilters} stats={stats} />
          </div>
        </div>

        {/* Floating sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Collapse filters" : "Expand filters"}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center",
            "w-4 h-10 bg-white border border-slate-200 shadow-md transition-all duration-300",
            "hover:border-violet-400 hover:text-violet-600 hover:shadow-violet-100",
            "text-slate-400 rounded-r-full",
          )}
          style={{ left: sidebarOpen ? SIDEBAR_W - 1 : -1, borderLeft: "none" }}>
          {sidebarOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
        </button>

        {/* Results panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
          <TIFilterChips filters={filters} onChange={setFilters} onReset={resetFilters} />

          {error && (
            <div className="mx-4 mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex-shrink-0">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={refetch} className="text-xs underline flex-shrink-0">Retry</button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {!isLoading && profiles.length === 0 ? (
              <div className="overflow-y-auto flex-1">
                <TIEmptyState hasFilters={hasFilters} onReset={resetFilters} />
              </div>
            ) : (
              <TIResultsTable
                profiles={profiles}
                total={total}
                page={page}
                isLoading={isLoading}
                isSearching={isSearching}
                activeFilters={activeFilters}
                onSelectProfile={setSelectedProfile}
                onInvite={handleInvite}
                onPageChange={setPage}
                onRevealUpdate={handleRevealUpdate}
              />
            )}
          </div>
        </div>
      </div>

      {/* Profile modal */}
      <TIProfileModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        // ── CHANGED: modal now handles personal-email picker internally
        //    and passes the selected (email, phone) up here.
        //    No more guessing with revealed_emails[0].
        onInvite={(p, email, phone) => {
          setSelectedProfile(null);
          setInviteTarget({ profile: p, email, phone });
        }}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* CandidateInviteGate — job picker → invite modal */}
      {inviteTarget && (
        <CandidateInviteGate
          candidateName={inviteTarget.profile.full_name ?? "Candidate"}
          candidateEmail={inviteTarget.email ?? undefined}
          candidatePhone={inviteTarget.phone ?? undefined}
          apolloPersonId={`ti_${inviteTarget.profile.id}`}
          organizationId={organizationId ?? undefined}
          userId={userId ?? undefined}
          onClose={() => setInviteTarget(null)}
          onInviteSent={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}