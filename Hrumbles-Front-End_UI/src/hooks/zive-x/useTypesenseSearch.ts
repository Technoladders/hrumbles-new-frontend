// src/hooks/zive-x/useTypesenseSearch.ts  v9
//
// ═════════════════════════════════════════════════════════════════════════════
// FIXES IN v9
// ═════════════════════════════════════════════════════════════════════════════
//
// FIX 1: Skill must/nice returned 0 hits
//   v8 sent `q="react" "reactjs" "react.js"` with `query_by=skills`. Typesense
//   parses multi-quoted-phrase queries as a phrase sequence the document must
//   contain — and `skills` is a string[] facet of normalized tokens, so no
//   document literally contains the phrase "react reactjs react.js" → 0 hits.
//
//   Fix: for the SKILLS field, use Typesense's documented array-IN filter
//   syntax with synonym expansion baked in:
//       filter_by=skills:[`react`,`reactjs`,`react.js`]
//   Same approach the original v6 mandatory-skill path used (29 results, correct).
//
//   Other fields (titles, companies, keywords, prev_*, education, institutions)
//   are free-text — they keep q + query_by because users type partial words.
//
// FIX 2: 414 Request-URI Too Large on hydration
//   filter_by=id:[250 UUIDs] = ~9,300 chars in filter alone. URL > nginx's 8KB
//   header buffer → nginx returns 414 before Typesense ever sees the request.
//   Fix: hydration switched to POST /multi_search (Typesense's documented
//   endpoint that accepts the filter inside a JSON body — no URL limit).
//
// FIX 3 (companion in sidebar/page): live-mode auto-fires onSearch on empty
//   payload due to React 18 StrictMode running effects twice in dev. Guarded
//   in ZiveXSearchSidebar (skip empty buildPayload()) and ZiveXPage
//   (liveMode={hasSearched}).

import { useQuery } from '@tanstack/react-query';
import { CandidateSearchResult, SearchFilters, SearchTag } from '@/types/candidateSearch';

// ── Config ────────────────────────────────────────────────────────────────────
const TYPESENSE_URL        = 'https://search.hrumbles.ai';
const TYPESENSE_SEARCH_KEY = '84c228d38973deaf5d36f4899cc8c5522d60ba085cdf5d9df376770fccc0b122';
const MAX_PER_PAGE         = 250;
const HARD_TERM_CAP        = 5000;
const HYDRATE_BATCH        = 250;
const RESULT_DISPLAY_CAP   = 2000;

const QB = {
  KEYWORD:  'suggested_title,current_designation,current_company,previous_titles,previous_companies,skills,degree,institution,education_summary,resume_snippet',
  TITLE:    'suggested_title,current_designation',
  COMPANY:  'current_company',
  PREV_T:   'previous_titles,previous_designation',
  PREV_C:   'previous_companies,previous_company',
  DEGREE:   'degree,education_summary',
  INST:     'institution,education_summary',
  ANY:      'suggested_title,current_designation,current_company,previous_titles,previous_companies,skills,degree,institution,education_summary',
} as const;

