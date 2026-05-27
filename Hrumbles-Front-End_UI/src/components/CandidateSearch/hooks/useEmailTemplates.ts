// src/components/CandidateSearch/hooks/useEmailTemplates.ts
// Fetches global (is_global=true) and org-specific email invite templates.
// Returns them in display-ready format, global first.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TemplateScope = "general" | "job_specific" | "pipeline" | "senior" | "urgent";

export interface EmailTemplate {
  id:              string;
  organization_id: string | null;
  name:            string;
  description:     string | null;
  subject_line:    string;
  body_text:       string;
  scope:           TemplateScope;
  variables_used:  string[];
  is_global:       boolean;
  is_default:      boolean;
  created_at:      string;
}

export interface CreateTemplateParams {
  name:          string;
  description?:  string;
  subject_line:  string;
  body_text:     string;
  scope:         TemplateScope;
  is_default?:   boolean;
}

// ── Variable catalogue per scope ─────────────────────────────
export const TEMPLATE_VARIABLES: Record<TemplateScope | "all", { key: string; label: string }[]> = {
  all: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
  general: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
  job_specific: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{location}",   label: "Location"     },
    { key: "{experience}", label: "Experience"   },
    { key: "{skills}",     label: "Skills"       },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
  pipeline: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
  senior: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{department}", label: "Department"   },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
  urgent: [
    { key: "{name}",       label: "Full name"    },
    { key: "{firstName}",  label: "First name"   },
    { key: "{jobTitle}",   label: "Job title"    },
    { key: "{company}",    label: "Company"      },
    { key: "{expiryDate}", label: "Expiry date"  },
  ],
};

export const SCOPE_LABELS: Record<TemplateScope, string> = {
  general:      "General",
  job_specific: "Job-Specific",
  pipeline:     "Pipeline",
  senior:       "Senior / Executive",
  urgent:       "Urgent Hire",
};

const QUERY_KEY = (orgId: string) => ["email-templates", orgId];

// ── Main hook ─────────────────────────────────────────────────
export function useEmailTemplates(organizationId: string | undefined) {
  return useQuery<EmailTemplate[]>({
    queryKey: QUERY_KEY(organizationId ?? ""),
    queryFn:  async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("org_email_templates")
        .select("*")
        .or(`is_global.eq.true,organization_id.eq.${organizationId}`)
        .order("is_global", { ascending: false })  // global first
        .order("created_at",  { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
    enabled:   !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutation: create org template ─────────────────────────────
export function useCreateEmailTemplate(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateTemplateParams) => {
      const { data, error } = await supabase
        .from("org_email_templates")
        .insert({ ...params, organization_id: organizationId, is_global: false })
        .select("*")
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(organizationId) }),
  });
}

// ── Mutation: update org template ─────────────────────────────
export function useUpdateEmailTemplate(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...params }: Partial<CreateTemplateParams> & { id: string }) => {
      const { data, error } = await supabase
        .from("org_email_templates")
        .update({ ...params, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(organizationId) }),
  });
}

// ── Mutation: delete org template ─────────────────────────────
export function useDeleteEmailTemplate(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("org_email_templates")
        .delete()
        .eq("id", id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(organizationId) }),
  });
}

// ── Utility: substitute template variables ────────────────────
export interface TemplateVariables {
  name?:       string;
  firstName?:  string;
  jobTitle?:   string;
  company?:    string;
  expiryDate?: string;
  location?:   string;
  experience?: string;
  skills?:     string;
  salary?:     string;
  department?: string;
}

export function substituteVariables(text: string, vars: TemplateVariables): string {
  return text
    .replace(/\{name\}/g,       vars.name       ?? "")
    .replace(/\{firstName\}/g,  vars.firstName  ?? "")
    .replace(/\{jobTitle\}/g,   vars.jobTitle   ?? "")
    .replace(/\{company\}/g,    vars.company    ?? "")
    .replace(/\{expiryDate\}/g, vars.expiryDate ?? "")
    .replace(/\{location\}/g,   vars.location   ?? "")
    .replace(/\{experience\}/g, vars.experience ?? "")
    .replace(/\{skills\}/g,     vars.skills     ?? "")
    .replace(/\{salary\}/g,     vars.salary     ?? "")
    .replace(/\{department\}/g, vars.department ?? "");
}

// Converts template body text to basic email-safe HTML paragraphs.
// Preserves double-newlines as paragraph breaks.
export function bodyTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.65;">${
      p.trim().replace(/\n/g, "<br>")
    }</p>`)
    .join("");
}

export function computeExpiryLabel(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}