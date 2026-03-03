// src/pages/integrations/JobBoardIntegrations.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Job Board Integrations Hub
//
// Displays a card grid of all available job board integrations.
// Each card shows logo, status, and opens the provider-specific config modal.
// Route: /integrations/job-boards
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plug, ArrowLeft, ExternalLink, Settings, CheckCircle2,
  Clock, AlertCircle, Zap, Globe, Users, Search,
  ChevronRight, Sparkles, Lock
} from "lucide-react";
import moment from "moment";
import { getIntegrationsByOrg } from "@/services/integrationService";
import CareerJetConfigModal from "./careerjet/CareerJetConfigModal";

// ── Types ────────────────────────────────────────────────────────────────────
type ProviderStatus = "available" | "coming_soon" | "beta";

interface JobBoardConfig {
  id: string;
  name: string;
  tagline: string;
  logo: React.ReactNode;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  status: ProviderStatus;
  reach: string;
  category: string;
  features: string[];
  docsUrl?: string;
}

// ── Job board registry ────────────────────────────────────────────────────────
const JOB_BOARDS: JobBoardConfig[] = [
  {
    id: "careerjet",
    name: "CareerJet",
    tagline: "Global job search engine — 90+ countries",
    logo: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#0057B8] font-black text-2xl tracking-tighter leading-none">
          CJ
        </div>
      </div>
    ),
    bgColor: "bg-[#EEF4FF]",
    borderColor: "border-[#C7D9FF]",
    accentColor: "#0057B8",
    textColor: "text-[#003F87]",
    status: "available",
    reach: "90+ countries",
    category: "Global",
    features: ["XML Feed sync", "Apply via CareerJet", "Sponsored listings"],
    docsUrl: "https://www.careerjet.co.in/jobsite/partner.html",
  },
  {
    id: "indeed",
    name: "Indeed",
    tagline: "World's #1 job site — 350M+ monthly visitors",
    logo: (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-black text-xl" style={{ color: "#2164F3" }}>
          in<span style={{ color: "#FF0000" }}>deed</span>
        </span>
      </div>
    ),
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    accentColor: "#2164F3",
    textColor: "text-blue-700",
    status: "coming_soon",
    reach: "350M+ visitors/month",
    category: "Global",
    features: ["Sponsored jobs", "Resume database", "Instant match"],
    docsUrl: "https://www.indeed.com/employer",
  },
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    tagline: "Professional network — 1B+ members worldwide",
    logo: (
      <div className="w-full h-full flex items-center justify-center bg-[#0A66C2] rounded-lg">
        <span className="text-white font-black text-lg">in</span>
      </div>
    ),
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    accentColor: "#0A66C2",
    textColor: "text-sky-700",
    status: "coming_soon",
    reach: "1B+ members",
    category: "Professional",
    features: ["LinkedIn Easy Apply", "Recruiter InMail", "Skills matching"],
    docsUrl: "https://business.linkedin.com/talent-solutions",
  },
  {
    id: "naukri",
    name: "Naukri",
    tagline: "India's #1 job portal — 85M+ registered users",
    logo: (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-black text-xl text-[#4A90D9]">N</span>
        <span className="font-black text-lg" style={{ color: "#F7A700" }}>.</span>
      </div>
    ),
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    accentColor: "#4A90D9",
    textColor: "text-yellow-700",
    status: "coming_soon",
    reach: "85M+ users in India",
    category: "India",
    features: ["Resume search", "Priority listing", "Email alerts"],
    docsUrl: "https://www.naukri.com/recruiter",
  },
  {
    id: "shine",
    name: "Shine",
    tagline: "India's fastest growing job portal",
    logo: (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-black text-xl" style={{ color: "#F05A28" }}>✦</span>
      </div>
    ),
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    accentColor: "#F05A28",
    textColor: "text-orange-700",
    status: "coming_soon",
    reach: "30M+ users",
    category: "India",
    features: ["Job postings", "Candidate database", "Alerts"],
    docsUrl: "https://www.shine.com",
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    tagline: "Jobs + company reviews — trusted by candidates",
    logo: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-white font-black text-xs">G</span>
        </div>
      </div>
    ),
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    accentColor: "#0CAA41",
    textColor: "text-emerald-700",
    status: "coming_soon",
    reach: "67M+ monthly users",
    category: "Global",
    features: ["Company reviews", "Salary data", "Employer branding"],
    docsUrl: "https://www.glassdoor.com/employers",
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusPill = ({
  status,
  isConnected,
  isActive,
}: {
  status: ProviderStatus;
  isConnected: boolean;
  isActive: boolean;
}) => {
  if (status === "coming_soon") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-600">
        <Clock size={9} /> Coming Soon
      </span>
    );
  }
  if (isConnected && isActive) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    );
  }
  if (isConnected && !isActive) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-600">
        <AlertCircle size={9} /> Paused
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-600">
      <Plug size={9} /> Connect
    </span>
  );
};

