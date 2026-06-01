// src/hooks/zive-x/useTypesenseSearch.ts
//
// Replaces: supabase.rpc('search_unified_candidates_v31', {...})
// Uses:     Typesense HTTP API directly (no SDK needed — plain fetch)
//
// Key fixes over the old RPC approach:
//   1. "senior frontend developer" → phrase match on title, not tokenized FTS
//   2. Mandatory = hard filter, Optional = ranking boost
//   3. Zero timeout — Typesense responds in <100ms always
//   4. Works on 5L+ records without degradation

import { useQuery } from '@tanstack/react-query';
import { CandidateSearchResult, SearchFilters } from '@/types/candidateSearch';

// ── Config ────────────────────────────────────────────────────────────────────
// Search-only scoped key — read-only, cannot write/delete, safe in frontend
const TYPESENSE_URL        = 'https://search.xrilic.ai';
const TYPESENSE_SEARCH_KEY = '84c228d38973deaf5d36f4899cc8c5522d60ba085cdf5d9df376770fccc0b122';

// Fields searched in order of weight
const QUERY_BY_FIELDS  = 'suggested_title,current_designation,current_company,skills,education_summary,resume_snippet';
const QUERY_BY_WEIGHTS = '10,9,5,4,2,1';

// ── Helper: build Typesense filter_by string ─────────────────────────────────

