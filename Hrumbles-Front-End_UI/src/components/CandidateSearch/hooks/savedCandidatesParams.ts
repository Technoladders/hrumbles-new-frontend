/**
 * savedCandidatesParams.ts
 *
 * URL ↔ state serialization for SavedCandidatesPage.
 * Every filter, folder, pagination, tab — round-trips through the URL.
 *
 * URL format:
 *   ?tab=enriched&folder=<uuid>&status=contacted&sort=name_az
 *   &search=daniel&pg=2&arch=1
 */

import type { SaveTypeFilter, StatusFilter, SortOption } from "../hooks/useSavedCandidates";

export interface SavedCandidatesParams {
  tab:      SaveTypeFilter;
  folderId: string | null;
  status:   StatusFilter;
  sort:     SortOption;
  search:   string;
  page:     number;
  showArch: boolean;
}

const DEFAULTS: SavedCandidatesParams = {
  tab:      "all",
  folderId: null,
  status:   "all",
  sort:     "newest",
  search:   "",
  page:     1,
  showArch: false,
};

// Deserialize URLSearchParams → SavedCandidatesParams
export function deserializeSavedParams(params: URLSearchParams): SavedCandidatesParams {
  const validTabs:     SaveTypeFilter[] = ["all","enriched","manual_edit","shortlisted","invited"];
  const validStatuses: StatusFilter[]   = ["all","saved","contacted","in_progress","archived"];
  const validSorts:    SortOption[]     = ["newest","oldest","name_az"];

  const rawTab    = params.get("tab");
  const rawStatus = params.get("status");
  const rawSort   = params.get("sort");
  const rawPage   = parseInt(params.get("pg") ?? "1", 10);

  return {
    tab:      (validTabs.includes(rawTab as SaveTypeFilter)     ? rawTab  : "all")    as SaveTypeFilter,
    folderId: params.get("folder") || null,
    status:   (validStatuses.includes(rawStatus as StatusFilter) ? rawStatus : "all") as StatusFilter,
    sort:     (validSorts.includes(rawSort as SortOption)        ? rawSort  : "newest") as SortOption,
    search:   params.get("q") ?? "",
    page:     Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    showArch: params.get("arch") === "1",
  };
}

// Serialize SavedCandidatesParams → URLSearchParams
export function serializeSavedParams(p: SavedCandidatesParams): URLSearchParams {
  const out = new URLSearchParams();

  if (p.tab      !== DEFAULTS.tab)      out.set("tab",    p.tab);
  if (p.folderId)                        out.set("folder", p.folderId);
  if (p.status   !== DEFAULTS.status)   out.set("status", p.status);
  if (p.sort     !== DEFAULTS.sort)     out.set("sort",   p.sort);
  if (p.search.trim())                   out.set("q",      p.search.trim());
  if (p.page     > 1)                   out.set("pg",     String(p.page));
  if (p.showArch)                        out.set("arch",   "1");

  return out;
}