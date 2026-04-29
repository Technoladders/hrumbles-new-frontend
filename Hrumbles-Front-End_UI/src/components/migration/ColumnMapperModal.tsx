// src/components/migration/ColumnMapperModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal for reviewing and overriding auto-detected column mappings.
// Shows: Naukri header | Detected mapping | Sample values | Override dropdown
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, SkipForward, Search } from "lucide-react";
import { ColumnMapping } from "@/hooks/useMigrationEngine";
import { NaukriRow } from "@/utils/naukriColumnMapper";

// All target fields with friendly labels
const TARGET_FIELD_OPTIONS: Array<{ value: keyof NaukriRow | "skip"; label: string; group: string }> = [
  // Identity
  { value: "candidate_name",       label: "Name",                  group: "Identity" },
  { value: "email",                label: "Email",                  group: "Identity" },
  { value: "phone",                label: "Phone",                  group: "Identity" },
  // Location
  { value: "current_location",     label: "Current Location",       group: "Location" },
  { value: "preferred_locations",  label: "Preferred Locations",    group: "Location" },
  // Experience
  { value: "total_experience",     label: "Total Experience",       group: "Experience" },
  { value: "current_company",      label: "Current Company",        group: "Experience" },
  { value: "current_designation",  label: "Designation",            group: "Experience" },
  { value: "current_salary",       label: "Current Salary",         group: "Experience" },
  { value: "notice_period",        label: "Notice Period",          group: "Experience" },
  // Content
  { value: "resume_headline",      label: "Resume Headline",        group: "Content" },
  { value: "professional_summary", label: "Summary",                group: "Content" },
  { value: "key_skills",           label: "Key Skills",             group: "Content" },
  // Education
  { value: "ug_degree",            label: "UG Degree",              group: "Education" },
  { value: "ug_specialization",    label: "UG Specialization",      group: "Education" },
  { value: "ug_university",        label: "UG University",          group: "Education" },
  { value: "ug_year",              label: "UG Year",                group: "Education" },
  { value: "pg_degree",            label: "PG Degree",              group: "Education" },
  { value: "pg_specialization",    label: "PG Specialization",      group: "Education" },
  { value: "pg_university",        label: "PG University",          group: "Education" },
  { value: "pg_year",              label: "PG Year",                group: "Education" },
  { value: "doctorate_degree",     label: "Doctorate Degree",       group: "Education" },
  // Role
  { value: "suggested_title",      label: "Job Title",              group: "Role" },
  { value: "department",           label: "Department / Func. Area", group: "Role" },
  { value: "functional_role",      label: "Role",                   group: "Role" },
  { value: "industry",             label: "Industry",               group: "Role" },
  // Metadata
  { value: "applied_at",           label: "Date of Application",    group: "Metadata" },
  { value: "source_platform",      label: "Source Platform",        group: "Metadata" },
  { value: "pipeline_stage",       label: "Pipeline Stage",         group: "Metadata" },
  { value: "star_rating",          label: "Star Rating",            group: "Metadata" },
  // Personal
  { value: "gender",               label: "Gender",                 group: "Personal" },
  { value: "marital_status",       label: "Marital Status",         group: "Personal" },
  { value: "home_town",            label: "Home Town",              group: "Personal" },
  { value: "pin_code",             label: "Pin Code",               group: "Personal" },
  { value: "date_of_birth",        label: "Date of Birth",          group: "Personal" },
  { value: "permanent_address",    label: "Permanent Address",      group: "Personal" },
  { value: "work_permit_usa",      label: "Work Permit (USA)",      group: "Personal" },
  // Skip
  { value: "skip",                 label: "⊘ Skip this column",     group: "Action" },
];

const GROUP_ORDER = ["Identity", "Location", "Experience", "Content", "Education", "Role", "Metadata", "Personal", "Action"];

interface Props {
  open: boolean;
  onClose: () => void;
  mappings: ColumnMapping[];
  onUpdate: (naukriHeader: string, targetField: keyof NaukriRow | "skip" | null) => void;
}