function buildFilterBy(filters: SearchFilters, organizationId: string): string {
  const parts: string[] = [];

  // Always scope to org
  parts.push(`organization_id:=${organizationId}`);

  // ── Mandatory keywords → title/designation filter (phrase match) ──────────
  const mandatoryKeywords = filters.keywords?.filter(t => t.mandatory).map(t => t.value) ?? [];
  if (mandatoryKeywords.length > 0) {
    // Each mandatory keyword must appear in title or designation
    mandatoryKeywords.forEach(kw => {
      const escaped = kw.replace(/[`\\]/g, '\\$&');
      // Use backtick for exact phrase match in Typesense
      parts.push(`(suggested_title:\`${escaped}\` || current_designation:\`${escaped}\`)`);
    });
  }

  // ── Mandatory skills → exact array filter ────────────────────────────────
  const mandatorySkills = filters.skills?.filter(t => t.mandatory).map(t => t.value.toLowerCase()) ?? [];
  if (mandatorySkills.length > 0) {
    // All mandatory skills must be present
    mandatorySkills.forEach(skill => {
      parts.push(`skills:=${skill}`);
    });
  }

  // ── Hard numeric filters (use indexes) ────────────────────────────────────
  if (filters.min_exp != null)           parts.push(`exp_years:>=${filters.min_exp}`);
  if (filters.max_exp != null)           parts.push(`exp_years:<=${filters.max_exp}`);
  if (filters.min_current_salary != null) parts.push(`current_ctc:>=${filters.min_current_salary}`);
  if (filters.max_current_salary != null) parts.push(`current_ctc:<=${filters.max_current_salary}`);
  if (filters.min_expected_salary != null) parts.push(`expected_ctc:>=${filters.min_expected_salary}`);
  if (filters.max_expected_salary != null) parts.push(`expected_ctc:<=${filters.max_expected_salary}`);

  // ── Notice period ─────────────────────────────────────────────────────────
  if (filters.notice_periods && filters.notice_periods.length > 0) {
    const np = filters.notice_periods.map(p => `\`${p}\``).join(',');
    parts.push(`notice_period:[${np}]`);
  }

  // ── Mandatory locations → filter ──────────────────────────────────────────
  const mandatoryLocations = filters.locations?.filter(t => t.mandatory).map(t => t.value) ?? [];
  if (mandatoryLocations.length > 0) {
    const locs = mandatoryLocations.map(l => `\`${l.toLowerCase()}\``).join(',');
    parts.push(`current_location:[${locs}]`);
  }

  // ── Mandatory companies ───────────────────────────────────────────────────
  const mandatoryCompanies = filters.companies?.filter(t => t.mandatory).map(t => t.value) ?? [];
  if (mandatoryCompanies.length > 0) {
    mandatoryCompanies.forEach(c => {
      parts.push(`(current_company:\`${c}\` || previous_company:\`${c}\`)`);
    });
  }

  // ── Current company / designation exact ──────────────────────────────────
  if (filters.current_company) {
    parts.push(`current_company:\`${filters.current_company}\``);
  }
  if (filters.current_designation) {
    parts.push(`current_designation:\`${filters.current_designation}\``);
  }

  // ── Date filter ───────────────────────────────────────────────────────────
  if (filters.date_posted && filters.date_posted !== 'all_time') {
    const now = Math.floor(Date.now() / 1000);
    const ranges: Record<string, number> = {
      last_24_hours: 86400,
      last_7_days:   604800,
      last_14_days:  1209600,
      last_30_days:  2592000,
    };
    const delta = ranges[filters.date_posted];
    if (delta) parts.push(`created_at_ts:>=${now - delta}`);
  }

  return parts.join(' && ');
}

// ── Helper: build the soft-search query string ────────────────────────────────
// Optional keywords/skills → used as search query (boost, not filter)

function buildQuery(filters: SearchFilters): string {
  const parts: string[] = [];

  // Optional keywords
  const optKeywords = filters.keywords?.filter(t => !t.mandatory).map(t => t.value) ?? [];
  parts.push(...optKeywords);

  // Optional skills
  const optSkills = filters.skills?.filter(t => !t.mandatory).map(t => t.value) ?? [];
  parts.push(...optSkills);

  // Optional locations
  const optLocations = filters.locations?.filter(t => !t.mandatory).map(t => t.value) ?? [];
  parts.push(...optLocations);

  // Optional companies
  const optCompanies = filters.companies?.filter(t => !t.mandatory).map(t => t.value) ?? [];
  parts.push(...optCompanies);

  // Name/email searches
  const nameVal = filters.name?.[0]?.value;
  if (nameVal) parts.push(nameVal);

  const emailVal = filters.email?.[0]?.value;
  if (emailVal) parts.push(emailVal);

  // JD-generated keywords (from AI)
  if (filters.jd_generated_keywords?.length) {
    parts.push(...filters.jd_generated_keywords.slice(0, 10)); // top 10
  }

  return parts.filter(Boolean).join(' ') || '*'; // '*' = match all
}

// ── Transform Typesense hit → CandidateSearchResult ──────────────────────────

function transformHit(hit: any): CandidateSearchResult {
  const doc = hit.document;
  const highlights = hit.highlights || [];

  // Build matched fields list for UI
  const matchedFields = highlights
    .filter((h: any) => h.matched_tokens?.length > 0)
    .map((h: any) => h.field);

  return {
    id:                    doc.id,
    full_name:             doc.full_name || '',
    email:                 doc.email || '',
    title:                 doc.suggested_title || doc.current_designation || '',
    source:                'internal',
    current_company:       doc.current_company || '',
    current_designation:   doc.current_designation || '',
    previous_company:      doc.previous_company,
    previous_designation:  doc.previous_designation,
    education_summary:     doc.education_summary || '',
    key_skills:            doc.skills || [],
    total_experience_years: doc.exp_years ?? null,
    current_ctc:           doc.current_ctc ?? null,
    expected_ctc:          doc.expected_ctc ?? null,
    current_location:      doc.current_location || '',
    notice_period:         doc.notice_period || null,
    phone:                 doc.phone,
    _relevance_score:      hit.text_match_info?.score
      ? Math.min(100, Math.round((hit.text_match_info.score / 255) * 100))
      : undefined,
    _matched_fields:       matchedFields,
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export interface UseTypesenseSearchOptions {
  filters: SearchFilters;
  organizationId: string;
  enabled?: boolean;
}

export function useTypesenseSearch({
  filters,
  organizationId,
  enabled = true,
}: UseTypesenseSearchOptions) {
  return useQuery<CandidateSearchResult[]>({
    queryKey: ['typesenseSearch', organizationId, filters],
    enabled: enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async () => {
      const q          = buildQuery(filters);
      const filter_by  = buildFilterBy(filters, organizationId);

      // Build sort: relevance first, then recency
      const sort_by = '_text_match:desc,created_at_ts:desc';

      const params = new URLSearchParams({
        q,
        query_by:                    QUERY_BY_FIELDS,
        query_by_weights:            QUERY_BY_WEIGHTS,
        filter_by,
        sort_by,
        per_page:                    '250',
        page:                        '1',
        highlight_fields:            'suggested_title,current_designation,current_company,skills',
        highlight_affix_num_tokens:  '4',
        // Split join: allows "seniorfrondend" typo tolerance
        split_join_tokens:           'fallback',
        // Num typos allowed per token
        num_typos:                   '1',
        typo_tokens_threshold:       '1',
        prefix:                      'true',
      });

      const response = await fetch(
        `${TYPESENSE_URL}/collections/candidates/documents/search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Typesense search failed: ${response.status} ${err}`);
      }

      const data = await response.json();
      const hits: any[] = data.hits || [];

      return hits.map(transformHit);
    },
  });
}