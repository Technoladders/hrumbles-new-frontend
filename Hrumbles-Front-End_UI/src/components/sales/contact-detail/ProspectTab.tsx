// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ProspectTab.tsx

import React, { useState } from "react";
import { Briefcase, MapPin, Building2, Globe, User, Clock } from "lucide-react";
import { extractFromRaw, hasData } from "@/utils/dataExtractor";
import { cn } from "@/lib/utils";
import { SimilarProfessionalsTab as SimilarProspectsTable } from './SimilarProfessionalsTab';


/* ================================
   MAIN COMPONENT
================================ */
export const ProspectTab: React.FC<{ contact: any }> = ({ contact }) => {
  const data = extractFromRaw(contact);

    const [isIdentityOpen, setIsIdentityOpen] = useState(true);
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);

  const hasEmployment =
    Array.isArray(data.employmentHistory) &&
    data.employmentHistory.length > 0;

  const hasProfessionalMeta =
    hasData(data.departments) ||
    hasData(data.subdepartments) ||
    hasData(data.functions);

  return (
    <div className="space-y-6">
      {/* ============================
          CARD 1: PROSPECT OVERVIEW
      ============================ */}
      <SectionCard title="Prospect Overview">
        {/* Header */}
        <div className="flex items-start gap-4">
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              className="h-14 w-14 rounded-full border object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-400" />
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              {data.name}
            </h2>

            {data.headline && (
              <p className="text-sm text-slate-600 mt-0.5">
                {data.headline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              {data.organizationName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {data.organizationName}
                </span>
              )}

              {(data.city || data.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[data.city, data.country].filter(Boolean).join(", ")}
                </span>
              )}

              {data.timezone && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {data.timezone.replace("_", " ")}
                </span>
              )}

              {data.seniority && (
                <span className="flex items-center gap-1 capitalize">
                  <Briefcase className="h-3.5 w-3.5" />
                  {data.seniority}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Professional Meta */}
        {hasProfessionalMeta && (
          <MetaSection>
            {hasData(data.departments) && (
              <MetaItem label="Departments" values={data.departments} />
            )}

            {hasData(data.subdepartments) && (
              <MetaItem
                label="Sub-Departments"
                values={data.subdepartments}
              />
            )}

            {hasData(data.functions) && (
              <MetaItem label="Functions" values={data.functions} />
            )}
          </MetaSection>
        )}

        {/* Career Timeline */}
        {hasEmployment && (
          <div className="mt-6">
            <SectionLabel>Career Timeline</SectionLabel>

            <div className="relative mt-4 pl-5 border-l border-slate-200">
              {data.employmentHistory.map((job: any, idx: number) => (
                <TimelineItem
                  key={job.id || idx}
                  job={job}
                  isLast={idx === data.employmentHistory.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {hasData(data.languages) && (
          <div className="mt-6">
            <SectionLabel>Languages</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.languages.map((lang: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ============================
          CARD 2: SIMILAR PROSPECTS
      ============================ */}
      <SectionCard title="Similar Prospects">
        <SimilarProspectsTable contact={contact} />
      </SectionCard>
    </div>
  );
};

/* ================================
   SUPPORTING COMPONENTS
================================ */

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-white p-5">
    <h3 className="text-sm font-semibold text-slate-900 mb-4">
      {title}
    </h3>
    {children}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    {children}
  </p>
);

const MetaSection = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-5 grid gap-3 sm:grid-cols-2">
    {children}
  </div>
);

const MetaItem = ({
  label,
  values,
}: {
  label: string;
  values: string[];
}) => (
  <div>
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <div className="flex flex-wrap gap-1.5 mt-1">
      {values.map((val, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700"
        >
          {val.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  </div>
);

const TimelineItem = ({
  job,
  isLast,
}: {
  job: any;
  isLast: boolean;
}) => {
  const isCurrent = job.current || job.is_current;

  return (
    <div className="relative pb-6">
      {!isLast && (
        <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />
      )}

      <div className="flex gap-3">
        <span
          className={cn(
            "mt-1 h-3 w-3 rounded-full",
            isCurrent ? "bg-green-600" : "bg-slate-400"
          )}
        />

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800">
              {job.title}
            </p>
            {isCurrent && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700">
                Current
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600">
            {job.organization_name}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {formatDate(job.start_date)} –{" "}
            {job.end_date ? formatDate(job.end_date) : "Present"}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ================================
   HELPERS
================================ */
const formatDate = (date?: string) => {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};
