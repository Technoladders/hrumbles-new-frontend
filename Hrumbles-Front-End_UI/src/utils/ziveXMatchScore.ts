// src/utils/ziveXMatchScore.ts  v2
//
// DESIGN:
//   • Display score  = result._relevance_score (computed by the Typesense hook,
//     already normalised: top result = 100%, others scale proportionally).
//     This is the most accurate signal — do NOT recompute it.
//
//   • Bucket labels  = which filter groups this candidate actually satisfies.
//     We compute these client-side for the badge breakdown ("✓ Skills", "💼 Title" …).
//     Uses ONLY fields that actually exist on CandidateSearchResult (from transformHit):
//       title / current_designation / current_company / key_skills (array)
//       previous_titles (array) / previous_companies (array)
//       degree / institution / education_summary
//       current_location / total_experience_years
//
//   • isStrongMatch  = _relevance_score >= MATCH_THRESHOLD
//     (threshold 40: comfortably above "tangentially mentioned once" noise)
//     OR at least one bucket matched AND _relevance_score > 0 when no score exists.

import type { CandidateSearchResult, SearchFilters, SearchTag } from '@/types/candidateSearch';
import { canonicalizeEdu } from '@/utils/eduNormalize';

export interface MatchDetail {
  score:         number;        // 0–100  (from _relevance_score)
  matched:       MatchBucket[]; // which filter groups hit
  isStrongMatch: boolean;
}

export interface MatchBucket {
  label: string;
  icon:  string;
}

const MATCH_THRESHOLD = 40; // _relevance_score >= this → strong match

// ── tiny helpers ──────────────────────────────────────────────────────────────

function lo(s?: string | null): string {
  return (s ?? '').toLowerCase().trim();
}

/** Does a string-or-array contain any of the given values (case-insensitive)? */
function fieldContainsAny(
  field: string | string[] | null | undefined,
  values: string[],
): boolean {
  if (!values.length) return false;
  if (Array.isArray(field)) {
    const joined = field.map(lo).join(' ');
    return values.some(v => v && joined.includes(lo(v)));
  }
  const s = lo(field as string);
  return values.some(v => v && s.includes(lo(v)));
}

/** Pull the SearchTag values out, respecting mandatory semantics.
 *  Returns true if:
 *    - all mandatory tags match, AND
 *    - at least one optional tag matches (or there are no optional tags)
 */
function tagsHit(
  field: string | string[] | null | undefined,
  tags: SearchTag[],
): boolean {
  if (!tags.length) return false;
  const mandatory = tags.filter(t =>  t.mandatory);
  const optional  = tags.filter(t => !t.mandatory);
  const allMandatoryMatch = mandatory.every(t => fieldContainsAny(field, [t.value]));
  if (!allMandatoryMatch) return false;
  if (optional.length === 0) return mandatory.length > 0;
  return optional.some(t => fieldContainsAny(field, [t.value]));
}

// ── main scorer ───────────────────────────────────────────────────────────────