// ── Synonyms ─────────────────────────────────────────────────────────────────
const SYNONYMS: Record<string, string[]> = {
  'react': ['reactjs', 'react.js'], 'reactjs': ['react', 'react.js'],
  'js': ['javascript'], 'javascript': ['js'],
  'node': ['nodejs', 'node.js'], 'nodejs': ['node', 'node.js'],
  'ts': ['typescript'], 'typescript': ['ts'],
  'python': ['py'],
  'ml': ['machine learning'], 'machine learning': ['ml'],
  'ai': ['artificial intelligence'], 'artificial intelligence': ['ai'],
  'k8s': ['kubernetes'], 'kubernetes': ['k8s'],
  'aws': ['amazon web services'], 'gcp': ['google cloud'], 'azure': ['microsoft azure'],
  'rn': ['react native'], 'react native': ['rn'],
  'angular': ['angularjs'], 'angularjs': ['angular'],
  'vue': ['vuejs', 'vue.js'], 'vuejs': ['vue', 'vue.js'],
  'sql': ['structured query language'],
  'devops': ['dev ops'], 'qa': ['quality assurance'], 'quality assurance': ['qa'],
  'restful': ['rest api', 'rest'], 'rest': ['restful', 'rest api'],
  'dotnet': ['.net', 'dot net'], '.net': ['dotnet', 'dot net'],
  'c#': ['csharp', 'c sharp'],
  'fullstack': ['full stack'], 'full stack': ['fullstack'],
  'frontend': ['front end', 'front-end'], 'backend': ['back end', 'back-end'],
  'mba': ['master of business administration'],
  'btech': ['bachelor of technology', 'b.tech', 'b tech'],
  'mca': ['master of computer application', 'master of computer applications'],
  'bca': ['bachelor of computer application', 'bachelor of computer applications'],
  'bsc': ['bachelor of science', 'b.sc'],
  'msc': ['master of science', 'm.sc'],
  'bcom': ['bachelor of commerce', 'b.com'],
  'mcom': ['master of commerce', 'm.com'],
  'phd': ['doctor of philosophy', 'doctorate'],
};

function expandSynonyms(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const syns  = SYNONYMS[lower] ?? [];
  return [term, ...syns].filter((v, i, a) => a.indexOf(v) === i);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function tsearch(params: Record<string, string>): Promise<any> {
  const url = new URLSearchParams(params);
  const res = await fetch(
    `${TYPESENSE_URL}/collections/candidates/documents/search?${url.toString()}`,
    { headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY } }
  );
  if (!res.ok) throw new Error(`Typesense ${res.status}: ${await res.text()}`);
  return res.json();
}

