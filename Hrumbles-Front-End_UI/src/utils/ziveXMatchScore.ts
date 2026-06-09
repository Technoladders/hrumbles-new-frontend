// src/utils/ziveXMatchScore.ts  v3 (aligned with useTypesenseSearch v8)
//
// SCORE CONTRACT WITH v8 HOOK:
//   v8 sets result._relevance_score to a 0–100 integer:
//      score = (mustPts + nicePts) / max(1, mustTotal + niceTotal) × 100
//
//   With 1 must term:    everyone in results has 100 (must was satisfied to enter).
//   With 0 must + 3 nice: candidates matching 1/3 = 33%, 2/3 = 67%, 3/3 = 100%.
//   With 1 must + 2 nice: 1 nice = 67%, 2 nice = 100%.
//
//   MATCH_THRESHOLD = 40 means:
//     • In nice-only mode, a candidate must hit at least ~⅖ of the nice terms.
//     • In must-mode, everyone surviving the intersection is a strong match.
//
// Bucket detection is independent of score — it inspects fields on the result
// to label which filter groups actually matched, so the UI can show
// "✓ Skills · 💼 Title" badges per candidate.

import type { CandidateSearchResult, SearchFilters, SearchTag } from '@/types/candidateSearch';
import { canonicalizeEdu } from '@/utils/eduNormalize';

export interface MatchDetail {
  score:         number;        // 0–100  (from _relevance_score)
  matched:       MatchBucket[];
  isStrongMatch: boolean;
}

export interface MatchBucket {
  label: string;
  icon:  string;
}

const MATCH_THRESHOLD = 40;

// ── helpers ──────────────────────────────────────────────────────────────────
const lo = (s?: string | null): string => (s ?? '').toLowerCase().trim();

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

// ── main ─────────────────────────────────────────────────────────────────────
export function computeMatchDetail(
  result: CandidateSearchResult,
  filters: SearchFilters,
): MatchDetail {
  const score = result._relevance_score ?? 0;
  const buckets: MatchBucket[] = [];

  const titleTags: SearchTag[] = [
    ...((filters as any).current_designations ?? []),
    ...(filters.current_designation
      ? [{ value: filters.current_designation, mandatory: false }] : []),
  ];
  const companyTags: SearchTag[] = [
    ...((filters as any).current_companies ?? []),
    ...(filters.current_company
      ? [{ value: filters.current_company, mandatory: false }] : []),
  ];
  const degreeTags: SearchTag[] = [
    ...((filters as any).degrees ?? []),
    ...(filters.degree ? [{ value: filters.degree, mandatory: false }] : []),
  ];

  // 1. Keywords
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

  // 2. Current Title
  if (titleTags.length) {
    const titleField = [result.title, result.current_designation].join(' ');
    if (fieldContainsAny(titleField, titleTags.map(t => t.value))) {
      buckets.push({ label: 'Current Title', icon: '💼' });
    }
  }

  // 3. Current Company
  if (companyTags.length) {
    if (fieldContainsAny(result.current_company, companyTags.map(t => t.value))) {
      buckets.push({ label: 'Company', icon: '🏢' });
    }
  }

  // 4. Skills
  if (filters.skills?.length) {
    const skillsJoined = (result.key_skills ?? []).join(' ');
    if (tagsHit(skillsJoined, filters.skills)) {
      buckets.push({ label: 'Skills', icon: '⚡' });
    }
  }

  // 5. Location
  if (filters.locations?.length) {
    if (fieldContainsAny(result.current_location, filters.locations.map(t => t.value))) {
      buckets.push({ label: 'Location', icon: '📍' });
    }
  }

  // 6. Experience
  const expYears = result.total_experience_years ?? null;
  if (expYears != null && (filters.min_exp != null || filters.max_exp != null)) {
    const minOk = filters.min_exp == null || expYears >= filters.min_exp;
    const maxOk = filters.max_exp == null || expYears <= filters.max_exp;
    if (minOk && maxOk) buckets.push({ label: 'Experience', icon: '📅' });
  }

  // 7. Previous Titles
  if (filters.previous_titles?.length) {
    const prevTitleJoined = [
      ...(result.previous_titles ?? []),
      result.previous_designation ?? '',
    ].join(' ');
    if (fieldContainsAny(prevTitleJoined, filters.previous_titles.map(t => t.value))) {
      buckets.push({ label: 'Prev. Title', icon: '🔄' });
    }
  }

  // 8. Previous Companies
  if (filters.previous_companies?.length) {
    const prevCoJoined = [
      ...(result.previous_companies ?? []),
      result.previous_company ?? '',
    ].join(' ');
    if (fieldContainsAny(prevCoJoined, filters.previous_companies.map(t => t.value))) {
      buckets.push({ label: 'Prev. Company', icon: '🏛️' });
    }
  }

  // 9. Education / Degree
  if (degreeTags.length) {
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

  // 10. Institution
  if (filters.institutions?.length) {
    const instRaw = result.institution || result.education_summary || '';
    if (fieldContainsAny(instRaw, filters.institutions.map(t => t.value))) {
      buckets.push({ label: 'Institution', icon: '🏫' });
    }
  }

  // isStrongMatch
  const isStrongMatch =
    (score > 0 && score >= MATCH_THRESHOLD) ||
    (score === 0 && buckets.length > 0);

  return { score, matched: buckets, isStrongMatch };
}

// ── partition ────────────────────────────────────────────────────────────────
export function partitionResults(
  results: CandidateSearchResult[],
  filters: SearchFilters,
): {
  matched:   Array<{ result: CandidateSearchResult; detail: MatchDetail }>;
  suggested: Array<{ result: CandidateSearchResult; detail: MatchDetail }>;
} {
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
  withDetails.sort((a, b) => b.detail.score - a.detail.score);

  if (!hasFilters) return { matched: [], suggested: withDetails };
  return {
    matched:   withDetails.filter(x =>  x.detail.isStrongMatch),
    suggested: withDetails.filter(x => !x.detail.isStrongMatch),
  };
}