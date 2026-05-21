// src/components/talent-intelligence/TIInviteModal.tsx
// WhatsApp invite modal for Talent Intelligence profiles

import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  X, Send, Phone, MessageCircle, Loader2, CheckCircle, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { TIProfile } from "@/types/talentIntelligence";

interface TIInviteModalProps {
  profile: TIProfile | null;
  onClose: () => void;
}

function InviteContent({ profile, onClose }: TIInviteModalProps) {
  if (!profile) return null;

  const authData        = getAuthDataFromLocalStorage();
  const organizationId  = authData?.organization_id ?? null;

  const revealedPhone = profile.revealed_phones?.[0]?.number ?? "";
  const [phone,     setPhone]     = useState(revealedPhone);
  const [name,      setName]      = useState(profile.full_name ?? "");
  const [jobTitle,  setJobTitle]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState<"idle" | "success" | "error">("idle");
  const [errMsg,    setErrMsg]    = useState("");

  const handleSend = async () => {
    if (!phone.trim()) { setErrMsg("Phone number is required"); return; }
    if (!organizationId) { setErrMsg("Organization not found"); return; }
    setLoading(true); setErrMsg(""); setStatus("idle");

    try {
      // Use the candidate_invite WhatsApp template (configured on the org)
      // The template body vars: [1]=name, [2]=job title, [3]=link/expiry
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          organizationId,
          to:           phone.trim().replace(/\s/g, ""),
          templateName: "candidate_invite",
          variables: {
            body: [name || "Candidate", jobTitle || "this opportunity", "—"],
          },
        },
      });
      if (error || data?.error) throw new Error(data?.message ?? error?.message ?? "Send failed");
      setStatus("success");
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setStatus("error");
      setErrMsg(err.message ?? "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <MessageCircle size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Send Invite</h3>
              <p className="text-xs text-slate-500">via messaging</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Profile preview */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(profile.full_name ?? "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{profile.full_name ?? "Unknown"}</p>
            <p className="text-xs text-slate-500 truncate">{profile.title ?? ""} {profile.company_name ? `@ ${profile.company_name}` : ""}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Candidate Name <span className="text-red-400">*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
              placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
                placeholder="+91 9876543210" />
            </div>
            {!revealedPhone && (
              <p className="text-[10px] text-amber-600 mt-1">Phone not yet revealed — enter manually</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Position / Role</label>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
              placeholder="e.g. Senior React Developer" />
          </div>
        </div>

        {/* Status messages */}
        {errMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
            <AlertCircle size={13} /> {errMsg}
          </div>
        )}
        {status === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-4">
            <CheckCircle size={13} /> Invite sent successfully!
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSend} disabled={loading || status === "success"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm rounded-xl font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send Invite</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TIInviteModal(props: TIInviteModalProps) {
  if (!props.profile) return null;
  return ReactDOM.createPortal(<InviteContent {...props} />, document.body);
}