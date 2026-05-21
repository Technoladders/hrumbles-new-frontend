// src/pages/TalentIntelligence/TalentIntelligencePage.tsx  — v2

import React, { useState, useCallback } from "react";
import { Database, RefreshCw, AlertCircle } from "lucide-react";
import { useTISearch } from "@/hooks/useTISearch";
import { TISearchSidebar } from "@/components/talent-intelligence/TISearchSidebar";
import { TIResultsTable }   from "@/components/talent-intelligence/TIResultsTable";
import { TIProfileModal }   from "@/components/talent-intelligence/TIProfileModal";
import { TIInviteModal }    from "@/components/talent-intelligence/TIInviteModal";
import { TIFilterChips }    from "@/components/talent-intelligence/TIFilterChips";
import { TIEmptyState }     from "@/components/talent-intelligence/TIEmptyState";
import { TIProfile, TIRevealedEmail, TIRevealedPhone } from "@/types/talentIntelligence";

export function TalentIntelligencePage() {
  const {
    profiles, total, page, isLoading, isSearching,
    error, filters, hasFilters, stats,
    setFilters, setPage, resetFilters, refetch, patchProfile,
  } = useTISearch();

  const [selectedProfile, setSelectedProfile] = useState<TIProfile | null>(null);
  const [inviteProfile,   setInviteProfile]   = useState<TIProfile | null>(null);

  const handleProfileUpdate = useCallback((id: string, patch: Partial<TIProfile>) => {
    patchProfile(id, patch);
    // Also keep modal in sync if it's open
    setSelectedProfile(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }, [patchProfile]);

  const handleRevealUpdate = useCallback((id: string, emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => {
    patchProfile(id, {
      revealed_emails: emails,
      revealed_phones: phones,
      revealed_at:     new Date().toISOString(),
    });
    // Sync modal if open
    setSelectedProfile(prev => prev?.id === id
      ? { ...prev, revealed_emails: emails, revealed_phones: phones }
      : prev
    );
  }, [patchProfile]);

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "calc(100vh - 70px - 8px)" }}>

      {/* Header */}
      <div className="crmtheme-header-bar flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Database size={16} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Talent Intelligence</h1>
            <p className="text-xs text-slate-400 leading-none">
              {total.toLocaleString()} profile{total !== 1 ? "s" : ""} in your database
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSearching && (
            <span className="text-xs text-violet-600 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Searching…
            </span>
          )}
          <button onClick={refetch} title="Refresh" className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <div className="w-[272px] flex-shrink-0 border-r border-slate-200 overflow-hidden">
          <TISearchSidebar
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            stats={stats}
          />
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">

          <TIFilterChips filters={filters} onChange={setFilters} onReset={resetFilters} />

          {error && (
            <div className="mx-4 mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex-shrink-0">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={refetch} className="ml-auto text-xs text-red-600 hover:text-red-800 underline flex-shrink-0">Retry</button>
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
                onSelectProfile={setSelectedProfile}
                onInvite={setInviteProfile}
                onPageChange={setPage}
                onRevealUpdate={handleRevealUpdate}
              />
            )}
          </div>
        </div>
      </div>

      {/* Profile modal — portal above MainLayout */}
      <TIProfileModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onInvite={p => { setSelectedProfile(null); setInviteProfile(p); }}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Invite modal — portal */}
      <TIInviteModal
        profile={inviteProfile}
        onClose={() => setInviteProfile(null)}
      />
    </div>
  );
}