export function computeMatchDetail(
  result: CandidateSearchResult,
  filters: SearchFilters,
): MatchDetail {
  // ── Use the hook's pre-computed score as the display score ────────────────
  const score = result._relevance_score ?? 0;
  const buckets: MatchBucket[] = [];

  // Convenience: all current_designations (multi-array v4 + legacy single)
  const titleTags: SearchTag[] = [
    ...((filters as any).current_designations ?? []),
    ...(filters.current_designation
      ? [{ value: filters.current_designation, mandatory: false }]
      : []),
  ];

  // Convenience: all current_companies
  const companyTags: SearchTag[] = [
    ...((filters as any).current_companies ?? []),
    ...(filters.current_company
      ? [{ value: filters.current_company, mandatory: false }]
      : []),
  ];

  // Convenience: all degree filters
  const degreeTags: SearchTag[] = [
    ...((filters as any).degrees ?? []),
    ...(filters.degree
      ? [{ value: filters.degree, mandatory: false }]
      : []),
  ];

  // ── 1. Keywords ──────────────────────────────────────────────────────────
  if (filters.keywords?.length) {
    const allText = [
      result.title, result.current_designation, result.current_company,
      result.education_summary,
      ...(result.key_skills ?? []),
      ...(result.previous_titles ?? []),
      ...(result.previous_companies ?? []),
      result.degree, result.institution, result.current_location,
    ].join(' ');

    if (tagsHit(allText, filters.keywords)) {
      buckets.push({ label: 'Keywords', icon: '🔑' });
    }
  }

  // ── 2. Current Title ────────────────────────────────────────────────────
  if (titleTags.length) {
    // title field = result.title (= suggested_title || current_designation)
    // also check current_designation directly
    const titleField = [result.title, result.current_designation].join(' ');
    const titleValues = titleTags.map(t => t.value);
    if (fieldContainsAny(titleField, titleValues)) {
      buckets.push({ label: 'Current Title', icon: '💼' });
    }
  }

  // ── 3. Current Company ──────────────────────────────────────────────────
  if (companyTags.length) {
    const coValues = companyTags.map(t => t.value);
    if (fieldContainsAny(result.current_company, coValues)) {
      buckets.push({ label: 'Company', icon: '🏢' });
    }
  }

  // ── 4. Skills ───────────────────────────────────────────────────────────
  if (filters.skills?.length) {
    // key_skills is string[] on CandidateSearchResult
    const skillsJoined = (result.key_skills ?? []).join(' ');
    if (tagsHit(skillsJoined, filters.skills)) {
      buckets.push({ label: 'Skills', icon: '⚡' });
    }
  }

  // ── 5. Location ─────────────────────────────────────────────────────────
  if (filters.locations?.length) {
    const locValues = filters.locations.map(t => t.value);
    if (fieldContainsAny(result.current_location, locValues)) {
      buckets.push({ label: 'Location', icon: '📍' });
    }
  }

  // ── 6. Experience ────────────────────────────────────────────────────────
  const expYears = result.total_experience_years ?? null; // correct field name
  if (expYears != null && (filters.min_exp != null || filters.max_exp != null)) {
    const minOk = filters.min_exp == null || expYears >= filters.min_exp;
    const maxOk = filters.max_exp == null || expYears <= filters.max_exp;
    if (minOk && maxOk) {
      buckets.push({ label: 'Experience', icon: '📅' });
    }
  }

  // ── 7. Previous Titles ───────────────────────────────────────────────────
  if (filters.previous_titles?.length) {
    // previous_titles is string[] on CandidateSearchResult (Phase 2)
    const prevTitleJoined = [
      ...(result.previous_titles ?? []),
      result.previous_designation ?? '',
    ].join(' ');
    const ptValues = filters.previous_titles.map(t => t.value);
    if (fieldContainsAny(prevTitleJoined, ptValues)) {
      buckets.push({ label: 'Prev. Title', icon: '🔄' });
    }
  }

  // ── 8. Previous Companies ────────────────────────────────────────────────
  if (filters.previous_companies?.length) {
    const prevCoJoined = [
      ...(result.previous_companies ?? []),
      result.previous_company ?? '',
    ].join(' ');
    const pcValues = filters.previous_companies.map(t => t.value);
    if (fieldContainsAny(prevCoJoined, pcValues)) {
      buckets.push({ label: 'Prev. Company', icon: '🏛️' });
    }
  }

  // ── 9. Education / Degree ────────────────────────────────────────────────
  if (degreeTags.length) {
    // degree field + education_summary as fallback
    const eduRaw = result.degree || result.education_summary || '';
    const nEdu   = canonicalizeEdu(eduRaw);
    const hit    = degreeTags.some(t => {
      const nFilter = canonicalizeEdu(t.value);
      return (
        nEdu.includes(nFilter) ||
        nFilter.includes(nEdu) ||
        lo(eduRaw).includes(lo(t.value))
      );
    });
    if (hit) buckets.push({ label: 'Education', icon: '🎓' });
  }

  // ── 10. Institution ──────────────────────────────────────────────────────
  if (filters.institutions?.length) {
    // institution field (Phase 2) + education_summary fallback
    const instRaw = result.institution || result.education_summary || '';
    const instValues = filters.institutions.map(t => t.value);
    if (fieldContainsAny(instRaw, instValues)) {
      buckets.push({ label: 'Institution', icon: '🏫' });
    }
  }

  // ── isStrongMatch ─────────────────────────────────────────────────────────
  // A result is a "strong match" if:
  //   • the hook gave it a relevance score of MATCH_THRESHOLD or above, OR
  //   • it has no hook score yet but we found at least 1 matching bucket
  const isStrongMatch =
    (score > 0 && score >= MATCH_THRESHOLD) ||
    (score === 0 && buckets.length > 0);

  return { score, matched: buckets, isStrongMatch };
}

// ── partition ─────────────────────────────────────────────────────────────────

export function partitionResults(
  results: CandidateSearchResult[],
  filters: SearchFilters,
): {
  matched:   Array<{ result: CandidateSearchResult; detail: MatchDetail }>;
  suggested: Array<{ result: CandidateSearchResult; detail: MatchDetail }>;
} {
  // No active filters → everything goes to suggested (no false "100% match" claims)
  const hasFilters = !!(
    filters.keywords?.length ||
    filters.skills?.length ||
    filters.locations?.length ||
    (filters as any).current_designations?.length || filters.current_designation ||
    (filters as any).current_companies?.length    || filters.current_company ||
    filters.previous_titles?.length ||
    filters.previous_companies?.length ||
    (filters as any).degrees?.length || filters.degree ||
    filters.institutions?.length ||
    filters.min_exp != null || filters.max_exp != null
  );

  const withDetails = results.map(r => ({
    result: r,
    detail: computeMatchDetail(r, filters),
  }));

  // Sort: matched first by score desc, then suggested by score desc
  withDetails.sort((a, b) => b.detail.score - a.detail.score);

  if (!hasFilters) {
    return { matched: [], suggested: withDetails };
  }

  const matched   = withDetails.filter(x =>  x.detail.isStrongMatch);
  const suggested = withDetails.filter(x => !x.detail.isStrongMatch);

  return { matched, suggested };
}