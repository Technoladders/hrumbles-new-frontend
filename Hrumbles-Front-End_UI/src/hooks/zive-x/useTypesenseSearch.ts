// src/hooks/zive-x/useTypesenseSearch.ts  v6
//
// Changes vs v5:
//  • Handles current_designations[] / current_companies[] / degrees[] arrays (v4 sidebar)
//  • filter_by uses OR logic for multi-value arrays
//  • scoreCandidate also accounts for degree/institution matches
//  • No other logic changed

import { useQuery } from '@tanstack/react-query';
import { CandidateSearchResult, SearchFilters } from '@/types/candidateSearch';

const TYPESENSE_URL        = 'https://search.hrumbles.ai';
const TYPESENSE_SEARCH_KEY = '84c228d38973deaf5d36f4899cc8c5522d60ba085cdf5d9df376770fccc0b122';
const QUERY_BY_FIELDS  = 'suggested_title,current_designation,current_company,previous_titles,previous_companies,skills,degree,institution,education_summary,resume_snippet';
const QUERY_BY_WEIGHTS = '10,9,8,7,6,5,4,3,2,1';
const MAX_PER_PAGE = 250;

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

async function singleSearch(params: Record<string, string>): Promise<any> {
  const url = new URLSearchParams(params);
  const res = await fetch(
    `${TYPESENSE_URL}/collections/candidates/documents/search?${url.toString()}`,
    { headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY } }
  );
  if (!res.ok) throw new Error(`Typesense ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Build structural filter_by ────────────────────────────────────────────────
function buildStructuralFilterBy(f: SearchFilters, orgId: string): string {
  const parts: string[] = [`organization_id:=${orgId}`];

  // Mandatory skills (hard filter)
  f.skills?.filter(t => t.mandatory).forEach(t => {
    parts.push(`skills:=${t.value.toLowerCase()}`);
  });

  // Excluded skills
  f.excluded_skills?.forEach(skill => {
    if (skill.trim()) parts.push(`skills:!=${skill.trim().toLowerCase()}`);
  });

  // Mandatory locations
  const mandLocs = f.locations?.filter(t => t.mandatory) ?? [];
  if (mandLocs.length > 0) {
    const locs = mandLocs.map(l => `\`${esc(l.value.toLowerCase())}\``).join(',');
    parts.push(`current_location:[${locs}]`);
  }

  // Mandatory companies (from companies[] tags)
  f.companies?.filter(t => t.mandatory).forEach(t => {
    parts.push(`(current_company:\`${esc(t.value)}\` || previous_company:\`${esc(t.value)}\`)`);
  });

  // ── current_designation: multi-array (v4) OR legacy single ───────────────
  // Mandatory title tags → AND each one
  const titleTags = (f as any).current_designations ?? [];
  const mandTitles = titleTags.filter((t: any) => t.mandatory);
  mandTitles.forEach((t: any) => {
    if (t.value.trim()) parts.push(`current_designation:\`${esc(t.value.trim())}\``);
  });
  // Legacy single (only if no multi-array)
  if (titleTags.length === 0 && f.current_designation) {
    parts.push(`current_designation:\`${esc(f.current_designation)}\``);
  }

  // ── current_company: multi-array (v4) OR legacy single ───────────────────
  const companyTags = (f as any).current_companies ?? [];
  const mandCompanies = companyTags.filter((t: any) => t.mandatory);
  mandCompanies.forEach((t: any) => {
    if (t.value.trim()) parts.push(`current_company:\`${esc(t.value.trim())}\``);
  });
  if (companyTags.length === 0 && f.current_company) {
    parts.push(`current_company:\`${esc(f.current_company)}\``);
  }

  // ── Previous titles (mandatory) ───────────────────────────────────────────
  f.previous_titles?.filter(t => t.mandatory).forEach(t => {
    if (t.value.trim()) parts.push(`previous_titles:\`${esc(t.value.trim())}\``);
  });

  // ── Previous companies (mandatory) ────────────────────────────────────────
  f.previous_companies?.filter(t => t.mandatory).forEach(t => {
    if (t.value.trim()) parts.push(`previous_companies:\`${esc(t.value.trim())}\``);
  });

  // ── Degree: multi-array (v4) — mandatory only in filter_by ───────────────
  const degreeTags = (f as any).degrees ?? [];
  const mandDegrees = degreeTags.filter((t: any) => t.mandatory);
  mandDegrees.forEach((t: any) => {
    if (t.value.trim()) parts.push(`degree:\`${esc(t.value.trim())}\``);
  });
  // Legacy single degree (only if no multi-array)
  if (degreeTags.length === 0 && f.degree) {
    parts.push(`degree:\`${esc(f.degree)}\``);
  }

  // Companies count range
  if (f.companies_count_min != null) parts.push(`companies_count:>=${f.companies_count_min}`);
  if (f.companies_count_max != null) parts.push(`companies_count:<=${f.companies_count_max}`);

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
async function getMandatoryKeywordIds(
  keywords: string[],
  filterBy: string,
): Promise<Set<string> | null> {
  if (keywords.length === 0) return null;
  const searches = keywords.map(kw => {
    const expanded = expandWithSynonyms(kw);
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
  const results = await Promise.all(searches);
  const idSets  = results.map(d => new Set<string>((d.hits || []).map((h: any) => h.document.id as string)));
  if (idSets.length === 0) return new Set<string>();
  let intersection = idSets[0];
  for (let i = 1; i < idSets.length; i++) {
    intersection = new Set([...intersection].filter(id => idSets[i].has(id)));
  }
  return intersection;
}

// ── Transform hit → CandidateSearchResult ─────────────────────────────────────
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
    // Phase 2
    previous_titles:        doc.previous_titles || [],
    previous_companies:     doc.previous_companies || [],
    degree:                 doc.degree || '',
    institution:            doc.institution || '',
    companies_count:        doc.companies_count ?? 0,
  };
}

