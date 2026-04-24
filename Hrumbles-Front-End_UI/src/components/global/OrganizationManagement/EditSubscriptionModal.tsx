// src/components/global/OrganizationManagement/EditSubscriptionModal.tsx
// Direct edit of subscription/trial fields — no invoice created
// Replaces SubscriptionBillingModal for the "Modify/Upgrade Plan" button in SingleOrganizationDashboard

import { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../integrations/supabase/client';
import { toast } from 'sonner';
import {
  X, Loader2, Calendar, CreditCard, Clock, Check,
  ChevronDown, AlertTriangle, Zap, Award, Rocket,
  CalendarDays, RefreshCw, Shield
} from 'lucide-react';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentData: {
    subscription_status: string;
    subscription_plan: string | null;
    subscription_start_date: string | null;
    subscription_expires_at: string | null;
    trial_start_date: string | null;
    trial_end_date: string | null;
    trial_extended: boolean;
    role_credit_limits: any;
    subscription_features: any;
    status: string;
  };
  onSuccess: () => void;
}

const PLANS = [
  { id: "Free Trial",    label: "Free Trial",    color: "#6B7280", bg: "#F9FAFB" },
  { id: "Starter",       label: "Starter",        color: "#3B82F6", bg: "#EFF6FF" },
  { id: "Professional", label: "Professional",   color: "#7B43F1", bg: "#EDE9FE" },
  { id: "Enterprise",   label: "Enterprise",     color: "#059669", bg: "#ECFDF5" },
];

const SUITE_KEYS = [
  { key: "hiring_suite",       label: "Hiring Suite" },
  { key: "sales_suite",        label: "Sales Suite" },
  { key: "finance_suite",      label: "Finance Suite" },
  { key: "project_suite",      label: "Project Suite" },
  { key: "verification_suite", label: "Verification Suite" },
  { key: "general_suite",      label: "General Suite" },
];

