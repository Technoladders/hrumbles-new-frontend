// src/hooks/zive-x/useTypesenseSearch.ts
//
// SEARCH ARCHITECTURE — v4 (recruiter-correct)
//
// OPTIONAL KEYWORDS:
//   Fetch ALL org candidates (q='*') then client-side rank by match count.
//   This ensures Python alone or Python+Django+Flask all return the same
//   pool — just ranked differently. Typesense q is only used for mandatory
//   terms (intersection) and structural filters.
//
// MANDATORY KEYWORDS:
//   Each mandatory keyword runs as a SEPARATE Typesense search.
//   Intersect all result ID sets → only candidates matching ALL mandatory terms.
//
// MANDATORY SKILLS/COMPANIES/LOCATIONS:
//   filter_by (exact match) — server-side, zero false positives.
//
// SYNONYM HANDLING:
//   Client-side expansion before search. Common recruiter synonyms covered.
//   Server-side synonyms should be configured via Typesense admin API.

import { useQuery } from '@tanstack/react-query';
import { CandidateSearchResult, SearchFilters } from '@/types/candidateSearch';

// ── Config ────────────────────────────────────────────────────────────────────
const TYPESENSE_URL        = 'https://search.hrumbles.ai';
const TYPESENSE_SEARCH_KEY = '84c228d38973deaf5d36f4899cc8c5522d60ba085cdf5d9df376770fccc0b122';
const QUERY_BY_FIELDS      = 'suggested_title,current_designation,current_company,skills,education_summary,resume_snippet';
const QUERY_BY_WEIGHTS     = '10,9,5,4,2,1';
const MAX_PER_PAGE         = 250;

// ── Synonym map — client-side expansion ───────────────────────────────────────
// When a recruiter types "React", also search for "ReactJS". This expands
// the search query to catch candidates who wrote their skill differently.
const SYNONYMS: Record<string, string[]> = {
  'react':            ['reactjs', 'react.js'],
  'reactjs':          ['react', 'react.js'],
  'js':               ['javascript'],
  'javascript':       ['js'],
  'node':             ['nodejs', 'node.js'],
  'nodejs':           ['node', 'node.js'],
  'ts':               ['typescript'],
  'typescript':       ['ts'],
  'python':           ['py'],
  'ml':               ['machine learning'],
  'machine learning': ['ml'],
  'ai':               ['artificial intelligence'],
  'artificial intelligence': ['ai'],
  'k8s':             ['kubernetes'],
  'kubernetes':       ['k8s'],
  'aws':             ['amazon web services'],
  'gcp':             ['google cloud'],
  'azure':           ['microsoft azure'],
  'rn':              ['react native'],
  'react native':    ['rn'],
  'angular':         ['angularjs'],
  'angularjs':       ['angular'],
  'vue':             ['vuejs', 'vue.js'],
  'vuejs':           ['vue', 'vue.js'],
  'sql':             ['structured query language'],
  'nosql':           ['non-relational database'],
  'devops':          ['dev ops', 'development operations'],
  'qa':              ['quality assurance', 'testing'],
  'quality assurance': ['qa'],
  'ui':              ['user interface'],
  'ux':              ['user experience'],
  'ui/ux':           ['user interface', 'user experience', 'product design'],
  'restful':         ['rest api', 'rest'],
  'rest':            ['restful', 'rest api'],
  'dotnet':          ['.net', 'dot net'],
  '.net':            ['dotnet', 'dot net'],
  'c#':              ['csharp', 'c sharp'],
  'ios':             ['swift', 'objective-c'],
  'android':         ['kotlin', 'java android'],
  'fullstack':       ['full stack', 'full-stack'],
  'full stack':      ['fullstack', 'full-stack'],
  'frontend':        ['front end', 'front-end', 'ui developer'],
  'front end':       ['frontend', 'front-end'],
  'backend':         ['back end', 'back-end', 'server side'],
  'back end':        ['backend', 'back-end'],
};

function expandWithSynonyms(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const syns  = SYNONYMS[lower] ?? [];
  return [term, ...syns].filter((v, i, a) => a.indexOf(v) === i);
}

