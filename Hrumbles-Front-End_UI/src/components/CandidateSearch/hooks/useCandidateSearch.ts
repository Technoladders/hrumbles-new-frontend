import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApolloCandidate, SearchError, SearchState } from "../types";

const RESULTS_PER_PAGE = 25;

// Availability intent → keyword phrases appended to q_keywords
// These are never shown to the user — they silently augment the search signal
const INTENT_KEYWORDS: Record<string, string> = {
  open_to_work:    "open to work",
  serving_notice:  "notice period",
  immediate:       "immediate joiner",
};

interface UseSearchOptions {
  keywords: string;
  titles: string[];
  locations: string[];
  seniorities: string[];
  companyNames: string[];
  availabilityIntent: string[];
  initialPage?: number;
}

interface UseSearchReturn {
  state: SearchState;
  people: ApolloCandidate[];
  totalEntries: number;
  currentPage: number;
  error: SearchError | null;
  search: (page?: number) => Promise<void>;
  loadMore: () => void;
  loadPrev: () => void;
  reset: () => void;
}

const classifyError = (statusCode: number, message: string): SearchError => {
  if (statusCode === 401 || statusCode === 403)
    return {
      type: "auth",
      message: statusCode === 401
        ? "Invalid API key. Update TALENT_SEARCH_API_KEY in Supabase secrets."
        : "Access denied — check API key permissions.",
      statusCode,
    };
  if (statusCode === 429)
    return { type: "rateLimit", message: "Rate limit reached. Wait a few minutes.", statusCode };
  if (statusCode === 422)
    return { type: "invalid", message: "Invalid search parameters.", statusCode };
  return {
    type: "unknown",
    message: message || "Edge function error — check Supabase → Edge Functions → search-candidates → Logs.",
    statusCode,
  };
};

/** Build the q_keywords string:
 *  - user's own keyword
 *  - company names (if any, appended so Apollo text-matches them)
 *  - silent intent phrases from availabilityIntent
 */
const buildKeywords = (
  keywords: string,
  companyNames: string[],
  availabilityIntent: string[],
): string => {
  const parts: string[] = [];
  if (keywords.trim()) parts.push(keywords.trim());
  // company names go into q_keywords too so they match titles/bios
  companyNames.forEach(c => parts.push(c));
  // silent intent signals
  availabilityIntent.forEach(k => {
    const phrase = INTENT_KEYWORDS[k];
    if (phrase) parts.push(phrase);
  });
  return parts.join(" ").trim();
};

export const useCandidateSearch = ({
  keywords, titles, locations, seniorities, companyNames, availabilityIntent, initialPage = 1,
}: UseSearchOptions): UseSearchReturn => {
  const [state,        setState]        = useState<SearchState>("idle");
  const [people,       setPeople]       = useState<ApolloCandidate[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [error,        setError]        = useState<SearchError | null>(null);

  const lastFilters = useRef({ keywords, titles, locations, seniorities, companyNames, availabilityIntent });

  const search = useCallback(async (page: number = 1) => {
    // On new filter search (page 1), update lastFilters
    if (page === 1) {
      lastFilters.current = { keywords, titles, locations, seniorities, companyNames, availabilityIntent };
    }

    const f = lastFilters.current;

    setState("loading");
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("search-candidates", {
        body: {
          // keyword + company + silent intent phrases all merged into q_keywords
          q_keywords:           buildKeywords(f.keywords, f.companyNames, f.availabilityIntent),
          person_titles:        f.titles,
          person_locations:     f.locations,
          person_seniorities:   f.seniorities,
          page,
          per_page: RESULTS_PER_PAGE,
        },
      });

      if (fnError) {
        let statusCode = 500;
        let message = fnError.message || "Edge function error";
        try {
          const ctx = (fnError as any).context;
          if (ctx) {
            statusCode = ctx.status ?? 500;
            const body = await ctx.json().catch(() => ({}));
            message = body?.error || body?.detail || message;
          }
        } catch { /* ignore */ }
        const se = classifyError(statusCode, message);
        setError(se);
        setState("error");
        return;
      }

      const resultPeople: ApolloCandidate[] = data?.people        ?? [];
      const total:        number            = data?.total_entries  ?? 0;
      setPeople(resultPeople);
      setTotalEntries(total);
      setCurrentPage(page);
      setState(resultPeople.length > 0 ? "results" : "empty");

    } catch (err) {
      setError({
        type: "unknown",
        message: err instanceof Error ? err.message : "Unexpected error.",
      });
      setState("error");
      console.error("[CandidateSearch]", err);
    }
  }, [keywords, titles, locations, seniorities, companyNames, availabilityIntent]);

  const loadMore = useCallback(() => search(currentPage + 1), [search, currentPage]);
  const loadPrev = useCallback(() => { if (currentPage > 1) search(currentPage - 1); }, [search, currentPage]);
  const reset    = useCallback(() => {
    setState("idle"); setPeople([]); setTotalEntries(0); setCurrentPage(1); setError(null);
  }, []);

  return { state, people, totalEntries, currentPage, error, search, loadMore, loadPrev, reset };
};