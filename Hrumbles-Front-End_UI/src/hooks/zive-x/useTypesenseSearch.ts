// src/hooks/zive-x/useTypesenseSearch.ts  v10
//
// ═════════════════════════════════════════════════════════════════════════════
// WHAT EACH FIELD SEARCHES
// ═════════════════════════════════════════════════════════════════════════════
//
// Keywords  → HYBRID:
//               Branch A — text search on all TEXT fields (titles, companies,
//                           education_summary, resume_full_text). NO skills here.
//               Branch B — skills[] array filter (same synonym expansion as
//                           the Skills field). This catches every candidate
//                           who has the term as a skill tag even if it never
//                           appears in their prose resume.
//               Result = A ∪ B  (union, deduplicated by ID)
//
// Skills    → array_filter: filter_by=skills:[`react`,`reactjs`,`react.js`]
//               Uses the FACET INDEX (verbatim exact match). Reliable.
//               TEXT search on string[] facet field is broken in Typesense.
//
// Title     → text: query_by=suggested_title,current_designation
// Company   → text: query_by=current_company
// PrevTitle → text: query_by=previous_titles,previous_designation
// PrevCo    → text: query_by=previous_companies,previous_company
// Education → text: query_by=degree,education_summary
// Inst.     → text: query_by=institution,education_summary
// Location  → must → structural filter_by; nice → text query_by=current_location
// Exp/CTC/NP → structural filter_by (numeric/enum ranges, always applied)
//
// ═════════════════════════════════════════════════════════════════════════════
// RESUME TEXT
// ═════════════════════════════════════════════════════════════════════════════
//
// Typesense field: resume_full_text (store:false, index:true)
// Populated by: resume_text[:100_000] in transform_record()
// Requires: indexer.py v2.2 — see INDEXER CHANGES section below
//
// Before v2.2 the field was resume_snippet (only 2000 chars).
// After  v2.2 the full field covers up to 100KB — essentially every resume.
//
// INDEXER CHANGES REQUIRED (sync_service/indexer.py):
//   1. In transform_record():
//      OLD: resume_snippet = resume_text[:2000].strip()
//      NEW: resume_full_text = resume_text[:100_000].strip()
//           (rename field + increase limit)
//
//   2. In COLLECTION_SCHEMA, rename/add field:
//      OLD: {"name": "resume_snippet", "type": "string", "optional": True, "index": True, "store": False}
//      NEW: {"name": "resume_full_text", "type": "string", "optional": True, "index": True, "store": False}
//
//   3. In run_full_reindex() SELECT_FIELDS, add resume_text to the query:
//      OLD: "...created_at,work_experience,education"
//      NEW: "...created_at,work_experience,education,resume_text"
//
//   4. Run POST /reindex admin call after deploying indexer.py v2.2
//
// ═════════════════════════════════════════════════════════════════════════════
// SPECIAL CHARACTER TERMS (.net, c#, c++, react.js, next.js)
// ═════════════════════════════════════════════════════════════════════════════
//
// Typesense schema has token_separators: [".", "+", "#"]
// These chars are stripped at tokenization time, which breaks text search:
//   c++  → token "c"       (useless, matches everything starting with c)
//   c#   → token "c"       (same)
//   .net → token "net"     (matches Internet, network, etc. — too broad)
//
// Strategy: expandSynonyms() returns SPLIT object:
//   { textTerms, filterTerms }
//   textTerms  — safe for q= (special chars removed or substituted)
//   filterTerms — safe for filter_by=skills:[...] (exact stored values)
//
// ═════════════════════════════════════════════════════════════════════════════
// DEBUGGING
// ═════════════════════════════════════════════════════════════════════════════
//
// DEBUG is enabled automatically in development (NODE_ENV != 'production').
// Each Typesense request is logged with:
//   [ZiveX] [phase] [field] [term] [mode]
//     params: { q, query_by, filter_by, per_page, page }
//     result: { found, fetched_ids, duration_ms }
//
// Each set-combination step is logged:
//   [ZiveX] SET-OPS  mustGroups:N  niceGroups:N  excluded:N  → candidateIds:N
//
// Errors include the full Typesense response body.
// All logs are collapsed groups — expand in DevTools when investigating a bug.

import { useQuery } from '@tanstack/react-query';
import { CandidateSearchResult, SearchFilters, SearchTag } from '@/types/candidateSearch';

// ── Config ────────────────────────────────────────────────────────────────────
const TYPESENSE_URL        = 'https://search.hrumbles.ai';
const TYPESENSE_SEARCH_KEY = '84c228d38973deaf5d36f4899cc8c5522d60ba085cdf5d9df376770fccc0b122';
const MAX_PER_PAGE         = 250;
const HARD_TERM_CAP        = 5000;
const HYDRATE_BATCH        = 250;
const RESULT_DISPLAY_CAP   = 2000;