function esc(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

// ── API call ──────────────────────────────────────────────────────────────────
async function singleSearch(params: Record<string, string>): Promise<any> {
  const url = new URLSearchParams(params);
  const res = await fetch(
    `${TYPESENSE_URL}/collections/candidates/documents/search?${url.toString()}`,
    { headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY } }
  );
  if (!res.ok) throw new Error(`Typesense ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Structural filter_by (mandatory structured filters) ────────────────────────
function buildStructuralFilterBy(f: SearchFilters, orgId: string): string {
  const parts: string[] = [`organization_id:=${orgId}`];

  // Mandatory skills (exact array element match)
  f.skills?.filter(t => t.mandatory).forEach(t => {
    parts.push(`skills:=${t.value.toLowerCase()}`);
  });

  // Mandatory locations
  const mandLocs = f.locations?.filter(t => t.mandatory) ?? [];
  if (mandLocs.length > 0) {
    const locs = mandLocs.map(l => `\`${esc(l.value.toLowerCase())}\``).join(',');
    parts.push(`current_location:[${locs}]`);
  }

  // Mandatory companies (exact field match)
  f.companies?.filter(t => t.mandatory).forEach(t => {
    parts.push(`(current_company:\`${esc(t.value)}\` || previous_company:\`${esc(t.value)}\`)`);
  });

  // Dedicated input fields
  if (f.current_company)     parts.push(`current_company:\`${esc(f.current_company)}\``);
  if (f.current_designation) parts.push(`current_designation:\`${esc(f.current_designation)}\``);

  // Numeric ranges
  if (f.min_exp != null)             parts.push(`exp_years:>=${f.min_exp}`);
  if (f.max_exp != null)             parts.push(`exp_years:<=${f.max_exp}`);
  if (f.min_current_salary  != null) parts.push(`current_ctc:>=${f.min_current_salary}`);
  if (f.max_current_salary  != null) parts.push(`current_ctc:<=${f.max_current_salary}`);
  if (f.min_expected_salary != null) parts.push(`expected_ctc:>=${f.min_expected_salary}`);
  if (f.max_expected_salary != null) parts.push(`expected_ctc:<=${f.max_expected_salary}`);

  // Notice period
  if (f.notice_periods?.length) {
    const np = f.notice_periods.map(p => `\`${esc(p)}\``).join(',');
    parts.push(`notice_period:[${np}]`);
  }

  // Date filter
  if (f.date_posted && f.date_posted !== 'all_time') {
    const now = Math.floor(Date.now() / 1000);
    const deltas: Record<string, number> = {
      last_24_hours: 86400, last_7_days: 604800,
      last_14_days: 1209600, last_30_days: 2592000,
    };
    const delta = deltas[f.date_posted];
    if (delta) parts.push(`created_at_ts:>=${now - delta}`);
  }

  return parts.join(' && ');
}

// ── Mandatory keyword intersection ────────────────────────────────────────────
// Each mandatory keyword → separate search → intersect all ID sets.
// Guarantees ALL mandatory terms exist in the candidate's indexed fields.
async function getMandatoryKeywordIds(
  keywords: string[],
  filterBy: string,
): Promise<Set<string> | null> {
  if (keywords.length === 0) return null;

  const searches = keywords.map(kw => {
    // Expand with synonyms — if recruiter types "React", also find "ReactJS"
    const expanded = expandWithSynonyms(kw);
    // Use quoted phrase per term — ensures the term as a unit is found
    const q = expanded.map(t => `"${t}"`).join(' ');
    return singleSearch({
      q,
      query_by:  QUERY_BY_FIELDS,
      filter_by: filterBy,
      per_page:  MAX_PER_PAGE.toString(),
      page:      '1',
      num_typos: '1',
      prefix:    'true',
    });
  });

  const results  = await Promise.all(searches);
  const idSets   = results.map(d => new Set<string>((d.hits || []).map((h: any) => h.document.id as string)));
  if (idSets.length === 0) return new Set<string>();

  let intersection = idSets[0];
  for (let i = 1; i < idSets.length; i++) {
    intersection = new Set([...intersection].filter(id => idSets[i].has(id)));
  }
  return intersection;
}

// ── Transform Typesense hit → CandidateSearchResult ───────────────────────────
function transformHit(hit: any): CandidateSearchResult {
  const doc = hit.document;
  return {
    id:                     doc.id,
    full_name:              doc.full_name || '',
    email:                  doc.email || '',
    title:                  doc.suggested_title || doc.current_designation || '',
    source:                 'internal',
    current_company:        doc.current_company || '',
    current_designation:    doc.current_designation || '',
    previous_company:       doc.previous_company,
    previous_designation:   doc.previous_designation,
    education_summary:      doc.education_summary || '',
    key_skills:             doc.skills || [],
    total_experience_years: doc.exp_years ?? null,
    current_ctc:            doc.current_ctc ?? null,
    expected_ctc:           doc.expected_ctc ?? null,
    current_location:       doc.current_location || '',
    notice_period:          doc.notice_period || null,
    phone:                  doc.phone,
    _relevance_score:       undefined,
    _matched_fields:        [],
  };
}

