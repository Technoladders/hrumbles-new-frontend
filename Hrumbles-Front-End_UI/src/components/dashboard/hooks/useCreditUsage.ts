import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreditSummary {
  total_consumed: number;
  total_added: number;
  enrichment_used: number;
  verification_used: number;
  active_organizations: number;
  active_users: number;
  by_enrichment_type: {
    contact_email_reveal: number;
    contact_phone_reveal: number;
    company_enrich: number;
    company_search: number;
  };
  by_verification_type: Record<string, number>;
}

export interface DailyTrend {
  date: string;
  enrichment_credits: number;
  verification_credits: number;
  total_credits: number;
  transaction_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit summary — uses NEW RPC: get_dashboard_credit_summary
// The old get_credit_usage_summary does NOT exist in the schema.
// Deploy the SQL from dashboard-redesign/sql/get_dashboard_credit_summary.sql
// ─────────────────────────────────────────────────────────────────────────────
export function useCreditSummary(
  organizationId: string,
  dateRange?: { from: string; to: string }
) {
  return useQuery({
    queryKey: ["credit-summary", organizationId, dateRange],
    queryFn: async () => {
      console.log("[useCreditSummary] org_id:", organizationId);

      // Try new RPC first
      const params: Record<string, any> = { org_id: organizationId };
      if (dateRange?.from) params.start_date = dateRange.from;
      if (dateRange?.to) params.end_date = dateRange.to;

      const { data, error } = await supabase.rpc(
        "get_dashboard_credit_summary",
        params
      );

      if (error) {
        console.warn("[useCreditSummary] RPC error (expected if not yet deployed):", error.message);

        // Fallback: query credit_transactions directly
        console.log("[useCreditSummary] Using direct table fallback...");
        return await getCreditSummaryFromTable(organizationId, dateRange);
      }

      console.log("[useCreditSummary] response:", data);
      const result = Array.isArray(data) ? data[0] : data;
      return (result || getEmptySummary()) as CreditSummary;
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct table fallback for credit summary
// ─────────────────────────────────────────────────────────────────────────────
async function getCreditSummaryFromTable(
  organizationId: string,
  dateRange?: { from: string; to: string }
): Promise<CreditSummary> {
  try {
    let query = supabase
      .from("credit_transactions")
      .select("*")
      .eq("organization_id", organizationId);

    if (dateRange?.from) query = query.gte("created_at", dateRange.from);
    if (dateRange?.to) query = query.lte("created_at", dateRange.to + "T23:59:59");

    const { data: rows, error } = await query;

    if (error) {
      console.error("[getCreditSummaryFromTable] error:", error);
      return getEmptySummary();
    }

    console.log("[getCreditSummaryFromTable] rows:", rows?.length);

    const summary: CreditSummary = {
      total_consumed: 0,
      total_added: 0,
      enrichment_used: 0,
      verification_used: 0,
      active_organizations: 0,
      active_users: 0,
      by_enrichment_type: {
        contact_email_reveal: 0,
        contact_phone_reveal: 0,
        company_enrich: 0,
        company_search: 0,
      },
      by_verification_type: {},
    };

    const userSet = new Set<string>();

    for (const row of rows || []) {
      const credits = Math.abs(Number(row.credits_used || row.credits || row.amount || 0));
      const txType = (row.transaction_type || row.type || row.service_type || "").toLowerCase();
      const serviceType = (row.service_type || row.credit_type || row.category || "").toLowerCase();

      // Determine if enrichment or verification
      const isVerification =
        txType.includes("verif") ||
        serviceType.includes("verif") ||
        serviceType.includes("epfo") ||
        serviceType.includes("gridlines");

      const isEnrichment =
        txType.includes("enrich") ||
        serviceType.includes("email") ||
        serviceType.includes("phone") ||
        serviceType.includes("company") ||
        serviceType.includes("reveal");

      if (txType.includes("add") || txType.includes("credit") && !txType.includes("debit")) {
        summary.total_added += credits;
      } else {
        summary.total_consumed += credits;

        if (isVerification) {
          summary.verification_used += credits;
          const vKey = serviceType || "verification";
          summary.by_verification_type[vKey] =
            (summary.by_verification_type[vKey] || 0) + credits;
        } else if (isEnrichment) {
          summary.enrichment_used += credits;
          if (serviceType.includes("email") || serviceType.includes("email_reveal")) {
            summary.by_enrichment_type.contact_email_reveal += credits;
          } else if (serviceType.includes("phone") || serviceType.includes("phone_reveal")) {
            summary.by_enrichment_type.contact_phone_reveal += credits;
          } else if (serviceType.includes("company_enrich") || serviceType.includes("enrich")) {
            summary.by_enrichment_type.company_enrich += credits;
          } else if (serviceType.includes("company_search") || serviceType.includes("search")) {
            summary.by_enrichment_type.company_search += credits;
          }
        } else {
          // Unknown type — count as enrichment by default
          summary.enrichment_used += credits;
        }
      }

      if (row.user_id) userSet.add(row.user_id);
    }

    summary.active_users = userSet.size;
    return summary;
  } catch (e) {
    console.error("[getCreditSummaryFromTable] exception:", e);
    return getEmptySummary();
  }
}

function getEmptySummary(): CreditSummary {
  return {
    total_consumed: 0,
    total_added: 0,
    enrichment_used: 0,
    verification_used: 0,
    active_organizations: 0,
    active_users: 0,
    by_enrichment_type: {
      contact_email_reveal: 0,
      contact_phone_reveal: 0,
      company_enrich: 0,
      company_search: 0,
    },
    by_verification_type: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit daily trend — params: p_org_id, p_start_date, p_end_date (from hint)
// ─────────────────────────────────────────────────────────────────────────────
export function useCreditDailyTrend(organizationId: string, days: number = 7) {
  return useQuery({
    queryKey: ["credit-daily-trend", organizationId, days],
    queryFn: async () => {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      console.log("[useCreditDailyTrend] p_org_id:", organizationId, "start:", startDate, "end:", endDate);

      const { data, error } = await supabase.rpc("get_credit_usage_daily_trend", {
        p_org_id: organizationId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error("[useCreditDailyTrend] error:", error);

        // Fallback: build trend from table
        console.log("[useCreditDailyTrend] Using direct table fallback...");
        return await getDailyTrendFromTable(organizationId, startDate, endDate);
      }

      console.log("[useCreditDailyTrend] response:", data);
      return ((data as any[]) || []).map((d: any) => ({
        date: d.date || d.day || d.trend_date || "",
        enrichment_credits: Number(d.enrichment_credits || d.enrichment || 0),
        verification_credits: Number(d.verification_credits || d.verification || 0),
        total_credits: Number(d.total_credits || d.total || 0),
        transaction_count: Number(d.transaction_count || d.count || 0),
      })) as DailyTrend[];
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct table fallback for daily trend
// ─────────────────────────────────────────────────────────────────────────────
async function getDailyTrendFromTable(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<DailyTrend[]> {
  try {
    const { data: rows, error } = await supabase
      .from("credit_transactions")
      .select("created_at, credits_used, credits, amount, transaction_type, type, service_type, credit_type, category")
      .eq("organization_id", organizationId)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getDailyTrendFromTable] error:", error);
      return [];
    }

    const byDay: Record<string, { enrichment: number; verification: number; count: number }> = {};

    for (const row of rows || []) {
      const day = (row.created_at || "").slice(0, 10);
      if (!day) continue;
      if (!byDay[day]) byDay[day] = { enrichment: 0, verification: 0, count: 0 };

      const credits = Math.abs(Number(row.credits_used || row.credits || row.amount || 0));
      const svcType = (row.service_type || row.credit_type || row.category || row.transaction_type || row.type || "").toLowerCase();
      const isVerif = svcType.includes("verif") || svcType.includes("epfo") || svcType.includes("gridlines");

      if (isVerif) {
        byDay[day].verification += credits;
      } else {
        byDay[day].enrichment += credits;
      }
      byDay[day].count += 1;
    }

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        enrichment_credits: vals.enrichment,
        verification_credits: vals.verification,
        total_credits: vals.enrichment + vals.verification,
        transaction_count: vals.count,
      }));
  } catch (e) {
    console.error("[getDailyTrendFromTable] exception:", e);
    return [];
  }
}