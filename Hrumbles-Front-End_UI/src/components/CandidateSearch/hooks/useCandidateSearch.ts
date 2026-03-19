import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApolloCandidate, SearchError, SearchState } from "../types";
import { toTechUids } from "../constants/technologies";

const RESULTS_PER_PAGE = 25;

interface UseSearchOptions {
  skills: string[];
  titles: string[];
  locations: string[];
  seniorities: string[];
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

// ─── Classify errors from the edge function response ─────────────
const classifyError = (statusCode: number, message: string): SearchError => {
  if (statusCode === 401 || statusCode === 403) {
    return {
      type: "auth",
      message:
        statusCode === 401
          ? "Invalid API key. Update TALENT_SEARCH_API_KEY in your Supabase secrets."
          : "Access denied. The API key may lack the required permissions.",
      statusCode,
    };
  }
  if (statusCode === 429) {
    return {
      type: "rateLimit",
      message: "Rate limit reached. Please wait a few minutes before searching again.",
      statusCode,
    };
  }
  if (statusCode === 422) {
    return {
      type: "invalid",
      message: "Invalid search parameters. Check technology names match the supported list.",
      statusCode,
    };
  }
  if (statusCode === 500) {
    return {
      type: "unknown",
      message:
        message ||
        "Edge function error. Check that TALENT_SEARCH_API_KEY is set in Supabase secrets.",
      statusCode,
    };
  }
  return {
    type: "unknown",
    message: message || `Unexpected error (HTTP ${statusCode})`,
    statusCode,
  };
};

export const useCandidateSearch = ({
  skills,
  titles,
  locations,
  seniorities,
}: UseSearchOptions): UseSearchReturn => {
  const [state,        setState]        = useState<SearchState>("idle");
  const [people,       setPeople]       = useState<ApolloCandidate[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [error,        setError]        = useState<SearchError | null>(null);

  // Snapshot the filters at search time so pagination stays consistent
  // even if the user edits filters mid-browse
  const lastFilters = useRef({ skills, titles, locations, seniorities });

  const search = useCallback(
    async (page = 1) => {
      const f =
        page === 1
          ? { skills, titles, locations, seniorities }
          : lastFilters.current;

      if (page === 1) {
        lastFilters.current = { skills, titles, locations, seniorities };
      }

      setState("loading");
      setError(null);

      try {
        // ── Invoke Supabase Edge Function (no CORS) ─────────────
        const { data, error: fnError } = await supabase.functions.invoke(
          "search-candidates",
          {
            body: {
              technologies:       toTechUids(f.skills),
              person_titles:      f.titles,
              person_locations:   f.locations,
              person_seniorities: f.seniorities,
              page,
              per_page: RESULTS_PER_PAGE,
            },
          }
        );

        if (fnError) {
          let statusCode = 500;
          let message    = fnError.message || "Edge function returned an error";
          try {
            const ctx = (fnError as any).context;
            if (ctx) {
              statusCode = ctx.status ?? 500;
              const body = await ctx.json().catch(() => ({}));
              message = body?.error || body?.detail || message;
            }
          } catch { /* ignore parse failures */ }

          const classified = classifyError(statusCode, message);
          setError(classified);
          setState("error");
          console.error("[CandidateSearch]", classified);
          return;
        }

        // ── Parse successful response ───────────────────────────
        const resultPeople: ApolloCandidate[] = data?.people       ?? [];
        const total:        number            = data?.total_entries ?? 0;

        setPeople(resultPeople);
        setTotalEntries(total);
        setCurrentPage(page);
        setState(resultPeople.length > 0 ? "results" : "empty");

      } catch (err) {
        const se: SearchError = {
          type:    "unknown",
          message: err instanceof Error ? err.message : "An unexpected error occurred.",
        };
        setError(se);
        setState("error");
        console.error("[CandidateSearch] Unexpected error:", err);
      }
    },
    [skills, titles, locations, seniorities]
  );

  const loadMore = useCallback(() => search(currentPage + 1), [search, currentPage]);
  const loadPrev = useCallback(() => { if (currentPage > 1) search(currentPage - 1); }, [search, currentPage]);

  const reset = useCallback(() => {
    setState("idle");
    setPeople([]);
    setTotalEntries(0);
    setCurrentPage(1);
    setError(null);
  }, []);

  return {
    state, people, totalEntries, currentPage, error,
    search, loadMore, loadPrev, reset,
  };
};