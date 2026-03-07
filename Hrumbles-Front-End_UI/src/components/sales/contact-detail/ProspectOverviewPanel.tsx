// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ProspectOverviewPanel.tsx
import React, { useState } from "react";
import {
  User,
  MapPin,
  Clock,
  Briefcase,
  Globe,
  Linkedin,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Eye,
  Users,
  Loader2,
  Tag,
  Calendar,
  TrendingUp,
  Award,
  Languages,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractFromRaw, hasData, formatDate } from "@/utils/dataExtractor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Props {
  contact: any;
}

export const ProspectOverviewPanel: React.FC<Props> = ({ contact }) => {
  const data = extractFromRaw(contact);
  const navigate = useNavigate();
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Fetch similar contacts from same company
  const titleKeywords = contact.job_title?.split(" ")?.[0] || "";
  const { data: peers = [], isLoading: peersLoading } = useQuery({
    queryKey: ["similar-people", contact.organization_id, contact.job_title],
    queryFn: async () => {
      if (!contact.organization_id) return [];
      const { data } = await supabase
        .from("contacts")
        .select(
          "id, name, job_title, photo_url, contact_stage, city, enrichment_people(photo_url, seniority)",
        )
        .eq("organization_id", contact.organization_id)
        .neq("id", contact.id)
        .ilike("job_title", `%${titleKeywords}%`)
        .limit(6);
      return data || [];
    },
    enabled: !!contact.organization_id && !!titleKeywords,
  });

  const enrichmentPerson = contact.enrichment_people?.[0];
  const hasEnrichment =
    !!data.rawPerson && Object.keys(data.rawPerson).length > 0;

  const employmentHistory =
    data.employmentHistory ||
    enrichmentPerson?.enrichment_employment_history ||
    [];
  const visibleHistory = showAllHistory
    ? employmentHistory
    : employmentHistory.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* ── Hero Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Coloured top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-16 w-16 border-2 border-white shadow-md flex-shrink-0">
              <AvatarImage
                src={contact.photo_url || data.photoUrl || undefined}
              />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
                {contact.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Core identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {contact.name}
                  </h1>
                  {(data.headline || contact.job_title) && (
                    <p className="text-sm text-gray-600 mt-0.5 leading-snug">
                      {data.headline || contact.job_title}
                    </p>
                  )}
                </div>
                {/* Apollo badge */}
                {contact.apollo_person_id && (
                  <span className="flex-shrink-0 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">
                    ✓ Verified
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                {(data.city || contact.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-gray-400" />
                    {[
                      data.city || contact.city,
                      data.state || contact.state,
                      data.country || contact.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {(data.timezone || contact.timezone) && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-gray-400" />
                    {(data.timezone || contact.timezone)?.replace("_", " ")}
                  </span>
                )}
                {data.seniority && (
                  <span className="flex items-center gap-1 capitalize">
                    <Award size={11} className="text-gray-400" />
                    {data.seniority}
                  </span>
                )}
                {contact.medium && (
                  <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    via {contact.medium}
                  </span>
                )}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-2 mt-2.5">
                {(data.linkedinUrl || contact.linkedin_url) && (
                  <a
                    href={data.linkedinUrl || contact.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#0A66C2] bg-[#0A66C2]/5 border border-[#0A66C2]/20 px-2 py-1 rounded-md hover:bg-[#0A66C2]/10 transition-colors"
                  >
                    <Linkedin size={11} />
                    LinkedIn
                    <ExternalLink size={9} className="opacity-60" />
                  </a>
                )}
                {data.twitterUrl && (
                  <a
                    href={data.twitterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Globe size={11} />X / Twitter
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Professional tags */}
          {(hasData(data.departments) ||
            hasData(data.functions) ||
            hasData(data.subdepartments)) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...data.departments,
                  ...data.functions,
                  ...data.subdepartments,
                ]
                  .filter((v, i, a) => a.indexOf(v) === i) // unique
                  .map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize"
                    >
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

{/* ── Contact Info Card ────────────────────────────────────────── */}
      {(!!contact.email ||
        !!contact.mobile ||
        data.allEmails?.length > 0 ||
        data.phoneNumbers?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Contact Info
          </h3>
          <div className="space-y-2">
            {/* Primary email */}
            {contact.email && (
              <ContactRow
                icon={<Mail size={13} className="text-green-500" />}
                label="Primary Email"
                value={contact.email}
                verified
              />
            )}
            {/* Enriched emails (exclude duplicates) */}
            {data.allEmails
              ?.filter((e: any) => e.email !== contact.email)
              .map((e: any, i: number) => (
                <ContactRow
                  key={i}
                  icon={<Mail size={13} className="text-gray-400" />}
                  label={`${e.status || "Enriched"} email`}
                  value={e.email}
                  verified={["verified", "valid"].includes(
                    e.status?.toLowerCase(),
                  )}
                />
              ))}
            {/* Primary phone */}
            {contact.mobile && (
              <ContactRow
                icon={<Phone size={13} className="text-gray-500" />}
                label="Mobile"
                value={contact.mobile}
              />
            )}
            {/* Enriched phones */}
            {data.phoneNumbers?.map((p: any, i: number) => (
              <ContactRow
                key={i}
                icon={<Phone size={13} className="text-gray-400" />}
                label={p.type || "Phone"}
                value={p.phone_number || p.raw_number}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Employment History ────────────────────────────────────────── */}
      {employmentHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Career Timeline
          </h3>
          <div className="relative pl-4 border-l-2 border-gray-100 space-y-4">
            {visibleHistory.map((job: any, idx: number) => (
              <CareerEntry key={job.id || idx} job={job} isFirst={idx === 0} />
            ))}
          </div>
          {employmentHistory.length > 3 && (
            <button
              onClick={() => setShowAllHistory((v) => !v)}
              className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1"
            >
              {showAllHistory ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              {showAllHistory
                ? "Show less"
                : `Show ${employmentHistory.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* ── Professional Metadata ─────────────────────────────────────── */}
      {data.rawPerson && <MetadataCard rawPerson={data.rawPerson} />}

      {/* ── Similar Prospects ─────────────────────────────────────────── */}
      {(peers.length > 0 || peersLoading) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Similar Prospects
            </h3>
            {!peersLoading && (
              <span className="text-[10px] text-gray-400">
                {peers.length} found
              </span>
            )}
          </div>

          {peersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {peers.map((peer: any) => (
                <div
                  key={peer.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage
                      src={
                        peer.photo_url || peer.enrichment_people?.[0]?.photo_url
                      }
                    />
                    <AvatarFallback className="bg-gray-100 text-gray-500 text-[10px]">
                      {peer.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {peer.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {peer.job_title}
                    </p>
                  </div>
                  {peer.contact_stage && (
                    <StagePill stage={peer.contact_stage} />
                  )}
                  <button
                    onClick={() => navigate(`/contacts/${peer.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
                  >
                    <Eye size={13} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

const ContactRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  verified?: boolean;
}> = ({ icon, label, value, verified }) => (
  <div className="flex items-center gap-2.5">
    <div className="flex-shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-gray-400 leading-none mb-0.5">{label}</p>
      <p className="text-xs font-medium text-gray-700 truncate">{value}</p>
    </div>
    {verified && (
      <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
    )}
  </div>
);

const CareerEntry: React.FC<{ job: any; isFirst: boolean }> = ({
  job,
  isFirst,
}) => {
  const isCurrent = job.current || job.is_current;
  const startYear = job.start_date
    ? new Date(job.start_date).getFullYear()
    : null;
  const endYear = job.end_date ? new Date(job.end_date).getFullYear() : null;

  return (
    <div className="relative">
      <div
        className={cn(
          "absolute -left-[17px] mt-1 w-3 h-3 rounded-full border-2 border-white",
          isCurrent ? "bg-green-500" : "bg-gray-300",
        )}
      />
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">{job.title}</p>
            <p className="text-xs text-gray-500">{job.organization_name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            {isCurrent && (
              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium block mb-0.5">
                Current
              </span>
            )}
            <p className="text-[10px] text-gray-400">
              {startYear}
              {startYear && (endYear || isCurrent) ? " – " : ""}
              {isCurrent ? "Present" : endYear}
            </p>
          </div>
        </div>
        {job.description && (
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
            {job.description}
          </p>
        )}
      </div>
    </div>
  );
};

// Pull out useful metadata from raw person
const MetadataCard: React.FC<{ rawPerson: any }> = ({ rawPerson }) => {
  const fields = [
    rawPerson.languages?.length > 0 && {
      label: "Languages",
      value: rawPerson.languages.join(", "),
      icon: Languages,
    },
    rawPerson.departments?.length > 0 && {
      label: "Departments",
      value: rawPerson.departments
        .map((d: string) => d.replace(/_/g, " "))
        .join(", "),
      icon: Briefcase,
    },
    rawPerson.seniority && {
      label: "Seniority Level",
      value: rawPerson.seniority,
      icon: TrendingUp,
    },
    rawPerson.intent_strength && {
      label: "Intent Strength",
      value: rawPerson.intent_strength,
      icon: Tag,
    },
    rawPerson.time_zone && {
      label: "Timezone",
      value: rawPerson.time_zone.replace(/_/g, " "),
      icon: Clock,
    },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: any }>;

  if (fields.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Profile Details
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-start gap-2">
            <div className="p-1.5 bg-gray-50 rounded flex-shrink-0 mt-0.5">
              <Icon size={11} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className="text-xs font-medium text-gray-700 capitalize truncate">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StagePill: React.FC<{ stage: string }> = ({ stage }) => {
  const cls: Record<string, string> = {
    Lead: "bg-blue-50 text-blue-600",
    Prospect: "bg-purple-50 text-purple-600",
    Customer: "bg-green-50 text-green-600",
    Contacted: "bg-orange-50 text-orange-600",
    Identified: "bg-gray-100 text-gray-500",
    Cold: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
        cls[stage] || "bg-gray-100 text-gray-500",
      )}
    >
      {stage}
    </span>
  );
};

export default ProspectOverviewPanel;
// 2