// ── Client-side scoring ───────────────────────────────────────────────────────
function scoreCandidate(r: CandidateSearchResult, optionalTerms: string[]): number {
  if (optionalTerms.length === 0) return 0;

  const titleText      = [r.title, r.current_designation].join(' ').toLowerCase();
  const skillText      = (r.key_skills ?? []).join(' ').toLowerCase();
  const prevTitleText  = (r.previous_titles ?? []).join(' ').toLowerCase();
  const prevCoText     = (r.previous_companies ?? []).join(' ').toLowerCase();
  const eduText        = [r.degree, r.institution, r.education_summary].join(' ').toLowerCase();

  const bigText = [
    titleText, skillText, prevTitleText, prevCoText, eduText,
    r.current_company, r.previous_company ?? '',
    r.previous_designation ?? '', r.current_location ?? '',
  ].join(' ').toLowerCase();

  let score = 0;
  for (const term of optionalTerms) {
    const variants = expandWithSynonyms(term);
    for (const variant of variants) {
      const v = variant.toLowerCase();
      if      (titleText.includes(v))     { score += 3; break; }
      else if (skillText.includes(v))     { score += 2; break; }
      else if (prevTitleText.includes(v)) { score += 2; break; }
      else if (prevCoText.includes(v))    { score += 2; break; }
      else if (eduText.includes(v))       { score += 2; break; }
      else if (bigText.includes(v))       { score += 1; break; }
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

      const mandatoryKeywords = filters.keywords?.filter(t => t.mandatory).map(t => t.value) ?? [];
      const optionalKeywords  = filters.keywords?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalSkills    = filters.skills?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalCompanies = filters.companies?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optionalLocations = filters.locations?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const jdKeywords        = filters.jd_generated_keywords?.slice(0, 15) ?? [];

      // ── NEW: optional multi-array fields for scoring ──────────────────────
      // current_designations (optional ones only) → add to scoring terms
      const optTitles   = ((filters as any).current_designations ?? [])
        .filter((t: any) => !t.mandatory).map((t: any) => t.value as string);
      // current_companies (optional)
      const optCompanies2 = ((filters as any).current_companies ?? [])
        .filter((t: any) => !t.mandatory).map((t: any) => t.value as string);
      // degrees (optional) → add to scoring
      const optDegrees  = ((filters as any).degrees ?? [])
        .filter((t: any) => !t.mandatory).map((t: any) => t.value as string);

      const optPrevTitles = filters.previous_titles?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optPrevCos    = filters.previous_companies?.filter(t => !t.mandatory).map(t => t.value) ?? [];
      const optInstit     = filters.institutions?.filter(t => !t.mandatory).map(t => t.value) ?? [];

      const nameVal  = filters.name?.[0]?.value;
      const emailVal = filters.email?.[0]?.value;
      if (nameVal)  mandatoryKeywords.push(nameVal);
      if (emailVal) mandatoryKeywords.push(emailVal);

      const allOptional = [
        ...optionalKeywords, ...optionalSkills,
        ...optionalCompanies, ...optionalLocations,
        ...jdKeywords,
        ...optPrevTitles, ...optPrevCos, ...optInstit,
        // NEW: include optional multi-value fields in scoring
        ...optTitles, ...optCompanies2, ...optDegrees,
      ];

      // Step 1: mandatory keyword intersection
      const mandatoryIdSet = await getMandatoryKeywordIds(mandatoryKeywords, structuralFilter);
      if (mandatoryIdSet !== null && mandatoryIdSet.size === 0) return [];

      // Step 2: fetch all org candidates passing structural filters
      const data = await singleSearch({
        q:         '*',
        query_by:  QUERY_BY_FIELDS,
        filter_by: structuralFilter,
        sort_by:   'created_at_ts:desc',
        per_page:  MAX_PER_PAGE.toString(),
        page:      '1',
      });

      let results: CandidateSearchResult[] = (data.hits || []).map(transformHit);

      // Step 3: apply mandatory keyword filter
      if (mandatoryIdSet !== null) {
        results = results.filter(r => mandatoryIdSet.has(r.id));
      }

      // Step 4: score + normalise
      if (allOptional.length > 0) {
        const scored = results.map(r => ({
          r,
          score: scoreCandidate(r, allOptional),
        }));
        scored.sort((a, b) => b.score - a.score);
        const topScore = scored[0]?.score ?? 0;
        results = scored.map(s => ({
          ...s.r,
          _relevance_score: topScore > 0
            ? Math.round((s.score / topScore) * 100)
            : 100,
        }));
      } else if (mandatoryKeywords.length > 0) {
        results = results.map(r => ({ ...r, _relevance_score: 100 }));
      }

      return results;
    },
  });
}