const SUB_STATUSES = [
  { value: "trial",    label: "Trial",    color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { value: "active",   label: "Active",   color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "expired",  label: "Expired",  color: "text-red-600 bg-red-50 border-red-200" },
  { value: "inactive", label: "Inactive", color: "text-gray-600 bg-gray-100 border-gray-200" },
  { value: "canceled", label: "Canceled", color: "text-gray-600 bg-gray-100 border-gray-200" },
];

const ORG_STATUSES = [
  { value: "active",    label: "Active",    color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "inactive",  label: "Inactive",  color: "text-gray-600 bg-gray-100 border-gray-200" },
  { value: "suspended", label: "Suspended", color: "text-amber-700 bg-amber-50 border-amber-200" },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7B43F1] focus:border-[#7B43F1] transition-colors bg-white";

export const EditSubscriptionModal: FC<EditSubscriptionModalProps> = ({
  isOpen, onClose, organizationId, currentData, onSuccess,
}) => {
  const [saving, setSaving] = useState(false);

  // Form state mirrors org fields exactly
  const [form, setForm] = useState({
    subscription_status: currentData.subscription_status || "trial",
    subscription_plan: currentData.subscription_plan || "",
    subscription_start_date: currentData.subscription_start_date?.split("T")[0] || "",
    subscription_expires_at: currentData.subscription_expires_at?.split("T")[0] || "",
    trial_start_date: currentData.trial_start_date?.split("T")[0] || "",
    trial_end_date: currentData.trial_end_date?.split("T")[0] || "",
    trial_extended: currentData.trial_extended || false,
    org_status: currentData.status || "active",
    // Role credit limits as individual fields
    limits: { ...(currentData.role_credit_limits || {}) } as Record<string, number>,
    // Suite toggles
    features: { ...(currentData.subscription_features || {}) } as Record<string, boolean>,
  });

  // Re-sync when modal opens with fresh data
  useEffect(() => {
    if (isOpen) {
      setForm({
        subscription_status: currentData.subscription_status || "trial",
        subscription_plan: currentData.subscription_plan || "",
        subscription_start_date: currentData.subscription_start_date?.split("T")[0] || "",
        subscription_expires_at: currentData.subscription_expires_at?.split("T")[0] || "",
        trial_start_date: currentData.trial_start_date?.split("T")[0] || "",
        trial_end_date: currentData.trial_end_date?.split("T")[0] || "",
        trial_extended: currentData.trial_extended || false,
        org_status: currentData.status || "active",
        limits: { ...(currentData.role_credit_limits || {}) },
        features: { ...(currentData.subscription_features || {}) },
      });
    }
  }, [isOpen, currentData]);

  const extendTrial = (days: number) => {
    const base = form.trial_end_date ? new Date(form.trial_end_date) : new Date();
    const extended = new Date(base.getTime() + days * 86400000);
    setForm((f) => ({
      ...f,
      trial_end_date: extended.toISOString().split("T")[0],
      trial_extended: true,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        status: form.org_status,
        subscription_status: form.subscription_status,
        subscription_plan: form.subscription_plan || null,
        trial_extended: form.trial_extended,
        role_credit_limits: form.limits,
        subscription_features: form.features,
      };

      // Dates — only set if non-empty
      if (form.subscription_start_date)
        updates.subscription_start_date = new Date(form.subscription_start_date).toISOString();
      else updates.subscription_start_date = null;

      if (form.subscription_expires_at)
        updates.subscription_expires_at = new Date(form.subscription_expires_at).toISOString();
      else updates.subscription_expires_at = null;

      if (form.trial_start_date)
        updates.trial_start_date = new Date(form.trial_start_date).toISOString();
      else updates.trial_start_date = null;

      if (form.trial_end_date)
        updates.trial_end_date = new Date(form.trial_end_date).toISOString();
      else updates.trial_end_date = null;

      const { error } = await supabase
        .from("hr_organizations")
        .update(updates)
        .eq("id", organizationId);

      if (error) throw error;

      toast.success("Subscription updated successfully");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Subscription & Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Direct edit — no invoice generated</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ── Section 1: Status ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Shield size={11} /> Status
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Organization Status">
                <div className="flex flex-wrap gap-1.5">
                  {ORG_STATUSES.map((s) => (
                    <button key={s.value} onClick={() => setForm((f) => ({ ...f, org_status: s.value }))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        form.org_status === s.value ? s.color + " ring-1 ring-current" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Subscription Status">
                <div className="flex flex-wrap gap-1.5">
                  {SUB_STATUSES.map((s) => (
                    <button key={s.value} onClick={() => setForm((f) => ({ ...f, subscription_status: s.value }))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        form.subscription_status === s.value ? s.color + " ring-1 ring-current" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* ── Section 2: Plan ────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Award size={11} /> Plan
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setForm((f) => ({ ...f, subscription_plan: p.id }))}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                    form.subscription_plan === p.id
                      ? "border-[#7B43F1] bg-[#EDE9FE] text-[#7B43F1]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 3: Subscription Dates ─────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Calendar size={11} /> Subscription Dates
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <input type="date" value={form.subscription_start_date} onChange={(e) => setForm((f) => ({ ...f, subscription_start_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Expiry Date">
                <input type="date" value={form.subscription_expires_at} onChange={(e) => setForm((f) => ({ ...f, subscription_expires_at: e.target.value }))} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Section 4: Trial Dates ─────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Rocket size={11} /> Trial
            </p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label="Trial Start">
                <input type="date" value={form.trial_start_date} onChange={(e) => setForm((f) => ({ ...f, trial_start_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Trial End">
                <input type="date" value={form.trial_end_date} onChange={(e) => setForm((f) => ({ ...f, trial_end_date: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-medium">Quick extend:</span>
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => extendTrial(d)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#7B43F1] text-[#7B43F1] hover:bg-[#EDE9FE] transition-colors">
                  +{d}d
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 cursor-pointer">
                <button onClick={() => setForm((f) => ({ ...f, trial_extended: !f.trial_extended }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.trial_extended ? "bg-[#7B43F1]" : "bg-gray-200"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.trial_extended ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">Trial Extended</span>
              </label>
            </div>
          </div>

          {/* ── Section 5: Role Credit Limits ─────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Zap size={11} /> Role Credit Limits
            </p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(form.limits).map(([role, limit]) => (
                <Field key={role} label={role === "organization_superadmin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)}>
                  <input type="number" min="0" value={limit}
                    onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, [role]: parseInt(e.target.value) || 0 } }))}
                    className={inputCls} />
                </Field>
              ))}
            </div>
          </div>

          {/* ── Section 6: Feature Suites ──────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Feature Suites</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUITE_KEYS.map(({ key, label }) => {
                const enabled = !!form.features[key];
                return (
                  <button key={key} onClick={() => setForm((f) => ({ ...f, features: { ...f.features, [key]: !enabled } }))}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      enabled ? "border-[#7B43F1] bg-[#EDE9FE] text-[#7B43F1]" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                    }`}>
                    <span>{label}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${enabled ? "border-[#7B43F1] bg-[#7B43F1]" : "border-gray-300"}`}>
                      {enabled && <Check size={8} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle size={12} />
            <span>Changes apply immediately — no invoice generated</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: "#7B43F1" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
     document.body
  );
};

export default EditSubscriptionModal;