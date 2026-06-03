// src/components/global/WaterfallNotificationConfig.tsx
// Global superadmin settings page for waterfall email notifications.
// Route: /waterfall/settings
//
// Features:
//   - Add/remove multiple alert email addresses (notified on NEW waterfall entry)
//   - Toggle: notify requester recruiter when resolved
//   - Toggle: create in-app notification for requester when resolved
//
// Data stored in: waterfall_notification_config table (single global row)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Plus, X, Loader2, Check, AlertCircle, Bell, ArrowLeft,
  Save, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface WaterfallConfig {
  id:               string;
  alert_emails:     string[];
  notify_requester: boolean;
  notify_in_app:    boolean;
  updated_at:       string;
}

function EmailChip({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-2.5 py-1 text-[11px] font-medium">
      <Mail size={9} className="flex-shrink-0" />
      <span className="truncate max-w-[180px]">{email}</span>
      <button type="button" onClick={onRemove}
        className="flex-shrink-0 text-violet-400 hover:text-red-500 transition-colors ml-0.5">
        <X size={10} />
      </button>
    </div>
  );
}

function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "flex-shrink-0 w-10 h-5 rounded-full relative transition-colors duration-200",
          checked ? "bg-violet-600" : "bg-slate-200"
        )}>
        <span className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

export function WaterfallNotificationConfig() {
  const navigate = useNavigate();

  const [config,    setConfig]    = useState<WaterfallConfig | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  // Draft state (editing in memory before save)
  const [alertEmails,      setAlertEmails]      = useState<string[]>([]);
  const [notifyRequester,  setNotifyRequester]  = useState(true);
  const [notifyInApp,      setNotifyInApp]      = useState(true);

  // New email input
  const [newEmail,         setNewEmail]         = useState("");
  const [emailInputError,  setEmailInputError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("waterfall_notification_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (dbErr) throw new Error(dbErr.message);

      if (data) {
        setConfig(data as WaterfallConfig);
        setAlertEmails((data as any).alert_emails ?? []);
        setNotifyRequester((data as any).notify_requester ?? true);
        setNotifyInApp((data as any).notify_in_app ?? true);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailInputError("Enter a valid email address");
      return;
    }
    if (alertEmails.includes(trimmed)) {
      setEmailInputError("Email already added");
      return;
    }
    setAlertEmails(prev => [...prev, trimmed]);
    setNewEmail("");
    setEmailInputError(null);
  };

  const handleRemoveEmail = (email: string) => {
    setAlertEmails(prev => prev.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddEmail(); }
    if (e.key === "Escape") { setNewEmail(""); setEmailInputError(null); }
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      // Upsert the single config row
      const { error: upsertErr } = await supabase
        .from("waterfall_notification_config")
        .upsert({
          ...(config?.id ? { id: config.id } : {}),
          alert_emails:     alertEmails,
          notify_requester: notifyRequester,
          notify_in_app:    notifyInApp,
          updated_at:       new Date().toISOString(),
        });

      if (upsertErr) throw new Error(upsertErr.message);

      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 70px)" }}>

      {/* Page header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 border-b border-amber-700/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/waterfall")}
            className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-[14px] font-bold text-white">Notification Settings</h1>
            <p className="text-[10px] text-amber-100 mt-0.5">Configure alerts for waterfall events</p>
          </div>
        </div>
        <button onClick={load} title="Refresh" className="p-2 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-6">

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-700">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Section 1: Alert emails for new requests */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={13} className="text-amber-500" />
                <h2 className="text-[13px] font-bold text-slate-800">New Request Alerts</h2>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                These email addresses are notified every time a recruiter adds a profile to the waterfall queue. Intended for the superadmin team.
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Existing chips */}
              {alertEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {alertEmails.map(email => (
                    <EmailChip key={email} email={email} onRemove={() => handleRemoveEmail(email)} />
                  ))}
                </div>
              )}

              {/* Add email input */}
              <div className="space-y-1">
                <div className={cn(
                  "flex items-center gap-2 border rounded-xl px-3 h-9 transition-colors",
                  emailInputError
                    ? "border-red-300 focus-within:border-red-400"
                    : "border-slate-200 focus-within:border-violet-400"
                )}>
                  <Mail size={11} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => { setNewEmail(e.target.value); setEmailInputError(null); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Add alert email address…"
                    className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder-slate-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    disabled={!newEmail.trim()}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <Plus size={11} />
                  </button>
                </div>
                {emailInputError && (
                  <p className="text-[10px] text-red-500 px-1">{emailInputError}</p>
                )}
                <p className="text-[10px] text-slate-400 px-1">Press Enter or click + to add. Multiple addresses supported.</p>
              </div>

              {alertEmails.length === 0 && (
                <p className="text-[11px] text-slate-400 italic">No alert emails configured. New requests will not send alerts.</p>
              )}
            </div>
          </div>

          {/* Section 2: Recruiter resolved notification */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={13} className="text-violet-500" />
                <h2 className="text-[13px] font-bold text-slate-800">Resolution Notifications</h2>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When a superadmin resolves a waterfall entry (marks as found or not found), the recruiter who requested it is notified.
              </p>
            </div>

            <div className="px-5 divide-y divide-slate-100">
              <Toggle
                checked={notifyRequester}
                onChange={setNotifyRequester}
                label="Email notification to recruiter"
                description="Send an email to the recruiter who requested the contact reveal when it is resolved."
              />
              <Toggle
                checked={notifyInApp}
                onChange={setNotifyInApp}
                label="In-app notification to recruiter"
                description="Show an in-app notification bell alert to the recruiter inside the Xrilic platform."
              />
            </div>
          </div>

          {/* Email template preview note */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <p className="text-[11px] text-violet-700 leading-relaxed">
              <strong>Email sender:</strong> Uses the platform SMTP configuration (configured in Supabase secrets as <code className="bg-violet-100 px-1 rounded text-[10px]">SMTP_USER</code>). The email is sent from the Xrilic platform on behalf of the superadmin team.
            </p>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all",
                saved
                  ? "bg-emerald-600"
                  : "bg-violet-600 hover:bg-violet-700",
                saving && "opacity-60 cursor-not-allowed"
              )}>
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><Check size={13} /> Saved</>
              ) : (
                <><Save size={13} /> Save Settings</>
              )}
            </button>
            {config?.updated_at && (
              <p className="text-[10px] text-slate-400">
                Last saved {new Date(config.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}