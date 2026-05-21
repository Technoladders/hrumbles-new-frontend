// src/components/talent-intelligence/TIEmptyState.tsx

import React from "react";
import { SearchX, Database, RotateCcw } from "lucide-react";

interface Props {
  hasFilters: boolean;
  onReset: () => void;
}

export function TIEmptyState({ hasFilters, onReset }: Props) {
  if (!hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
          <Database size={28} className="text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-2">
          No profiles in your database yet
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Use People Search to discover candidates. Profiles you search for are automatically
          saved here for instant access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <SearchX size={28} className="text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-2">
        No matching profiles found
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">
        Your current filters didn't match any profiles in your database. Try broadening your search.
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg font-medium hover:bg-violet-700 transition-colors"
      >
        <RotateCcw size={14} />
        Clear filters
      </button>
    </div>
  );
}