// ── Client-side scoring ───────────────────────────────────────────────────────
// Counts how many optional terms (including synonyms) appear in the candidate.
// Used for ranking when optional keywords are present.
function scoreCandidate(r: CandidateSearchResult, optionalTerms: string[]): number {
  if (optionalTerms.length === 0) return 0;

  const searchableText = [
    r.title,
    r.current_designation,
    r.current_company,
    r.previous_company       ?? '',
    r.previous_designation   ?? '',
    r.education_summary      ?? '',
    r.current_location       ?? '',
    ...(r.key_skills         ?? []),
  ].join(' ').toLowerCase();

  let score = 0;
  for (const term of optionalTerms) {
    const variants = expandWithSynonyms(term);
    // Each term is worth 1 point — bonus if it matches in a high-weight field
    const titleText = [r.title, r.current_designation].join(' ').toLowerCase();
    const skillText = (r.key_skills ?? []).join(' ').toLowerCase();

    for (const variant of variants) {
      const v = variant.toLowerCase();
      if (titleText.includes(v))      { score += 3; break; } // title match = 3 points
      else if (skillText.includes(v)) { score += 2; break; } // skill match = 2 points
      else if (searchableText.includes(v)) { score += 1; break; } // other = 1 point
    }
  }
  return score;
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export interface UseTypesenseSearchOptions {
  filters:        SearchFilters;
  organizationId: string;
  enabled?:       boolean;
}

export function useTypesenseSearch({
  filters,
  organizationId,
  enabled = true,
}: UseTypesenseSearchOptions) {
  return useQuery<CandidateSearchResult[]>({
    queryKey:  ['typesenseSearch', organizationId, filters],
    enabled:   enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async () => {

      const structuralFilter = buildStructuralFilterBy(filters, organizationId);

      // Separate mandatory vs optional
      const mandatoryKeywords = filters.keywords?.filter(t => t.mandatory).map(t => t.value) ?? [];
      const optionalKeywords  = filters.keywords?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalSkills    = filters.skills?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalCompanies = filters.companies?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalLocations = filters.locations?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const jdKeywords        = filters.jd_generated_keywords?.slice(0, 15) ?? [];

      // Name/email → mandatory
      const nameVal  = filters.name?.[0]?.value;
      const emailVal = filters.email?.[0]?.value;
      if (nameVal)  mandatoryKeywords.push(nameVal);
      if (emailVal) mandatoryKeywords.push(emailVal);

      const allOptional = [
        ...optionalKeywords,
        ...optionalSkills,
        ...optionalCompanies,
        ...optionalLocations,
        ...jdKeywords,
      ];

      // ── Step 1: Mandatory keyword intersection ────────────────────────────
      const mandatoryIdSet = await getMandatoryKeywordIds(mandatoryKeywords, structuralFilter);
      if (mandatoryIdSet !== null && mandatoryIdSet.size === 0) {
        return []; // No candidate satisfies all mandatory terms
      }

      // ── Step 2: Fetch candidates ──────────────────────────────────────────
      // OPTION A: Fetch ALL org candidates (q='*'), client-side rank.
      // This guarantees Python alone and Python+Django+Flask return the
      // same pool — just ranked differently by match score.
      const data = await singleSearch({
        q:         '*',
        query_by:  QUERY_BY_FIELDS,
        filter_by: structuralFilter,
        sort_by:   'created_at_ts:desc',   // recency as tiebreaker
        per_page:  MAX_PER_PAGE.toString(),
        page:      '1',
      });

      let results: CandidateSearchResult[] = (data.hits || []).map(transformHit);

      // ── Step 3: Apply mandatory keyword ID filter ─────────────────────────
      if (mandatoryIdSet !== null) {
        results = results.filter(r => mandatoryIdSet.has(r.id));
      }

      // ── Step 4: Score and sort by optional match count ────────────────────
      // Each candidate gets a relevance score based on how many optional
      // terms (and their synonyms) appear in their profile fields.
      // Title/designation matches worth 3x, skill matches 2x, others 1x.
      if (allOptional.length > 0) {
        const scored = results.map(r => ({
          r,
          score: scoreCandidate(r, allOptional),
        }));
        scored.sort((a, b) => b.score - a.score);
        results = scored.map(s => ({
          ...s.r,
          _relevance_score: Math.min(100, Math.round((s.score / (allOptional.length * 3)) * 100)),
        }));
      }

      return results;
    },
  });
}