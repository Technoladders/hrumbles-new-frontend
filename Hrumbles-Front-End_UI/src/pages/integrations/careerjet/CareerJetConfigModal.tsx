// src/pages/integrations/careerjet/CareerJetConfigModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full CareerJet Config + Test modal
// Tabs: Setup | XML Feed | Test APIs | Analytics
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getIntegration,
  upsertIntegration,
  toggleIntegrationActive,
  getXmlFeedUrl,
} from "@/services/integrationService";
import { useCareerJet } from "@/hooks/useCareerJet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/jobs/ui/dialog";
import {
  Copy, Check, Eye, EyeOff, ExternalLink, RefreshCw,
  Key, Zap, AlertTriangle, CheckCircle2, Clock, XCircle,
  Rss, Globe, ChevronRight, Info, Search, Play, Loader2,
  BarChart2, AlertCircle, ChevronDown, ChevronUp, Wifi,
} from "lucide-react";
import moment from "moment";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── Tiny shared components ────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-stone-500 mb-1.5">{children}</p>
);

const CopyBtn = ({ text }: { text: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold
        bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all">
      {done ? <Check size={11} /> : <Copy size={11} />}
      {done ? "Copied" : "Copy"}
    </button>
  );
};

const Field = ({ label, value, onChange, type = "text", placeholder, hint, readOnly = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; readOnly?: boolean;
}) => {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={isPwd && !show ? "password" : "text"}
          value={value} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder} readOnly={readOnly}
          className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono transition-all
            ${readOnly ? "bg-stone-50 border-stone-200 text-stone-500 cursor-default"
              : "bg-white border-stone-300 text-stone-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"}`}
        />
        {isPwd && !readOnly && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-stone-400">{hint}</p>}
    </div>
  );
};

const StatusIcon = ({ state }: { state: "idle"|"loading"|"ok"|"error" }) => {
  if (state === "loading") return <Loader2 size={14} className="animate-spin text-indigo-500" />;
  if (state === "ok")      return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (state === "error")   return <XCircle size={14} className="text-red-500" />;
  return null;
};

// ── Collapsible test result card ──────────────────────────────────────────────
const TestCard = ({
  icon: Icon, label, result, loading, onRun, children,
}: {
  icon: any; label: string; result: any; loading: boolean; onRun: () => void; children?: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const state: "idle"|"loading"|"ok"|"error" =
    loading ? "loading" : result === null ? "idle" : result?.success !== false ? "ok" : "error";

  return (
    <div className={`rounded-xl border transition-all
      ${state === "ok" ? "border-emerald-200 bg-emerald-50/40"
      : state === "error" ? "border-red-200 bg-red-50/40"
      : "border-stone-200 bg-stone-50"}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon state={state} />
          {state === "idle" && <Icon size={14} className="text-stone-400" />}
          <span className="text-sm font-semibold text-stone-800">{label}</span>
          {state === "ok"    && <span className="text-[10px] text-emerald-600 font-medium">Passed</span>}
          {state === "error" && <span className="text-[10px] text-red-600 font-medium">Failed</span>}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button onClick={() => setExpanded(v => !v)} className="text-stone-400 hover:text-stone-600">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={onRun} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>
      {children && <div className="px-4 pb-3 border-t border-stone-200/60 pt-3">{children}</div>}
      {expanded && result && (
        <div className="px-4 pb-4 border-t border-stone-100">
          <pre className="mt-3 bg-stone-900 text-emerald-300 rounded-lg p-3 text-[10px] leading-relaxed
            overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────

export const CareerJetConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const qc = useQueryClient();

  const { data: orgData } = useQuery({
    queryKey: ["org-subdomain", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_organizations").select("name, subdomain").eq("id", organizationId).single();
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: integration } = useQuery({
    queryKey: ["integration", organizationId, "careerjet"],
    queryFn:  () => getIntegration(organizationId, "careerjet"),
    enabled:  !!organizationId && isOpen,
  });

  const cj = useCareerJet(orgData?.subdomain);

  // Form state
  const [apiKey,    setApiKey]    = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [locale,    setLocale]    = useState("en_IN");
  const [tab, setTab] = useState<"setup"|"feed"|"test"|"analytics">("setup");

  // Test state
  const [searchKw,      setSearchKw]      = useState("");
  const [searchLoc,     setSearchLoc]     = useState("");
  const [searchResult,  setSearchResult]  = useState<any>(null);
  const [feedResult,    setFeedResult]    = useState<any>(null);
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [sitesResult,   setSitesResult]   = useState<any>(null);
  const [clicksResult,  setClicksResult]  = useState<any>(null);
  const [siteId,        setSiteId]        = useState("");

  useEffect(() => {
    if (integration) {
      setApiKey(integration.api_key ?? "");
      setApiSecret(integration.api_secret ?? "");
      setLocale(integration.config?.locale ?? "en_IN");
    }
  }, [integration]);

  const feedUrl    = orgData?.subdomain ? getXmlFeedUrl(orgData.subdomain) : "";
  const webhookUrl = orgData?.subdomain
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/careerjet-apply-webhook?org=${orgData.subdomain}`
    : "";
  const isActive  = integration?.is_active ?? false;
  const hasConfig = !!(integration?.api_key);

  const saveMutation = useMutation({
    mutationFn: () => upsertIntegration(organizationId, {
      provider: "careerjet", api_key: apiKey.trim(), api_secret: apiSecret.trim(),
      is_active: integration?.is_active ?? false, config: { locale },
    }),
    onSuccess: () => {
      toast.success("Saved"); qc.invalidateQueries({ queryKey: ["integration", organizationId, "careerjet"] });
      qc.invalidateQueries({ queryKey: ["integrations", organizationId] });
    },
    onError: () => toast.error("Save failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegrationActive(integration!.id, active),
    onSuccess: (_, active) => {
      toast.success(active ? "Activated" : "Paused");
      qc.invalidateQueries({ queryKey: ["integration", organizationId, "careerjet"] });
      qc.invalidateQueries({ queryKey: ["integrations", organizationId] });
    },
    onError: () => toast.error("Failed"),
  });

  // Test runners
  const runSearch = async () => {
    const r = await cj.searchJobs({ keywords: searchKw || "developer", location: searchLoc || "India" });
    setSearchResult(r);
  };

  const runFeedTest = async () => {
    const r = await cj.testFeed();
    setFeedResult(r);
  };

  const runWebhookTest = async () => {
    const r = await cj.testWebhook();
    setWebhookResult(r);
    if (r?.success) toast.success("Test candidate created in ATS!");
    else toast.error(r?.error ?? "Webhook test failed");
  };

  const runSites = async () => {
    const sites = await cj.getSites();
    setSitesResult({ success: sites.length >= 0, sites, count: sites.length });
    if (sites.length > 0 && !siteId) setSiteId(sites[0].id);
  };

  const runClicks = async () => {
    if (!siteId) { toast.error("Run 'Sites API' first"); return; }
    const r = await cj.getClicks({ site_id: siteId, limit: 20 });
    setClicksResult({ success: true, ...r, count: r.data.length });
  };

  const TABS = [
    { id: "setup",     label: "Setup",     icon: Key },
    { id: "feed",      label: "XML Feed",  icon: Rss },
    { id: "test",      label: "Test APIs", icon: Zap },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[620px] p-0 overflow-hidden rounded-2xl border border-stone-200"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-[#0057B8] to-[#003F87] px-6 pt-5 pb-4">
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,white 24px,white 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,white 24px,white 25px)",
          }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-[#0057B8] font-black text-sm">CJ</span>
              </div>
              <div>
                <DialogTitle className="text-white font-bold text-lg m-0 leading-tight">CareerJet Integration</DialogTitle>
                <p className="text-blue-200 text-[11px] mt-0.5">
                  {orgData?.name ?? "Your Org"} · <span className="font-mono">{orgData?.subdomain ?? "subdomain"}.xrilic.ai</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold
                ${isActive ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-300"
                : "bg-white/10 border-white/20 text-white/50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                {isActive ? "Live" : "Inactive"}
              </span>
              {hasConfig && (
                <button onClick={() => toggleMutation.mutate(!isActive)} disabled={toggleMutation.isPending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${isActive ? "bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30"
                    : "bg-emerald-500/20 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30"}`}>
                  {isActive ? "Pause" : "Activate"}
                </button>
              )}
            </div>
          </div>
          {integration && (
            <div className="relative flex items-center gap-5 mt-4 pt-3 border-t border-white/10">
              {[
                { v: integration.synced_jobs_count, l: "Jobs Synced" },
                { v: integration.last_synced_at ? moment(integration.last_synced_at).fromNow() : "—", l: "Last Sync" },
                { v: "Daily", l: "Cadence" },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p className="text-white font-bold text-base leading-none">{v}</p>
                  <p className="text-blue-200 text-[10px] mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[12px] font-semibold border-b-2 transition-all
                ${tab === id ? "border-indigo-500 text-indigo-600" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto max-h-[480px]">

          {/* ═══ SETUP ═══ */}
          {tab === "setup" && (
            <div className="px-6 py-5 space-y-4">
              <Field label="API Key" value={apiKey} onChange={setApiKey} type="password"
                placeholder="0601c013626462155127480aa2f43b88"
                hint="From your CareerJet partner dashboard at search.api.careerjet.net" />
              <Field label="API Secret" value={apiSecret} onChange={setApiSecret} type="password"
                placeholder="Secret for HMAC signature verification"
                hint="From your CareerJet account manager — used to verify incoming application POST requests." />
              <div className="space-y-1.5">
                <Label>Locale / Region</Label>
                <select value={locale} onChange={(e) => setLocale(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm bg-white
                    text-stone-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                  {[["en_IN","India"],["en_GB","United Kingdom"],["en_US","United States"],["en_SG","Singapore"],["en_AU","Australia"],["en_AE","UAE"]].map(([v,l]) => (
                    <option key={v} value={v}>{l} ({v})</option>
                  ))}
                </select>
              </div>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !apiKey.trim()}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm
                  font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save Configuration"}
              </button>
              {!hasConfig && (
                <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700">
                    After saving, go to <strong>Test APIs</strong> to verify all connections.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══ XML FEED ═══ */}
          {tab === "feed" && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  CareerJet pulls this URL daily. It auto-builds from all active jobs in your org.
                  Submit once to CareerJet partner dashboard — they handle the rest.
                </p>
              </div>
              <div>
                <Label>XML Feed URL</Label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50
                    text-[11px] font-mono text-stone-600 overflow-x-auto whitespace-nowrap">
                    {feedUrl || "Save config first to generate URL"}
                  </div>
                  {feedUrl && <CopyBtn text={feedUrl} />}
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Paste in CareerJet partner dashboard → XML Feed</p>
              </div>
              <div>
                <Label>Apply Webhook URL</Label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50
                    text-[11px] font-mono text-stone-600 overflow-x-auto whitespace-nowrap">
                    {webhookUrl || "—"}
                  </div>
                  {webhookUrl && <CopyBtn text={webhookUrl} />}
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Set as the "postUrl" in your CareerJet apply button config</p>
              </div>
              <div>
                <Label>Feed Format Preview</Label>
                <pre className="bg-stone-900 text-emerald-400 rounded-xl p-4 text-[10px] leading-relaxed overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8" ?>
<jobs>
  <job>
    <id><![CDATA[{job-uuid}]]></id>
    <title><![CDATA[Senior React Developer]]></title>
    <url><![CDATA[https://${orgData?.subdomain ?? "org"}.xrilic.ai/jobs/{id}]]></url>
    <location>
      <city><![CDATA[Bangalore]]></city>
      <country><![CDATA[India]]></country>
    </location>
    <company><![CDATA[${orgData?.name ?? "Your Company"}]]></company>
    <description><![CDATA[Job description here...]]></description>
    <contract_type><![CDATA[permanent]]></contract_type>
    <working_hours><![CDATA[full-time]]></working_hours>
    <apply_url><![CDATA[https://${orgData?.subdomain ?? "org"}.xrilic.ai/jobs/{id}]]></apply_url>
    <careerjet-apply-data>
      <![CDATA[apply_key={key}&jobTitle=Senior+React+Developer
&postUrl=${webhookUrl ? webhookUrl.replace(/&/g, "&amp;") : "..."}&phone=optional]]>
    </careerjet-apply-data>
  </job>
</jobs>`}
                </pre>
              </div>
              <a href="https://www.careerjet.co.in/jobsite/partner.html" target="_blank" rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200
                  hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group">
                <span className="text-sm text-stone-700 font-medium">Open CareerJet Partner Dashboard</span>
                <ExternalLink size={13} className="text-stone-400 group-hover:text-indigo-500" />
              </a>
            </div>
          )}

          {/* ═══ TEST APIs ═══ */}
          {tab === "test" && (
            <div className="px-6 py-5 space-y-3">
              {!hasConfig && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 flex gap-2">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  Save your API key in Setup first.
                </div>
              )}

              {/* 1 — XML Feed */}
              <TestCard icon={Rss} label="XML Feed Validation" result={feedResult}
                loading={cj.loading["test_feed"]} onRun={runFeedTest}>
                {feedResult?.success && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-stone-500">Jobs in feed:</span>
                      <strong className="text-stone-800">{feedResult.job_count}</strong>
                      <span className="text-stone-500">Valid XML:</span>
                      <strong className={feedResult.is_valid ? "text-emerald-600" : "text-red-600"}>
                        {feedResult.is_valid ? "✓ Yes" : "✗ No"}
                      </strong>
                    </div>
                    {feedResult.preview?.length > 0 && (
                      <div className="rounded-lg border border-stone-200 overflow-hidden">
                        {feedResult.preview.map((j: any, i: number) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs
                            ${i % 2 === 0 ? "bg-white" : "bg-stone-50"}`}>
                            <span className="font-medium text-stone-700 truncate flex-1">{j.title}</span>
                            <span className="text-stone-400 ml-4 flex-shrink-0">{j.location}</span>
                            <span className="ml-3 px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 text-[10px] flex-shrink-0">{j.contract}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {feedResult && !feedResult.success && (
                  <p className="pt-1 text-xs text-red-600">{feedResult.error} — {feedResult.detail}</p>
                )}
              </TestCard>

              {/* 2 — Webhook */}
              <TestCard icon={Zap} label="Apply Webhook" result={webhookResult}
                loading={cj.loading["test_webhook"]} onRun={runWebhookTest}>
                {webhookResult?.success && (
                  <div className="pt-1 space-y-1 text-xs text-stone-600">
                    <p>Job: <strong>{webhookResult.test_job?.title}</strong></p>
                    <p>Test email: <strong className="font-mono text-indigo-600">{webhookResult.test_email}</strong></p>
                    <p>HTTP: <strong>{webhookResult.http_status}</strong> · Response: <strong className="text-emerald-600">{webhookResult.response?.status}</strong></p>
                  </div>
                )}
                {webhookResult && !webhookResult.success && (
                  <p className="pt-1 text-xs text-red-600">{webhookResult.error}</p>
                )}
              </TestCard>

              {/* 3 — Search */}
              <div className={`rounded-xl border transition-all
                ${searchResult?.type === "JOBS" ? "border-emerald-200 bg-emerald-50/40"
                : searchResult ? "border-amber-200 bg-amber-50/40" : "border-stone-200 bg-stone-50"}`}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {cj.loading["search"] ? <Loader2 size={14} className="animate-spin text-indigo-500" />
                      : searchResult?.type === "JOBS" ? <CheckCircle2 size={14} className="text-emerald-500" />
                      : <Search size={14} className="text-stone-400" />}
                    <span className="text-sm font-semibold text-stone-800">Job Search API</span>
                    {searchResult?.type === "JOBS" && (
                      <span className="text-[10px] text-emerald-600 font-medium">{searchResult.hits} results</span>
                    )}
                  </div>
                  <button onClick={runSearch} disabled={cj.loading["search"]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                      bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {cj.loading["search"] ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    {cj.loading["search"] ? "Searching…" : "Search"}
                  </button>
                </div>
                <div className="px-4 pb-3 pt-1 border-t border-stone-200/60 grid grid-cols-2 gap-2">
                  {[["Keywords", searchKw, setSearchKw, "e.g. React Developer"],
                    ["Location", searchLoc, setSearchLoc, "e.g. Bangalore"]].map(([lbl, val, set, ph]: any) => (
                    <div key={lbl}>
                      <label className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{lbl}</label>
                      <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                        className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white
                          focus:outline-none focus:border-indigo-400" />
                    </div>
                  ))}
                </div>
                {searchResult?.jobs?.length > 0 && (
                  <div className="px-4 pb-4 border-t border-stone-100">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium my-2">Top Results</p>
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      {searchResult.jobs.slice(0, 5).map((job: any, i: number) => (
                        <div key={i} className={`px-3 py-2.5 flex items-start justify-between gap-3
                          ${i % 2 === 0 ? "bg-white" : "bg-stone-50"}`}>
                          <div className="flex-1 min-w-0">
                            <a href={job.url} target="_blank" rel="noreferrer"
                              className="text-xs font-medium text-indigo-600 hover:underline truncate block">{job.title}</a>
                            <p className="text-[10px] text-stone-400 mt-0.5">{job.company} · {job.locations}</p>
                          </div>
                          {job.salary && <span className="text-[10px] text-stone-500 flex-shrink-0">{job.salary}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4 — Sites */}
              <TestCard icon={Globe} label="Client Sites API" result={sitesResult}
                loading={cj.loading["sites"]} onRun={runSites}>
                {sitesResult?.sites?.length > 0 ? (
                  <div className="pt-1 space-y-1">
                    {sitesResult.sites.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs px-3 py-2
                        bg-white rounded-lg border border-stone-200">
                        <span className="font-medium text-stone-700">{s.handle}</span>
                        <span className="font-mono text-stone-400 text-[10px]">{s.id}</span>
                      </div>
                    ))}
                  </div>
                ) : sitesResult && (
                  <p className="pt-1 text-xs text-amber-600">
                    No sites yet. Submit your XML feed URL to CareerJet first.
                  </p>
                )}
              </TestCard>

              {/* 5 — Clicks */}
              <TestCard icon={BarChart2} label="Click Analytics API" result={clicksResult}
                loading={cj.loading["clicks"]} onRun={runClicks}>
                {!siteId && <p className="pt-1 text-xs text-stone-400">Run "Client Sites API" first to auto-fill site ID.</p>}
                {siteId && (
                  <div className="pt-1">
                    <label className="text-[10px] text-stone-400 font-medium uppercase">Site ID</label>
                    <input value={siteId} onChange={(e) => setSiteId(e.target.value)}
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-mono bg-white
                        focus:outline-none focus:border-indigo-400" />
                  </div>
                )}
                {clicksResult?.data?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] text-stone-400 mb-1.5">{clicksResult.count} recent clicks</p>
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      {clicksResult.data.slice(0, 5).map((c: any, i: number) => (
                        <div key={c.id} className={`px-3 py-2 flex items-center justify-between text-xs
                          ${i % 2 === 0 ? "bg-white" : "bg-stone-50"}`}>
                          <span className="text-stone-600 truncate flex-1 mr-2">{c.url?.split("/").slice(-2).join("/")}</span>
                          <span className="text-stone-400 flex-shrink-0 mr-3">{moment(c.click_datetime).fromNow()}</span>
                          <span className="font-semibold text-stone-700 flex-shrink-0">{c.currency} {c.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TestCard>
            </div>
          )}

          {/* ═══ ANALYTICS ═══ */}
          {tab === "analytics" && (
            <div className="px-6 py-5 space-y-4">
              {!integration ? (
                <div className="text-center py-10 text-stone-400 text-sm">Save configuration first.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: "Jobs Live",  v: integration.synced_jobs_count, icon: Globe,         c: "indigo" },
                      { l: "Last Sync",  v: integration.last_synced_at ? moment(integration.last_synced_at).fromNow() : "—", icon: Clock, c: "amber" },
                      { l: "Status",     v: isActive ? "Live" : "Paused", icon: isActive ? Wifi : AlertCircle, c: isActive ? "emerald" : "stone" },
                    ].map(({ l, v, icon: Icon, c }) => (
                      <div key={l} className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                        <div className={`w-8 h-8 rounded-lg bg-${c}-100 flex items-center justify-center mb-2`}>
                          <Icon size={15} className={`text-${c}-600`} />
                        </div>
                        <p className="text-lg font-bold text-stone-800 leading-none">{v}</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-1">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-[11px] font-semibold text-indigo-800">📊 Click-level analytics</p>
                    <p className="text-[11px] text-indigo-600 mt-1 leading-relaxed">
                      Run <strong>Sites API</strong> then <strong>Click Analytics API</strong> in the Test tab to pull CPC cost data from CareerJet directly.
                    </p>
                    <button onClick={() => setTab("test")}
                      className="mt-2 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:underline">
                      Go to Test APIs <ChevronRight size={11} />
                    </button>
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200">
                    <Label>Integration Timeline</Label>
                    {[
                      ["Created",      moment(integration.created_at).format("DD MMM YYYY")],
                      ["Last Updated", moment(integration.updated_at).format("DD MMM YYYY, HH:mm")],
                      ["Last Synced",  integration.last_synced_at ? moment(integration.last_synced_at).format("DD MMM YYYY, HH:mm") : "Never"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs py-1.5 border-b border-stone-100 last:border-0">
                        <span className="text-stone-500">{k}</span>
                        <span className="text-stone-700 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <p className="text-[10px] text-stone-400 font-mono">
            Key: {apiKey ? `${apiKey.slice(0, 8)}••••` : "Not set"}
          </p>
          <button onClick={onClose} className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors font-medium">
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CareerJetConfigModal;