// ── Card component ────────────────────────────────────────────────────────────
const JobBoardCard = ({
  board,
  integration,
  onConfigure,
}: {
  board: JobBoardConfig;
  integration: any;
  onConfigure: () => void;
}) => {
  const isConnected = !!integration;
  const isActive    = integration?.is_active ?? false;
  const isAvailable = board.status === "available";

  return (
    <div
      className={`relative group rounded-2xl border bg-white transition-all duration-300
        ${isAvailable
          ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          : "opacity-70 cursor-default"
        }
        ${isConnected && isActive ? "border-emerald-200 shadow-sm shadow-emerald-100" : "border-stone-200"}
      `}
      onClick={isAvailable ? onConfigure : undefined}
      style={{
        boxShadow: isConnected && isActive
          ? "0 0 0 1px #d1fae5, 0 4px 20px rgba(16,185,129,0.06)"
          : undefined,
      }}
    >
      {/* Connected accent bar */}
      {isConnected && isActive && (
        <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-emerald-400" />
      )}

      {/* Coming soon overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/80 backdrop-blur-sm">
            <Lock size={11} className="text-stone-300" />
            <span className="text-stone-300 text-[11px] font-600">Coming Soon</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl ${board.bgColor} border ${board.borderColor} overflow-hidden flex-shrink-0`}
          >
            {board.logo}
          </div>
          <StatusPill status={board.status} isConnected={isConnected} isActive={isActive} />
        </div>

        {/* Name + tagline */}
        <h3 className="font-700 text-stone-800 text-base mb-1 leading-tight">{board.name}</h3>
        <p className="text-[11px] text-stone-500 leading-relaxed mb-4">{board.tagline}</p>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <Globe size={10} />
            {board.reach}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <Zap size={10} />
            {board.category}
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {board.features.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[10px] font-500"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Integration stats if connected */}
        {integration && (
          <div className="flex items-center gap-3 py-3 border-t border-stone-100 mb-3">
            <div className="flex-1 text-center">
              <p className="text-sm font-700 text-stone-800">{integration.synced_jobs_count}</p>
              <p className="text-[9px] text-stone-400 uppercase tracking-wider">Synced</p>
            </div>
            <div className="w-px h-6 bg-stone-200" />
            <div className="flex-1 text-center">
              <p className="text-sm font-700 text-stone-800">
                {integration.last_synced_at ? moment(integration.last_synced_at).fromNow() : "—"}
              </p>
              <p className="text-[9px] text-stone-400 uppercase tracking-wider">Last Sync</p>
            </div>
          </div>
        )}

        {/* CTA */}
        {isAvailable && (
          <div
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-sm font-600
              ${isConnected
                ? "bg-stone-100 text-stone-600 group-hover:bg-stone-200"
                : "text-white group-hover:opacity-90"
              }`}
            style={
              !isConnected
                ? { backgroundColor: board.accentColor }
                : undefined
            }
          >
            <span>{isConnected ? "Manage Integration" : "Connect Now"}</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Stats bar ─────────────────────────────────────────────────────────────────
const StatsBar = ({ integrations }: { integrations: any[] }) => {
  const active    = integrations.filter((i) => i.is_active).length;
  const connected = integrations.length;
  const totalJobs = integrations.reduce((s, i) => s + (i.synced_jobs_count || 0), 0);

  return (
    <div className="flex items-center gap-6">
      {[
        { label: "Connected", value: connected, color: "text-indigo-600" },
        { label: "Live",      value: active,    color: "text-emerald-600" },
        { label: "Jobs Synced", value: totalJobs, color: "text-stone-700" },
      ].map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <p className={`text-xl font-800 ${color} leading-none`}>{value}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const JobBoardIntegrations: React.FC = () => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const [openModal, setOpenModal] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations", organizationId],
    queryFn: () => getIntegrationsByOrg(organizationId),
    enabled: !!organizationId,
  });

  const integrationMap = Object.fromEntries(
    integrations.map((i: any) => [i.provider, i])
  );

  return (
    <div
      className="min-h-screen bg-stone-50/60"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Sticky Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-500 text-stone-400 py-2 border-b border-stone-100">
            <Link
              to="/jobs"
              className="hover:text-stone-700 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={11} /> Jobs
            </Link>
            <span className="text-stone-300">›</span>
            <span className="text-stone-700">Job Board Integrations</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Plug size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-800 text-stone-900 leading-tight">
                  Job Board Integrations
                </h1>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Distribute jobs to external platforms · Sync candidates back to ATS
                </p>
              </div>
            </div>
            {integrations.length > 0 && (
              <StatsBar integrations={integrations} />
            )}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* Intro banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 mb-8">
          {/* Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10"
            style={{
              background: "radial-gradient(circle, white 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-300" />
              <span className="text-indigo-200 text-[11px] font-600 uppercase tracking-wider">
                One-click distribution
              </span>
            </div>
            <h2 className="text-white font-800 text-xl mb-1">
              Reach millions of candidates
            </h2>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Connect your ATS to top job boards. Jobs sync automatically — candidates
              apply and land straight in your pipeline. No manual posting ever again.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {["XML Feed", "Auto-sync", "Candidate import", "ATS-native"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-500 border border-white/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-8">
          <p className="text-[11px] font-700 uppercase tracking-wider text-stone-400 mb-4">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: "01", label: "Connect",       desc: "Enter your job board API key" },
              { n: "02", label: "Feed auto-builds", desc: "XML feed generates from your jobs" },
              { n: "03", label: "Board syncs",   desc: "Job board pulls feed daily" },
              { n: "04", label: "Candidates flow", desc: "Applicants arrive in your ATS" },
            ].map(({ n, label, desc }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="text-[11px] font-900 text-indigo-300 font-mono mt-0.5">{n}</span>
                <div>
                  <p className="text-sm font-700 text-stone-800">{label}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Available */}
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <h2 className="text-sm font-700 text-stone-800">Available Now</h2>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-600">
            {JOB_BOARDS.filter(b => b.status === "available").length} platforms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {JOB_BOARDS.filter((b) => b.status === "available").map((board) => (
            <JobBoardCard
              key={board.id}
              board={board}
              integration={integrationMap[board.id] ?? null}
              onConfigure={() => setOpenModal(board.id)}
            />
          ))}
        </div>

        {/* Section: Coming soon */}
        <div className="mb-4 flex items-center gap-2">
          <Clock size={14} className="text-stone-400" />
          <h2 className="text-sm font-700 text-stone-500">Coming Soon</h2>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-600">
            {JOB_BOARDS.filter(b => b.status === "coming_soon").length} platforms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {JOB_BOARDS.filter((b) => b.status !== "available").map((board) => (
            <JobBoardCard
              key={board.id}
              board={board}
              integration={integrationMap[board.id] ?? null}
              onConfigure={() => {}}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 flex items-center gap-3 p-4 rounded-xl bg-stone-100 border border-stone-200">
          <Search size={14} className="text-stone-400 flex-shrink-0" />
          <p className="text-[11px] text-stone-500">
            Missing a job board?{" "}
            <a href="mailto:support@xrilic.ai" className="text-indigo-600 hover:underline">
              Request an integration
            </a>{" "}
            and we'll prioritise it for your account.
          </p>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <CareerJetConfigModal
        isOpen={openModal === "careerjet"}
        onClose={() => setOpenModal(null)}
      />
    </div>
  );
};

export default JobBoardIntegrations;