// ── Debug flag — auto-enabled in dev, disable in prod ───────────────────────
// Vite exposes import.meta.env.MODE; fallback to true (shows logs in dev).
const DEBUG = typeof window !== 'undefined'
  ? (import.meta as any)?.env?.MODE !== 'production'
  : true;

function zxLog(phase: string, detail: Record<string, any>) {
  if (!DEBUG) return;
  const label = `%c[ZiveX:${phase}]`;
  const style  = 'color:#7C3AED;font-weight:bold;font-family:monospace';
  console.groupCollapsed(label, style, detail.term ? `"${detail.term}"` : '');
  Object.entries(detail).forEach(([k, v]) => console.log(`  ${k}:`, v));
  console.groupEnd();
}

function zxError(phase: string, term: string, error: unknown) {
  console.error(`[ZiveX:ERROR] phase="${phase}" term="${term}"`, error);
}

// ── query_by field sets ───────────────────────────────────────────────────────

// Keyword Branch A — all TEXT fields. NO skills (unreliable text search on
// string[] facet). resume_full_text (indexed with up to 100KB of resume prose).
const QB_KEYWORD_TEXT =
  'suggested_title,current_designation,current_company,' +
  'previous_titles,previous_companies,previous_designation,previous_company,' +
  'education_summary,resume_full_text';

// Individual field query_by strings
const QB = {
  TITLE:   'suggested_title,current_designation',
  COMPANY: 'current_company',
  PREV_T:  'previous_titles,previous_designation',
  PREV_C:  'previous_companies,previous_company',
  DEGREE:  'degree,education_summary',
  INST:    'institution,education_summary',
  LOC:     'current_location',
  // Used only for hydration q=* call
  ANY: 'suggested_title,current_designation,current_company,' +
       'previous_titles,previous_companies,education_summary,resume_full_text',
} as const;

// ── Synonym expansion — split into textTerms and filterTerms ─────────────────
//
// textTerms:   safe for q= (no special chars, tokenizer-friendly)
// filterTerms: safe for filter_by=skills:[...] (exact stored values)
//
interface ExpandedTerms {
  textTerms:   string[];
  filterTerms: string[];
}