export default function ColumnMapperModal({ open, onClose, mappings, onUpdate }: Props) {
  const [search, setSearch] = useState("");

  const visible = mappings.filter((m) =>
    !search ||
    m.naukriHeader.toLowerCase().includes(search.toLowerCase()) ||
    (m.targetField ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const autoCount   = mappings.filter((m) => m.autoMapped && m.targetField && m.targetField !== "skip").length;
  const manualCount = mappings.filter((m) => !m.autoMapped).length;
  const unmapped    = mappings.filter((m) => !m.targetField).length;

  function getLabelForField(field: keyof NaukriRow | "skip" | null): string {
    if (!field) return "— unmapped —";
    if (field === "skip") return "⊘ Skip";
    return TARGET_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            Column Mapping
            <Badge variant="outline" className="text-xs font-normal">
              {mappings.length} columns
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review how Excel columns map to talent pool fields. Override any mapping by selecting a different target.
          </DialogDescription>

          {/* Summary badges */}
          <div className="flex gap-2 pt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {autoCount} auto-mapped
            </span>
            {manualCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
                {manualCount} manually overridden
              </span>
            )}
            {unmapped > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
                <AlertCircle className="h-3 w-3" />
                {unmapped} unmapped (will be stored in other_details)
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search columns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600 w-56">Excel Column</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600 w-56">Maps To</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Sample Values</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600 w-10">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((mapping) => (
                <tr
                  key={mapping.naukriHeader}
                  className={`hover:bg-slate-50 ${!mapping.targetField ? "bg-amber-50/30" : ""}`}
                >
                  {/* Excel column name */}
                  <td className="px-4 py-2">
                    <span className="font-mono text-slate-700 bg-slate-100 rounded px-1.5 py-0.5">
                      {mapping.naukriHeader}
                    </span>
                  </td>

                  {/* Mapping selector */}
                  <td className="px-4 py-2">
                    <Select
                      value={mapping.targetField ?? "__unmapped__"}
                      onValueChange={(v) => {
                        const val = v === "__unmapped__" ? null : v as keyof NaukriRow | "skip";
                        onUpdate(mapping.naukriHeader, val);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-52">
                        <SelectValue>
                          {mapping.targetField === "skip" ? (
                            <span className="text-slate-400 flex items-center gap-1">
                              <SkipForward className="h-3 w-3" /> Skip
                            </span>
                          ) : mapping.targetField ? (
                            <span className={mapping.autoMapped ? "text-emerald-700" : "text-blue-700"}>
                              {getLabelForField(mapping.targetField)}
                            </span>
                          ) : (
                            <span className="text-amber-600">— unmapped —</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unmapped__">
                          <span className="text-slate-400">— unmapped —</span>
                        </SelectItem>
                        {GROUP_ORDER.map((group) => {
                          const opts = TARGET_FIELD_OPTIONS.filter((o) => o.group === group);
                          if (!opts.length) return null;
                          return (
                            <div key={group}>
                              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                {group}
                              </div>
                              {opts.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </div>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Sample values */}
                  <td className="px-4 py-2 max-w-[220px]">
                    <div className="flex flex-col gap-0.5">
                      {mapping.sampleValues.slice(0, 2).map((v, i) => (
                        <span key={i} className="text-slate-500 truncate" title={v}>
                          {v}
                        </span>
                      ))}
                      {mapping.sampleValues.length === 0 && (
                        <span className="text-slate-300 italic">no data</span>
                      )}
                    </div>
                  </td>

                  {/* Status icon */}
                  <td className="px-4 py-2">
                    {mapping.targetField === "skip" ? (
                      <SkipForward className="h-3.5 w-3.5 text-slate-400" />
                    ) : mapping.targetField ? (
                      <CheckCircle2 className={`h-3.5 w-3.5 ${mapping.autoMapped ? "text-emerald-500" : "text-blue-500"}`} />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Unmapped columns are automatically stored in <code className="bg-slate-100 px-1 rounded">other_details</code> JSON for future use.
          </p>
          <Button onClick={onClose} className="bg-violet-600 hover:bg-violet-700 text-white">
            Apply Mapping
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}