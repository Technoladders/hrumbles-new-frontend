// src/components/talent-intelligence/TIProviderSetting.tsx
// ============================================================
// Drop-in settings control for hr_organizations.ti_reveal_provider
// Add this to your org settings page / ManageVerificationPricingModal
// ============================================================

import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { Database, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_OPTIONS = [
  {
    value: "contactout",
    label: "Default (ContactOut)",
    desc:  "Uses the existing ContactOut reveal flow. No change to current behaviour.",
    badge: "Current default",
  },
  {
    value: "rocketreach",
    label: "RocketReach",
    desc:  "Looks up contacts via LinkedIn URL using the RocketReach API.",
    badge: null,
  },
  {
    value: "rocketreach_apollo",
    label: "RocketReach → Apollo",
    desc:  "RocketReach first. If no contact data found, falls back to Apollo.",
    badge: "Recommended",
  },
  {
    value: "apollo",
    label: "Apollo",
    desc:  "Uses Apollo people/match by LinkedIn URL.",
    badge: null,
  },
];

interface TIProviderSettingProps {
  currentProvider: string;
  onSaved?: (provider: string) => void;
}

export function TIProviderSetting({ currentProvider, onSaved }: TIProviderSettingProps) {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;

  const [selected, setSelected]   = useState(currentProvider ?? "contactout");
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSavedState] = useState(false);
  const [error,    setError]      = useState<string | null>(null);

  const handleSave = async () => {
    if (!organizationId || selected === currentProvider) return;
    setSaving(true); setError(null); setSavedState(false);
    const { error: dbErr } = await supabase
      .from("hr_organizations")
      .update({ ti_reveal_provider: selected })
      .eq("id", organizationId);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSavedState(true);
    onSaved?.(selected);
    setTimeout(() => setSavedState(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Database size={14} className="text-violet-600" />
        <h4 className="text-sm font-semibold text-slate-700">Talent Intelligence — Reveal Provider</h4>
      </div>
      <p className="text-xs text-slate-500">
        Controls how email and phone contacts are revealed in Talent Intelligence.
        Prices are the same regardless of provider.
      </p>

      <div className="space-y-2">
        {PROVIDER_OPTIONS.map(opt => (
          <label key={opt.value}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              selected === opt.value
                ? "border-violet-400 bg-violet-50"
                : "border-slate-200 bg-white hover:border-violet-200"
            )}
            onClick={() => setSelected(opt.value)}>
            <div className={cn(
              "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
              selected === opt.value ? "border-violet-600 bg-violet-600" : "border-slate-300"
            )}>
              {selected === opt.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                {opt.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold uppercase">
                    {opt.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || selected === currentProvider}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
          saved
            ? "bg-green-100 text-green-700"
            : selected === currentProvider
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-violet-600 text-white hover:bg-violet-700"
        )}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
        {saving ? "Saving…" : saved ? "Saved!" : "Save Setting"}
      </button>
    </div>
  );
}