// Map: input lowercase → { textTerms, filterTerms }
const SPECIAL: Record<string, ExpandedTerms> = {
  // .NET
  '.net':   { textTerms: ['dotnet', 'net framework', 'asp net', 'aspnet'], filterTerms: ['.net', 'dotnet', 'asp.net', 'aspnet', 'dot net'] },
  'dotnet': { textTerms: ['dotnet', 'net framework', 'asp net'],           filterTerms: ['.net', 'dotnet', 'asp.net', 'aspnet'] },
  'asp.net':{ textTerms: ['asp net', 'aspnet', 'dotnet'],                  filterTerms: ['asp.net', 'aspnet', '.net', 'dotnet'] },

  // C# / C-sharp
  'c#':     { textTerms: ['csharp', 'c sharp'],                            filterTerms: ['c#', 'csharp', 'c sharp'] },
  'csharp': { textTerms: ['csharp', 'c sharp'],                            filterTerms: ['c#', 'csharp', 'c sharp'] },

  // C++
  'c++':    { textTerms: ['cpp', 'c plus plus'],                           filterTerms: ['c++', 'cpp', 'cplusplus'] },
  'cpp':    { textTerms: ['cpp', 'c plus plus'],                           filterTerms: ['c++', 'cpp', 'cplusplus'] },

  // React variants
  'react':    { textTerms: ['react', 'reactjs'],                           filterTerms: ['react', 'reactjs', 'react.js'] },
  'reactjs':  { textTerms: ['reactjs', 'react'],                           filterTerms: ['reactjs', 'react', 'react.js'] },
  'react.js': { textTerms: ['react', 'reactjs'],                           filterTerms: ['react.js', 'react', 'reactjs'] },
  'react js': { textTerms: ['react', 'reactjs'],                           filterTerms: ['react.js', 'react', 'reactjs'] },

  // Next.js
  'next':    { textTerms: ['next', 'nextjs'],                              filterTerms: ['next', 'nextjs', 'next.js'] },
  'nextjs':  { textTerms: ['nextjs', 'next'],                              filterTerms: ['nextjs', 'next', 'next.js'] },
  'next.js': { textTerms: ['next', 'nextjs'],                              filterTerms: ['next.js', 'nextjs', 'next'] },
  'next js': { textTerms: ['next', 'nextjs'],                              filterTerms: ['next.js', 'nextjs', 'next'] },

  // Node.js
  'node':    { textTerms: ['node', 'nodejs'],                              filterTerms: ['node', 'nodejs', 'node.js'] },
  'nodejs':  { textTerms: ['nodejs', 'node'],                              filterTerms: ['nodejs', 'node', 'node.js'] },
  'node.js': { textTerms: ['node', 'nodejs'],                              filterTerms: ['node.js', 'nodejs', 'node'] },

  // Vue.js
  'vue':    { textTerms: ['vue', 'vuejs'],                                 filterTerms: ['vue', 'vuejs', 'vue.js'] },
  'vuejs':  { textTerms: ['vuejs', 'vue'],                                 filterTerms: ['vuejs', 'vue', 'vue.js'] },
  'vue.js': { textTerms: ['vue', 'vuejs'],                                 filterTerms: ['vue.js', 'vuejs', 'vue'] },

  // Angular
  'angular':   { textTerms: ['angular', 'angularjs'],                     filterTerms: ['angular', 'angularjs', 'angular.js'] },
  'angularjs': { textTerms: ['angularjs', 'angular'],                     filterTerms: ['angularjs', 'angular', 'angular.js'] },

  // React Native
  'react native': { textTerms: ['react native', 'react-native', 'rn'],   filterTerms: ['react native', 'react-native', 'rn'] },
  'rn':           { textTerms: ['rn', 'react native'],                    filterTerms: ['rn', 'react native', 'react-native'] },

  // TypeScript / JavaScript
  'typescript': { textTerms: ['typescript', 'ts'],                        filterTerms: ['typescript', 'ts'] },
  'ts':         { textTerms: ['ts', 'typescript'],                        filterTerms: ['ts', 'typescript'] },
  'javascript': { textTerms: ['javascript', 'js'],                        filterTerms: ['javascript', 'js'] },
  'js':         { textTerms: ['js', 'javascript'],                        filterTerms: ['js', 'javascript'] },

  // Python
  'python': { textTerms: ['python', 'py'],                                filterTerms: ['python', 'py'] },
  'py':     { textTerms: ['py', 'python'],                                filterTerms: ['py', 'python'] },

  // ML / AI
  'machine learning': { textTerms: ['machine learning', 'ml'],           filterTerms: ['machine learning', 'ml'] },
  'ml':               { textTerms: ['ml', 'machine learning'],           filterTerms: ['ml', 'machine learning'] },
  'artificial intelligence': { textTerms: ['artificial intelligence','ai'], filterTerms: ['artificial intelligence','ai'] },
  'ai': { textTerms: ['ai', 'artificial intelligence'],                  filterTerms: ['ai', 'artificial intelligence'] },
  'deep learning': { textTerms: ['deep learning', 'dl'],                 filterTerms: ['deep learning', 'dl'] },
  'nlp': { textTerms: ['nlp', 'natural language processing'],            filterTerms: ['nlp', 'natural language processing'] },
  'natural language processing': { textTerms: ['nlp','natural language processing'], filterTerms: ['nlp','natural language processing'] },

  // DevOps / Cloud
  'kubernetes': { textTerms: ['kubernetes', 'k8s'],                      filterTerms: ['kubernetes', 'k8s'] },
  'k8s':        { textTerms: ['k8s', 'kubernetes'],                      filterTerms: ['k8s', 'kubernetes'] },
  'aws':        { textTerms: ['aws', 'amazon web services'],             filterTerms: ['aws', 'amazon web services'] },
  'gcp':        { textTerms: ['gcp', 'google cloud'],                    filterTerms: ['gcp', 'google cloud'] },
  'azure':      { textTerms: ['azure', 'microsoft azure'],               filterTerms: ['azure', 'microsoft azure'] },
  'devops':     { textTerms: ['devops', 'dev ops'],                      filterTerms: ['devops', 'dev ops'] },

  // REST / GraphQL
  'rest':    { textTerms: ['rest', 'restful'],                           filterTerms: ['rest', 'restful'] },
  'restful': { textTerms: ['restful', 'rest'],                           filterTerms: ['restful', 'rest'] },

  // Fullstack
  'fullstack':  { textTerms: ['fullstack', 'full stack'],                filterTerms: ['fullstack', 'full stack', 'full-stack'] },
  'full stack': { textTerms: ['full stack', 'fullstack'],                filterTerms: ['full stack', 'fullstack', 'full-stack'] },

  // Frontend / Backend
  'frontend':  { textTerms: ['frontend', 'front end'],                  filterTerms: ['frontend', 'front end', 'front-end'] },
  'backend':   { textTerms: ['backend', 'back end'],                    filterTerms: ['backend', 'back end', 'back-end'] },

  // iOS / Android
  'ios':     { textTerms: ['ios', 'swift'],                             filterTerms: ['ios', 'swift', 'objective-c'] },
  'android': { textTerms: ['android', 'kotlin'],                        filterTerms: ['android', 'kotlin'] },

  // Education abbreviations
  'mba':  { textTerms: ['mba', 'master of business administration'],    filterTerms: ['mba', 'm.b.a', 'master of business administration'] },
  'btech':{ textTerms: ['btech', 'bachelor of technology', 'b tech'],  filterTerms: ['btech', 'b.tech', 'b tech', 'bachelor of technology'] },
  'mtech':{ textTerms: ['mtech', 'master of technology'],              filterTerms: ['mtech', 'm.tech', 'master of technology'] },
  'mca':  { textTerms: ['mca', 'master of computer application'],      filterTerms: ['mca', 'master of computer application'] },
  'bca':  { textTerms: ['bca', 'bachelor of computer application'],    filterTerms: ['bca', 'bachelor of computer application'] },
  'bsc':  { textTerms: ['bsc', 'bachelor of science'],                 filterTerms: ['bsc', 'b.sc', 'bachelor of science'] },
  'msc':  { textTerms: ['msc', 'master of science'],                   filterTerms: ['msc', 'm.sc', 'master of science'] },
  'be':   { textTerms: ['be', 'bachelor of engineering'],              filterTerms: ['be', 'b.e', 'bachelor of engineering'] },
  'me':   { textTerms: ['me', 'master of engineering'],                filterTerms: ['me', 'm.e', 'master of engineering'] },
  'phd':  { textTerms: ['phd', 'doctor of philosophy', 'doctorate'],   filterTerms: ['phd', 'ph.d', 'doctor of philosophy', 'doctorate'] },
};