/** POST multi_search — body-based, used for hydration to avoid 414. */
async function tsearchPOST(search: Record<string, any>): Promise<any> {
  const res = await fetch(`${TYPESENSE_URL}/multi_search`, {
    method:  'POST',
    headers: {
      'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY,
      'Content-Type':        'application/json',
    },
    body: JSON.stringify({
      searches: [{ collection: 'candidates', ...search }],
    }),
  });
  if (!res.ok) throw new Error(`Typesense multi_search ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.results?.[0] ?? { hits: [], found: 0 };
}

// ── Total org count (for stats) ──────────────────────────────────────────────
async function getTotalInOrg(orgId: string): Promise<number> {
  const data = await tsearch({
    q:         '*',
    query_by:  QB.ANY,
    filter_by: `organization_id:=${orgId}`,
    per_page:  '1', page: '1',
  });
  return data.found ?? 0;
}

// ── Escape value for Typesense filter (backtick-quoted) ──────────────────────
function escFilterValue(v: string): string {
  // Replace backticks with escaped form, wrap in backticks
  return '`' + v.replace(/`/g, '\\`') + '`';
}

// ─────────────────────────────────────────────────────────────────────────────
// paginateTermText — text search for FREE-TEXT fields (titles, companies, etc)
// Paginates q=<term-with-synonyms> through Typesense.
// ─────────────────────────────────────────────────────────────────────────────
async function paginateTermText(
  term: string,
  queryBy: string,
  orgId: string,
  extraFilter?: string,
): Promise<{ ids: Set<string>; found: number; querySent: Record<string, string> }> {

  const expanded = expandSynonyms(term);
  const q = expanded.map(t => `"${t}"`).join(' ');

  const filterBy = extraFilter
    ? `organization_id:=${orgId} && ${extraFilter}`
    : `organization_id:=${orgId}`;

  const ids = new Set<string>();
  let totalFound = 0;
  let firstQuerySent: Record<string, string> = {};

  let page = 1;
  while (ids.size < HARD_TERM_CAP) {
    const params: Record<string, string> = {
      q, query_by: queryBy, filter_by: filterBy,
      per_page: MAX_PER_PAGE.toString(), page: page.toString(),
      num_typos: '1', prefix: 'true', include_fields: 'id',
    };
    if (page === 1) firstQuerySent = { ...params };
    const data = await tsearch(params);
    totalFound = data.found ?? totalFound;
    const hits = data.hits || [];
    if (hits.length === 0) break;
    for (const h of hits) {
      if (h.document?.id) ids.add(h.document.id);
      if (ids.size >= HARD_TERM_CAP) break;
    }
    if (hits.length < MAX_PER_PAGE) break;
    page++;
    if (page > 50) break;
  }

  return { ids, found: totalFound, querySent: firstQuerySent };
}

// ─────────────────────────────────────────────────────────────────────────────
// paginateArrayFilter — exact-match for ARRAY FACET fields (skills)
// Uses filter_by IN syntax with synonym expansion:
//   filter_by=skills:[`react`,`reactjs`,`react.js`]
// This is the correct Typesense syntax for "array contains any of these
// normalized tokens" and the only reliable way to match skills.
// ─────────────────────────────────────────────────────────────────────────────
async function paginateArrayFilter(
  term: string,
  fieldName: string,           // 'skills'
  orgId: string,
  extraFilter?: string,
): Promise<{ ids: Set<string>; found: number; querySent: Record<string, string> }> {

  const expanded = expandSynonyms(term).map(t => t.toLowerCase());
  const inExpr   = `${fieldName}:[${expanded.map(escFilterValue).join(',')}]`;

  const filterBy = extraFilter
    ? `organization_id:=${orgId} && ${extraFilter} && ${inExpr}`
    : `organization_id:=${orgId} && ${inExpr}`;

  const ids = new Set<string>();
  let totalFound = 0;
  let firstQuerySent: Record<string, string> = {};

  let page = 1;
  while (ids.size < HARD_TERM_CAP) {
    const params: Record<string, string> = {
      q: '*', query_by: QB.ANY, filter_by: filterBy,
      per_page: MAX_PER_PAGE.toString(), page: page.toString(),
      include_fields: 'id',
    };
    if (page === 1) firstQuerySent = { ...params };
    const data = await tsearch(params);
    totalFound = data.found ?? totalFound;
    const hits = data.hits || [];
    if (hits.length === 0) break;
    for (const h of hits) {
      if (h.document?.id) ids.add(h.document.id);
      if (ids.size >= HARD_TERM_CAP) break;
    }
    if (hits.length < MAX_PER_PAGE) break;
    page++;
    if (page > 50) break;
  }

  return { ids, found: totalFound, querySent: firstQuerySent };
}

// ── Structural filter (location/exp/ctc/notice/dates/exclude_skills) ─────────
function buildStructuralFilter(f: SearchFilters): string {
  const parts: string[] = [];

  // Excluded skills — array negation, ANDed
  f.excluded_skills?.forEach(skill => {
    const v = skill.trim().toLowerCase();
    if (v) parts.push(`skills:!=${escFilterValue(v)}`);
  });

  if (f.min_exp != null)             parts.push(`exp_years:>=${f.min_exp}`);
  if (f.max_exp != null)             parts.push(`exp_years:<=${f.max_exp}`);
  if (f.min_current_salary  != null) parts.push(`current_ctc:>=${f.min_current_salary}`);
  if (f.max_current_salary  != null) parts.push(`current_ctc:<=${f.max_current_salary}`);
  if (f.min_expected_salary != null) parts.push(`expected_ctc:>=${f.min_expected_salary}`);
  if (f.max_expected_salary != null) parts.push(`expected_ctc:<=${f.max_expected_salary}`);
  if (f.companies_count_min != null) parts.push(`companies_count:>=${f.companies_count_min}`);
  if (f.companies_count_max != null) parts.push(`companies_count:<=${f.companies_count_max}`);

  if (f.notice_periods?.length) {
    parts.push(`notice_period:[${f.notice_periods.map(escFilterValue).join(',')}]`);
  }

  // Mandatory locations — exact match (values as stored, not lowercased,
  // because current_location is indexed verbatim from DB).
  const mandLocs = f.locations?.filter(t => t.mandatory) ?? [];
  if (mandLocs.length > 0) {
    parts.push(`current_location:[${mandLocs.map(l => escFilterValue(l.value)).join(',')}]`);
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// hydrateBatch — POST /multi_search to bypass URL length limit (414 fix)
// ─────────────────────────────────────────────────────────────────────────────
async function hydrateBatch(ids: string[], orgId: string): Promise<any[]> {
  if (ids.length === 0) return [];
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += HYDRATE_BATCH) {
    const chunk = ids.slice(i, i + HYDRATE_BATCH);
    const idFilter = `id:[${chunk.join(',')}]`;
    const result = await tsearchPOST({
      q:         '*',
      query_by:  QB.ANY,
      filter_by: `organization_id:=${orgId} && ${idFilter}`,
      per_page:  chunk.length,
      page:      1,
    });
    (result.hits || []).forEach((h: any) => out.push(h));
  }
  return out;
}

// ── Transform hit → CandidateSearchResult ───────────────────────────────────
function transformHit(hit: any): CandidateSearchResult {
  const doc = hit.document;
  return {
    id:                     doc.id,
    full_name:              doc.full_name || '',
    email:                  doc.email || '',
    title:                  doc.suggested_title || doc.current_designation || '',
    source:                 'internal' as const,
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
    previous_titles:        doc.previous_titles || [],
    previous_companies:     doc.previous_companies || [],
    degree:                 doc.degree || '',
    institution:            doc.institution || '',
    companies_count:        doc.companies_count ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QueryGroup — defines one "field" of search with its match strategy
// ─────────────────────────────────────────────────────────────────────────────
type MatchStrategy = 'text' | 'array_filter';

interface QueryGroup {
  field:    string;
  /** How to match terms against the index. */
  strategy: MatchStrategy;
  /** For 'text' strategy — comma-separated Typesense query_by. */
  queryBy?: string;
  /** For 'array_filter' strategy — the array field name (e.g. 'skills'). */
  arrayField?: string;
  must:     string[];
  nice:     string[];
  exclude:  string[];
}

/**
 * Dispatcher: route a term to the right pagination function based on strategy.
 */
function runTerm(
  group: QueryGroup,
  term: string,
  orgId: string,
  extraFilter?: string,
) {
  if (group.strategy === 'array_filter' && group.arrayField) {
    return paginateArrayFilter(term, group.arrayField, orgId, extraFilter);
  }
  return paginateTermText(term, group.queryBy ?? QB.ANY, orgId, extraFilter);
}

function buildGroups(f: SearchFilters): QueryGroup[] {
  const groups: QueryGroup[] = [];

  const split = (tags?: SearchTag[]): { must: string[]; nice: string[] } => {
    if (!tags?.length) return { must: [], nice: [] };
    return {
      must: tags.filter(t =>  t.mandatory).map(t => t.value).filter(Boolean),
      nice: tags.filter(t => !t.mandatory).map(t => t.value).filter(Boolean),
    };
  };

  // Keywords — full-text across 10 fields
  const kw = split(f.keywords);
  if (kw.must.length || kw.nice.length) {
    groups.push({
      field: 'Keywords', strategy: 'text', queryBy: QB.KEYWORD,
      must: kw.must, nice: kw.nice, exclude: [],
    });
  }

  // ★ Skills — ARRAY FACET, use filter_by (not text search) ★
  const sk = split(f.skills);
  const exclSk = (f.excluded_skills ?? []).filter(s => s.trim());
  if (sk.must.length || sk.nice.length || exclSk.length) {
    groups.push({
      field: 'Skills', strategy: 'array_filter', arrayField: 'skills',
      must: sk.must, nice: sk.nice, exclude: exclSk,
    });
  }

  // Current Title — free-text
  const titleTags: SearchTag[] = [
    ...(((f as any).current_designations ?? []) as SearchTag[]),
    ...(f.current_designation ? [{ value: f.current_designation, mandatory: false }] : []),
  ];
  const tt = split(titleTags);
  if (tt.must.length || tt.nice.length) {
    groups.push({
      field: 'Current Title', strategy: 'text', queryBy: QB.TITLE,
      must: tt.must, nice: tt.nice, exclude: [],
    });
  }

  // Current Company — free-text
  const coTags: SearchTag[] = [
    ...(((f as any).current_companies ?? []) as SearchTag[]),
    ...(f.current_company ? [{ value: f.current_company, mandatory: false }] : []),
  ];
  const cc = split(coTags);
  if (cc.must.length || cc.nice.length) {
    groups.push({
      field: 'Current Company', strategy: 'text', queryBy: QB.COMPANY,
      must: cc.must, nice: cc.nice, exclude: [],
    });
  }

  // Previous Titles — free-text
  const pt = split(f.previous_titles);
  if (pt.must.length || pt.nice.length) {
    groups.push({
      field: 'Previous Titles', strategy: 'text', queryBy: QB.PREV_T,
      must: pt.must, nice: pt.nice, exclude: [],
    });
  }

  // Previous Companies — free-text
  const pc = split(f.previous_companies);
  if (pc.must.length || pc.nice.length) {
    groups.push({
      field: 'Previous Companies', strategy: 'text', queryBy: QB.PREV_C,
      must: pc.must, nice: pc.nice, exclude: [],
    });
  }

  // Education / Degree — free-text
  const degreeTags: SearchTag[] = [
    ...(((f as any).degrees ?? []) as SearchTag[]),
    ...(f.degree ? [{ value: f.degree, mandatory: false }] : []),
  ];
  const dg = split(degreeTags);
  if (dg.must.length || dg.nice.length) {
    groups.push({
      field: 'Education', strategy: 'text', queryBy: QB.DEGREE,
      must: dg.must, nice: dg.nice, exclude: [],
    });
  }

  // Institutions — free-text
  const inst = split(f.institutions);
  if (inst.must.length || inst.nice.length) {
    groups.push({
      field: 'Institutions', strategy: 'text', queryBy: QB.INST,
      must: inst.must, nice: inst.nice, exclude: [],
    });
  }

  // Companies (umbrella: any of current or previous) — free-text
  const cosUmbrella = split(f.companies);
  if (cosUmbrella.must.length || cosUmbrella.nice.length) {
    groups.push({
      field: 'Companies (any)', strategy: 'text',
      queryBy: 'current_company,previous_company,previous_companies',
      must: cosUmbrella.must, nice: cosUmbrella.nice, exclude: [],
    });
  }

  // Optional Locations (mandatory ones are in structural filter)
  const optLocs = (f.locations ?? []).filter(t => !t.mandatory).map(t => t.value);
  if (optLocs.length) {
    groups.push({
      field: 'Location (any)', strategy: 'text', queryBy: 'current_location',
      must: [], nice: optLocs, exclude: [],
    });
  }

  if (f.name?.length) {
    const names = f.name.map(t => t.value).filter(Boolean);
    if (names.length) groups.push({ field: 'Name', strategy: 'text', queryBy: 'full_name', must: names, nice: [], exclude: [] });
  }
  if (f.email?.length) {
    const emails = f.email.map(t => t.value).filter(Boolean);
    if (emails.length) groups.push({ field: 'Email', strategy: 'text', queryBy: 'email', must: emails, nice: [], exclude: [] });
  }
  if (f.jd_generated_keywords?.length) {
    groups.push({
      field: 'JD Keywords', strategy: 'text', queryBy: QB.KEYWORD,
      must: [], nice: f.jd_generated_keywords.slice(0, 15), exclude: [],
    });
  }

  return groups;
}

// ── Stats interfaces ─────────────────────────────────────────────────────────
export interface SearchStats {
  total_in_org:         number;
  structural_pool_size: number;
  mandatory_pool_size:  number;
  nice_pool_size:       number;
  excluded_count:       number;
  final_match_count:    number;
  shown_count:          number;
  field_match_breakdown: Array<{
    field:  string;
    term:   string;
    mode:   'must' | 'nice' | 'exclude';
    hits:   number;
    capped: boolean;
  }>;
  query_terms_sent: Array<{
    field:  string;
    mode:   'must' | 'nice' | 'exclude';
    term:   string;
    params: Record<string, string>;
  }>;
  timing_ms: {
    term_searches: number;
    hydration:     number;
    structural:    number;
    scoring:       number;
    total:         number;
  };
  summary: string;
}

export interface SearchResponse {
  results: CandidateSearchResult[];
  stats:   SearchStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────
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

  const queryKey = ['typesenseSearch', organizationId, JSON.stringify(filters)];

  return useQuery<SearchResponse>({
    queryKey,
    enabled:   enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResponse> => {

      const t0 = performance.now();
      const totalInOrg = await getTotalInOrg(organizationId).catch(() => 0);

      const groups           = buildGroups(filters);
      const structuralFilter = buildStructuralFilter(filters);

      const fieldBreakdown: SearchStats['field_match_breakdown'] = [];
      const queryTermsSent:  SearchStats['query_terms_sent']     = [];

      const mustGroupIdSets: Set<string>[] = [];
      const niceGroupIdSets: Set<string>[] = [];
      const excludedIds = new Set<string>();

      // ── Phase 2: per-term searches in parallel ──────────────────────────
      const tTermStart = performance.now();
      const searchTasks: Promise<void>[] = [];

      for (const g of groups) {
        for (const term of g.must) {
          searchTasks.push(
            runTerm(g, term, organizationId, structuralFilter)
              .then(({ ids, found, querySent }) => {
                mustGroupIdSets.push(ids);
                fieldBreakdown.push({
                  field: g.field, term, mode: 'must',
                  hits: found, capped: ids.size >= HARD_TERM_CAP,
                });
                queryTermsSent.push({ field: g.field, mode: 'must', term, params: querySent });
              })
              .catch(err => {
                console.error(`[zive-x] must "${term}" failed`, err);
                mustGroupIdSets.push(new Set());
              })
          );
        }
        for (const term of g.nice) {
          searchTasks.push(
            runTerm(g, term, organizationId, structuralFilter)
              .then(({ ids, found, querySent }) => {
                niceGroupIdSets.push(ids);
                fieldBreakdown.push({
                  field: g.field, term, mode: 'nice',
                  hits: found, capped: ids.size >= HARD_TERM_CAP,
                });
                queryTermsSent.push({ field: g.field, mode: 'nice', term, params: querySent });
              })
              .catch(err => {
                console.error(`[zive-x] nice "${term}" failed`, err);
                niceGroupIdSets.push(new Set());
              })
          );
        }
        // EXCLUDE — count only, don't apply structural filter (so stats reflect
        // the full pool affected). Actual exclusion is in structuralFilter.
        for (const term of g.exclude) {
          searchTasks.push(
            runTerm(g, term, organizationId)
              .then(({ ids, found, querySent }) => {
                ids.forEach(id => excludedIds.add(id));
                fieldBreakdown.push({
                  field: g.field, term, mode: 'exclude',
                  hits: found, capped: ids.size >= HARD_TERM_CAP,
                });
                queryTermsSent.push({ field: g.field, mode: 'exclude', term, params: querySent });
              })
              .catch(err => console.error(`[zive-x] exclude "${term}" failed`, err))
          );
        }
      }

      await Promise.all(searchTasks);
      const tTerm = performance.now() - tTermStart;

      // ── Phase 3: combine sets ───────────────────────────────────────────
      let mandatoryIds: Set<string> | null = null;
      if (mustGroupIdSets.length > 0) {
        mandatoryIds = new Set(mustGroupIdSets[0]);
        for (let i = 1; i < mustGroupIdSets.length; i++) {
          const next = mustGroupIdSets[i];
          mandatoryIds = new Set([...mandatoryIds].filter(id => next.has(id)));
        }
      }

      const niceIds = new Set<string>();
      niceGroupIdSets.forEach(s => s.forEach(id => niceIds.add(id)));

      const mandatoryPoolSize = mandatoryIds?.size ?? 0;
      const nicePoolSize      = niceIds.size;

      let candidateIds: Set<string>;
      if (mandatoryIds !== null) {
        candidateIds = new Set(mandatoryIds);
      } else if (niceGroupIdSets.length > 0) {
        candidateIds = new Set(niceIds);
      } else {
        candidateIds = new Set();
      }

      const excludedHits = excludedIds.size;
      excludedIds.forEach(id => candidateIds.delete(id));

      // ── Phase 4: structural pool size (for stats) + browse fallback ─────
      const tStructStart = performance.now();
      let structuralPoolSize = 0;

      if (candidateIds.size === 0 && groups.length === 0) {
        // Browse mode — no search terms, only structural filters
        const structuralOnly = structuralFilter
          ? `organization_id:=${organizationId} && ${structuralFilter}`
          : `organization_id:=${organizationId}`;
        const data = await tsearch({
          q:         '*',
          query_by:  QB.ANY,
          filter_by: structuralOnly,
          sort_by:   'created_at_ts:desc',
          per_page:  String(MAX_PER_PAGE),
          page:      '1',
        });
        structuralPoolSize = data.found ?? 0;
        (data.hits || []).forEach((h: any) => {
          if (h.document?.id) candidateIds.add(h.document.id);
        });
      } else if (structuralFilter) {
        const data = await tsearch({
          q:         '*',
          query_by:  QB.ANY,
          filter_by: `organization_id:=${organizationId} && ${structuralFilter}`,
          per_page:  '1', page: '1',
        });
        structuralPoolSize = data.found ?? 0;
      } else {
        structuralPoolSize = totalInOrg;
      }
      const tStruct = performance.now() - tStructStart;

      // ── Phase 5: hydrate (POST multi_search, bypasses URL limit) ────────
      const finalIds = [...candidateIds].slice(0, RESULT_DISPLAY_CAP);
      const tHyStart = performance.now();
      const hits     = await hydrateBatch(finalIds, organizationId);
      const tHy      = performance.now() - tHyStart;

      let results: CandidateSearchResult[] = hits.map(transformHit);

      // ── Phase 6: score ──────────────────────────────────────────────────
      const tScoreStart = performance.now();
      const mustTotal = mustGroupIdSets.length;
      const niceTotal = niceGroupIdSets.length;
      const denom     = Math.max(1, mustTotal + niceTotal);

      results = results.map(r => {
        const mustPts = mustTotal;
        let nicePts = 0;
        for (const s of niceGroupIdSets) if (s.has(r.id)) nicePts++;
        const score = Math.round(((mustPts + nicePts) / denom) * 100);
        return { ...r, _relevance_score: score };
      });
      results.sort((a, b) => (b._relevance_score ?? 0) - (a._relevance_score ?? 0));
      const tScore = performance.now() - tScoreStart;

      // ── Phase 7: stats ──────────────────────────────────────────────────
      const tTotal = performance.now() - t0;
      const summary = (() => {
        if (groups.length === 0) {
          return `Showing ${results.length.toLocaleString()} of ${structuralPoolSize.toLocaleString()} candidates (no search terms — browsing structural matches)`;
        }
        const must = fieldBreakdown.filter(b => b.mode === 'must').length;
        const nice = fieldBreakdown.filter(b => b.mode === 'nice').length;
        const excl = fieldBreakdown.filter(b => b.mode === 'exclude').length;
        return `Searched ${totalInOrg.toLocaleString()} candidates · ${must} must · ${nice} nice · ${excl} excluded → ${results.length.toLocaleString()} matched`;
      })();

      const stats: SearchStats = {
        total_in_org:         totalInOrg,
        structural_pool_size: structuralPoolSize,
        mandatory_pool_size:  mandatoryPoolSize,
        nice_pool_size:       nicePoolSize,
        excluded_count:       excludedHits,
        final_match_count:    candidateIds.size,
        shown_count:          results.length,
        field_match_breakdown: fieldBreakdown,
        query_terms_sent:      queryTermsSent,
        timing_ms: {
          term_searches: Math.round(tTerm),
          hydration:     Math.round(tHy),
          structural:    Math.round(tStruct),
          scoring:       Math.round(tScore),
          total:         Math.round(tTotal),
        },
        summary,
      };

      return { results, stats };
    },
  });
}
// new keyword advanced