function expandSynonyms(term: string): ExpandedTerms {
  const lower = term.toLowerCase().trim();
  if (SPECIAL[lower]) return SPECIAL[lower];
  // Generic: same terms for both (no special chars in this term)
  return { textTerms: [term], filterTerms: [term] };
}

// Deduplicate arrays, preserve order, lowercase for filterTerms
function dedup(arr: string[]): string[]     { return [...new Set(arr)]; }
function dedupLo(arr: string[]): string[]  { return [...new Set(arr.map(v => v.toLowerCase()))]; }

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function tsearch(params: Record<string, string>): Promise<any> {
  const url = new URLSearchParams(params);
  const res = await fetch(
    `${TYPESENSE_URL}/collections/candidates/documents/search?${url.toString()}`,
    { headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Typesense ${res.status} — ${body}`);
  }
  return res.json();
}

/** POST /multi_search — used for hydration to avoid 414 URL-too-large. */
async function tsearchPOST(search: Record<string, any>): Promise<any> {
  const res = await fetch(`${TYPESENSE_URL}/multi_search`, {
    method: 'POST',
    headers: {
      'X-TYPESENSE-API-KEY': TYPESENSE_SEARCH_KEY,
      'Content-Type':        'application/json',
    },
    body: JSON.stringify({ searches: [{ collection: 'candidates', ...search }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Typesense multi_search ${res.status} — ${body}`);
  }
  const data = await res.json();
  return data.results?.[0] ?? { hits: [], found: 0 };
}

/** Fire-and-forget org total (stats only — never blocks search results). */
async function getTotalInOrg(orgId: string): Promise<number> {
  try {
    const t = Date.now();
    const data = await tsearch({
      q: '*', query_by: QB.ANY,
      filter_by: `organization_id:=${orgId}`,
      per_page: '1', page: '1',
    });
    zxLog('getTotalInOrg', { orgId, found: data.found, ms: Date.now() - t });
    return data.found ?? 0;
  } catch (e) {
    zxError('getTotalInOrg', orgId, e);
    return 0;
  }
}

// ── Escape value for Typesense filter backtick-quoting ───────────────────────
function esc(v: string): string { return '`' + v.replace(/`/g, '\\`') + '`'; }

// ── Structural filter (exp / ctc / notice / location / dates / excl skills) ──
function buildStructuralFilter(f: SearchFilters): string {
  const parts: string[] = [];

  f.excluded_skills?.forEach(s => {
    const v = s.trim().toLowerCase();
    if (v) parts.push(`skills:!=${esc(v)}`);
  });

  if (f.min_exp != null)             parts.push(`exp_years:>=${f.min_exp}`);
  if (f.max_exp != null)             parts.push(`exp_years:<=${f.max_exp}`);
  if (f.min_current_salary  != null) parts.push(`current_ctc:>=${f.min_current_salary}`);
  if (f.max_current_salary  != null) parts.push(`current_ctc:<=${f.max_current_salary}`);
  if (f.min_expected_salary != null) parts.push(`expected_ctc:>=${f.min_expected_salary}`);
  if (f.max_expected_salary != null) parts.push(`expected_ctc:<=${f.max_expected_salary}`);
  if (f.companies_count_min != null) parts.push(`companies_count:>=${f.companies_count_min}`);
  if (f.companies_count_max != null) parts.push(`companies_count:<=${f.companies_count_max}`);

  if (f.notice_periods?.length)
    parts.push(`notice_period:[${f.notice_periods.map(esc).join(',')}]`);

  const mandLocs = f.locations?.filter(t => t.mandatory) ?? [];
  if (mandLocs.length)
    parts.push(`current_location:[${mandLocs.map(l => esc(l.value)).join(',')}]`);

  if (f.date_posted && f.date_posted !== 'all_time') {
    const now = Math.floor(Date.now() / 1000);
    const deltas: Record<string, number> = {
      last_24_hours: 86400, last_7_days: 604800,
      last_14_days: 1209600, last_30_days: 2592000,
    };
    const d = deltas[f.date_posted];
    if (d) parts.push(`created_at_ts:>=${now - d}`);
  }

  return parts.join(' && ');
}

// ─────────────────────────────────────────────────────────────────────────────
// paginateTermText — text search (titles, companies, resume, education fields)
// ─────────────────────────────────────────────────────────────────────────────
async function paginateTermText(
  term: string,
  queryBy: string,
  orgId: string,
  extraFilter?: string,
): Promise<{ ids: Set<string>; found: number; querySent: Record<string, string> }> {
  const { textTerms } = expandSynonyms(term);
  const q         = dedup(textTerms).map(t => `"${t}"`).join(' ');
  const filterBy  = extraFilter
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

    const tReq = Date.now();
    const data  = await tsearch(params);
    const msReq = Date.now() - tReq;

    totalFound  = data.found ?? totalFound;
    const hits  = data.hits || [];

    zxLog('paginateText', {
      term, queryBy: queryBy.split(',')[0] + '...', mode: 'text',
      page, found: data.found, fetched: hits.length, ms: msReq,
      q: params.q,
    });

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
// paginateArrayFilter — exact-match for skills[] (faceted array)
// filter_by=skills:[`react`,`reactjs`,`react.js`]
// ─────────────────────────────────────────────────────────────────────────────
async function paginateArrayFilter(
  term: string,
  fieldName: string,
  orgId: string,
  extraFilter?: string,
): Promise<{ ids: Set<string>; found: number; querySent: Record<string, string> }> {
  const { filterTerms } = expandSynonyms(term);
  const inExpr   = `${fieldName}:[${dedupLo(filterTerms).map(esc).join(',')}]`;
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

    const tReq = Date.now();
    const data  = await tsearch(params);
    const msReq = Date.now() - tReq;

    totalFound = data.found ?? totalFound;
    const hits = data.hits || [];

    zxLog('paginateFilter', {
      term, fieldName, mode: 'filter',
      page, found: data.found, fetched: hits.length, ms: msReq,
      filterExpr: inExpr,
    });

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
// paginateHybrid — KEYWORD strategy
//   Branch A: text search on text fields (resume_full_text + titles + companies)
//   Branch B: skills[] array filter
//   Result:   A ∪ B
// ─────────────────────────────────────────────────────────────────────────────
async function paginateHybrid(
  term: string,
  orgId: string,
  extraFilter?: string,
): Promise<{ ids: Set<string>; found: number; querySent: Record<string, string> }> {
  const tBranch = Date.now();

  const [textResult, skillResult] = await Promise.all([
    paginateTermText(term, QB_KEYWORD_TEXT, orgId, extraFilter),
    paginateArrayFilter(term, 'skills', orgId, extraFilter),
  ]);

  const unionIds = new Set([...textResult.ids, ...skillResult.ids]);

  zxLog('hybrid', {
    term,
    textBranch:  { found: textResult.found,  ids: textResult.ids.size },
    skillBranch: { found: skillResult.found, ids: skillResult.ids.size },
    union:        unionIds.size,
    ms:           Date.now() - tBranch,
  });

  return {
    ids:        unionIds,
    // found = union size (approximate — overlap unknown without full enumeration)
    found:      unionIds.size,
    querySent:  {
      textBranch:  textResult.querySent,
      skillBranch: skillResult.querySent,
    } as any,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// hydrateBatch — POST /multi_search to avoid 414 URL-too-large
// ─────────────────────────────────────────────────────────────────────────────
async function hydrateBatch(ids: string[], orgId: string): Promise<any[]> {
  if (ids.length === 0) return [];
  const out: any[] = [];
  const batches = Math.ceil(ids.length / HYDRATE_BATCH);

  for (let b = 0; b < batches; b++) {
    const chunk  = ids.slice(b * HYDRATE_BATCH, (b + 1) * HYDRATE_BATCH);
    const idFilter = `id:[${chunk.join(',')}]`;
    const tReq = Date.now();

    const result = await tsearchPOST({
      q:         '*',
      query_by:  QB.ANY,
      filter_by: `organization_id:=${orgId} && ${idFilter}`,
      per_page:  chunk.length,
      page:      1,
    });

    zxLog('hydrate', {
      batch: `${b + 1}/${batches}`, chunkSize: chunk.length,
      returned: result.hits?.length ?? 0, ms: Date.now() - tReq,
    });

    (result.hits || []).forEach((h: any) => out.push(h));
  }
  return out;
}

// ── Transform hit ─────────────────────────────────────────────────────────────
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
// QueryGroup
// ─────────────────────────────────────────────────────────────────────────────
type MatchStrategy = 'hybrid' | 'text' | 'array_filter';

interface QueryGroup {
  field:       string;
  strategy:    MatchStrategy;
  queryBy?:    string;       // for 'text'
  arrayField?: string;       // for 'array_filter'
  must:        string[];
  nice:        string[];
  exclude:     string[];
}

function runTerm(
  g: QueryGroup, term: string, orgId: string, extraFilter?: string,
) {
  switch (g.strategy) {
    case 'hybrid':
      return paginateHybrid(term, orgId, extraFilter);
    case 'array_filter':
      return paginateArrayFilter(term, g.arrayField ?? 'skills', orgId, extraFilter);
    default:
      return paginateTermText(term, g.queryBy ?? QB.ANY, orgId, extraFilter);
  }
}

function buildGroups(f: SearchFilters): QueryGroup[] {
  const groups: QueryGroup[] = [];
  const split = (tags?: SearchTag[]) => ({
    must: (tags ?? []).filter(t =>  t.mandatory).map(t => t.value).filter(Boolean),
    nice: (tags ?? []).filter(t => !t.mandatory).map(t => t.value).filter(Boolean),
  });

  // Keywords — HYBRID (resume text + skills filter)
  const kw = split(f.keywords);
  if (kw.must.length || kw.nice.length) {
    groups.push({ field: 'Keywords', strategy: 'hybrid', must: kw.must, nice: kw.nice, exclude: [] });
  }

  // Skills — array_filter only (text search on string[] facet is unreliable)
  const sk = split(f.skills);
  const exclSk = (f.excluded_skills ?? []).filter(s => s.trim());
  if (sk.must.length || sk.nice.length || exclSk.length) {
    groups.push({ field: 'Skills', strategy: 'array_filter', arrayField: 'skills', must: sk.must, nice: sk.nice, exclude: exclSk });
  }

  // Current Title
  const titleTags: SearchTag[] = [
    ...(((f as any).current_designations ?? []) as SearchTag[]),
    ...(f.current_designation ? [{ value: f.current_designation, mandatory: false }] : []),
  ];
  const tt = split(titleTags);
  if (tt.must.length || tt.nice.length)
    groups.push({ field: 'Current Title', strategy: 'text', queryBy: QB.TITLE, must: tt.must, nice: tt.nice, exclude: [] });

  // Current Company
  const coTags: SearchTag[] = [
    ...(((f as any).current_companies ?? []) as SearchTag[]),
    ...(f.current_company ? [{ value: f.current_company, mandatory: false }] : []),
  ];
  const cc = split(coTags);
  if (cc.must.length || cc.nice.length)
    groups.push({ field: 'Current Company', strategy: 'text', queryBy: QB.COMPANY, must: cc.must, nice: cc.nice, exclude: [] });

  // Previous Titles
  const pt = split(f.previous_titles);
  if (pt.must.length || pt.nice.length)
    groups.push({ field: 'Previous Titles', strategy: 'text', queryBy: QB.PREV_T, must: pt.must, nice: pt.nice, exclude: [] });

  // Previous Companies
  const pc = split(f.previous_companies);
  if (pc.must.length || pc.nice.length)
    groups.push({ field: 'Previous Companies', strategy: 'text', queryBy: QB.PREV_C, must: pc.must, nice: pc.nice, exclude: [] });

  // Education / Degree
  const degreeTags: SearchTag[] = [
    ...(((f as any).degrees ?? []) as SearchTag[]),
    ...(f.degree ? [{ value: f.degree, mandatory: false }] : []),
  ];
  const dg = split(degreeTags);
  if (dg.must.length || dg.nice.length)
    groups.push({ field: 'Education', strategy: 'text', queryBy: QB.DEGREE, must: dg.must, nice: dg.nice, exclude: [] });

  // Institutions
  const inst = split(f.institutions);
  if (inst.must.length || inst.nice.length)
    groups.push({ field: 'Institutions', strategy: 'text', queryBy: QB.INST, must: inst.must, nice: inst.nice, exclude: [] });

  // Companies umbrella (current OR previous)
  const cosU = split(f.companies);
  if (cosU.must.length || cosU.nice.length)
    groups.push({ field: 'Companies (any)', strategy: 'text', queryBy: 'current_company,previous_company,previous_companies', must: cosU.must, nice: cosU.nice, exclude: [] });

  // Optional Locations (mandatory are already in structural filter)
  const optLocs = (f.locations ?? []).filter(t => !t.mandatory).map(t => t.value);
  if (optLocs.length)
    groups.push({ field: 'Location (any)', strategy: 'text', queryBy: QB.LOC, must: [], nice: optLocs, exclude: [] });

  if (f.name?.length) {
    const names = f.name.map(t => t.value).filter(Boolean);
    if (names.length) groups.push({ field: 'Name', strategy: 'text', queryBy: 'full_name', must: names, nice: [], exclude: [] });
  }
  if (f.email?.length) {
    const emails = f.email.map(t => t.value).filter(Boolean);
    if (emails.length) groups.push({ field: 'Email', strategy: 'text', queryBy: 'email', must: emails, nice: [], exclude: [] });
  }
  if (f.jd_generated_keywords?.length)
    groups.push({ field: 'JD Keywords', strategy: 'hybrid', must: [], nice: f.jd_generated_keywords.slice(0, 15), exclude: [] });

  return groups;
}

// ── Stats types ───────────────────────────────────────────────────────────────
export interface SearchStats {
  total_in_org:         number;
  structural_pool_size: number;
  mandatory_pool_size:  number;
  nice_pool_size:       number;
  excluded_count:       number;
  final_match_count:    number;
  shown_count:          number;
  field_match_breakdown: Array<{
    field:  string; term: string;
    mode:   'must' | 'nice' | 'exclude';
    hits:   number; capped: boolean;
    term_ms?: number;
  }>;
  query_terms_sent: Array<{
    field: string; mode: 'must' | 'nice' | 'exclude';
    term: string; params: Record<string, any>;
  }>;
  timing_ms: {
    org_count:    number;
    term_searches: number;
    hydration:    number;
    structural:   number;
    scoring:      number;
    total:        number;
  };
  summary: string;
  debug_mode: boolean;
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

  return useQuery<SearchResponse>({
    queryKey:  ['typesenseSearch', organizationId, JSON.stringify(filters)],
    enabled:   enabled && !!organizationId,
    staleTime: 30_000,
    queryFn:   async (): Promise<SearchResponse> => {

      const t0 = performance.now();

      // ── Fire getTotalInOrg IN PARALLEL — never blocks search ────────────
      // tOrgStart is used for stats timing only
      const tOrgStart = performance.now();
      const totalInOrgPromise = getTotalInOrg(organizationId);

      // ── Build groups and structural filter ──────────────────────────────
      const groups           = buildGroups(filters);
      const structuralFilter = buildStructuralFilter(filters);

      zxLog('SEARCH-START', {
        orgId: organizationId,
        groups: groups.map(g => ({ field: g.field, strategy: g.strategy, must: g.must, nice: g.nice, exclude: g.exclude })),
        structuralFilter: structuralFilter || '(none)',
      });

      const fieldBreakdown: SearchStats['field_match_breakdown'] = [];
      const queryTermsSent:  SearchStats['query_terms_sent']     = [];

      const mustGroupIdSets: Set<string>[] = [];
      const niceGroupIdSets: Set<string>[] = [];
      const excludedIds = new Set<string>();

      // ── Per-term searches ────────────────────────────────────────────────
      const tTermStart   = performance.now();
      const searchTasks: Promise<void>[] = [];

      for (const g of groups) {
        for (const term of g.must) {
          const tTerm = Date.now();
          searchTasks.push(
            runTerm(g, term, organizationId, structuralFilter)
              .then(({ ids, found, querySent }) => {
                mustGroupIdSets.push(ids);
                fieldBreakdown.push({ field: g.field, term, mode: 'must', hits: found, capped: ids.size >= HARD_TERM_CAP, term_ms: Date.now() - tTerm });
                queryTermsSent.push({ field: g.field, mode: 'must', term, params: querySent });
              })
              .catch(err => {
                zxError('must-term', term, err);
                mustGroupIdSets.push(new Set());
                fieldBreakdown.push({ field: g.field, term, mode: 'must', hits: -1, capped: false });
              })
          );
        }
        for (const term of g.nice) {
          const tTerm = Date.now();
          searchTasks.push(
            runTerm(g, term, organizationId, structuralFilter)
              .then(({ ids, found, querySent }) => {
                niceGroupIdSets.push(ids);
                fieldBreakdown.push({ field: g.field, term, mode: 'nice', hits: found, capped: ids.size >= HARD_TERM_CAP, term_ms: Date.now() - tTerm });
                queryTermsSent.push({ field: g.field, mode: 'nice', term, params: querySent });
              })
              .catch(err => {
                zxError('nice-term', term, err);
                niceGroupIdSets.push(new Set());
                fieldBreakdown.push({ field: g.field, term, mode: 'nice', hits: -1, capped: false });
              })
          );
        }
        // Exclude: count only (structural filter already excludes them)
        for (const term of g.exclude) {
          const tTerm = Date.now();
          searchTasks.push(
            paginateArrayFilter(term, g.arrayField ?? 'skills', organizationId)
              .then(({ ids, found, querySent }) => {
                ids.forEach(id => excludedIds.add(id));
                fieldBreakdown.push({ field: g.field, term, mode: 'exclude', hits: found, capped: ids.size >= HARD_TERM_CAP, term_ms: Date.now() - tTerm });
                queryTermsSent.push({ field: g.field, mode: 'exclude', term, params: querySent });
              })
              .catch(err => zxError('exclude-term', term, err))
          );
        }
      }

      await Promise.all(searchTasks);
      const tTerm = performance.now() - tTermStart;

      // ── Combine sets ─────────────────────────────────────────────────────
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

      zxLog('SET-OPS', {
        mustGroups: mustGroupIdSets.length,
        mustGroupSizes: mustGroupIdSets.map(s => s.size),
        mandatoryPool: mandatoryIds?.size ?? 0,
        niceGroups: niceGroupIdSets.length,
        nicePool: niceIds.size,
        excluded: excludedHits,
        candidateIdsAfterExclude: candidateIds.size,
      });

      // ── Structural pool count (stats, parallel path) ──────────────────
      const tStructStart = performance.now();
      let structuralPoolSize = 0;

      if (candidateIds.size === 0 && groups.length === 0) {
        // Browse mode — no search terms
        const structOnly = structuralFilter
          ? `organization_id:=${organizationId} && ${structuralFilter}`
          : `organization_id:=${organizationId}`;
        const data = await tsearch({
          q: '*', query_by: QB.ANY, filter_by: structOnly,
          sort_by: 'created_at_ts:desc', per_page: String(MAX_PER_PAGE), page: '1',
        });
        structuralPoolSize = data.found ?? 0;
        (data.hits || []).forEach((h: any) => { if (h.document?.id) candidateIds.add(h.document.id); });
      } else if (structuralFilter) {
        const data = await tsearch({
          q: '*', query_by: QB.ANY,
          filter_by: `organization_id:=${organizationId} && ${structuralFilter}`,
          per_page: '1', page: '1',
        });
        structuralPoolSize = data.found ?? 0;
      }
      const tStruct = performance.now() - tStructStart;

      // ── Hydrate (POST — no 414) ───────────────────────────────────────
      const finalIds = [...candidateIds].slice(0, RESULT_DISPLAY_CAP);
      const tHyStart = performance.now();
      const hits     = await hydrateBatch(finalIds, organizationId);
      const tHy      = performance.now() - tHyStart;

      let results: CandidateSearchResult[] = hits.map(transformHit);

      // ── Score ─────────────────────────────────────────────────────────
      const tScoreStart = performance.now();
      const mustTotal = mustGroupIdSets.length;
      const niceTotal = niceGroupIdSets.length;
      const denom     = Math.max(1, mustTotal + niceTotal);

      results = results.map(r => {
        let nicePts = 0;
        for (const s of niceGroupIdSets) if (s.has(r.id)) nicePts++;
        const score = Math.round(((mustTotal + nicePts) / denom) * 100);
        return { ...r, _relevance_score: score };
      });
      results.sort((a, b) => (b._relevance_score ?? 0) - (a._relevance_score ?? 0));
      const tScore = performance.now() - tScoreStart;

      // ── Resolve org total (was running in parallel) ─────────────────
      const totalInOrg    = await totalInOrgPromise;
      const tOrgTotal     = performance.now() - tOrgStart;
      const tTotal        = performance.now() - t0;

      zxLog('SEARCH-DONE', {
        total_in_org: totalInOrg,
        results: results.length,
        timing: { orgCount: Math.round(tOrgTotal), terms: Math.round(tTerm), hydration: Math.round(tHy), total: Math.round(tTotal) },
      });

      // ── Build stats ───────────────────────────────────────────────────
      const summary = groups.length === 0
        ? `Showing ${results.length.toLocaleString()} of ${structuralPoolSize.toLocaleString()} (browsing)`
        : (() => {
            const must = fieldBreakdown.filter(b => b.mode === 'must').length;
            const nice = fieldBreakdown.filter(b => b.mode === 'nice').length;
            const excl = fieldBreakdown.filter(b => b.mode === 'exclude').length;
            return `Searched ${totalInOrg.toLocaleString()} candidates · ${must} must · ${nice} nice · ${excl} excluded → ${results.length.toLocaleString()} matched`;
          })();

      return {
        results,
        stats: {
          total_in_org:         totalInOrg,
          structural_pool_size: structuralPoolSize || totalInOrg,
          mandatory_pool_size:  mandatoryIds?.size ?? 0,
          nice_pool_size:       niceIds.size,
          excluded_count:       excludedHits,
          final_match_count:    candidateIds.size,
          shown_count:          results.length,
          field_match_breakdown: fieldBreakdown,
          query_terms_sent:      queryTermsSent,
          timing_ms: {
            org_count:     Math.round(tOrgTotal),
            term_searches: Math.round(tTerm),
            hydration:     Math.round(tHy),
            structural:    Math.round(tStruct),
            scoring:       Math.round(tScore),
            total:         Math.round(tTotal),
          },
          summary,
          debug_mode: DEBUG,
        },
      };
    },
  });
}