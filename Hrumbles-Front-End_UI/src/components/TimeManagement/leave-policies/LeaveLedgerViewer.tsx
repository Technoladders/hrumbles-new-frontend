import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Download, ChevronLeft, ChevronRight, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { LedgerEntry, LedgerEventType } from "@/types/leave-types";
import { cn } from "@/lib/utils";

interface LeaveLedgerViewerProps {
  employeeId:    string;
  leaveTypeId?:  string;
  year?:         number;
}

const PAGE_SIZE = 20;

const EVENT_CONFIG: Record<LedgerEventType, { label: string; color: string }> = {
  accrual:       { label: "Accrual",       color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300" },
  usage:         { label: "Leave taken",   color: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300" },
  adjustment:    { label: "Adjustment",    color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300" },
  carry_forward: { label: "Carry forward", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300" },
  encashment:    { label: "Encashment",    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300" },
  lapse:         { label: "Lapsed",        color: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400" },
};

export function LeaveLedgerViewer({
  employeeId,
  leaveTypeId,
  year,
}: LeaveLedgerViewerProps) {
  const [page, setPage] = useState(0);

  const { data: rawEntries = [], isLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["leaveLedger", employeeId, leaveTypeId, year],
    queryFn: async () => {
      let q = supabase
        .from("leave_ledger")
        .select(`*, leave_type:leave_types(name, color)`)
        .eq("employee_id", employeeId)
        .order("transaction_date", { ascending: false });

      if (leaveTypeId) q = q.eq("leave_type_id", leaveTypeId);
      if (year) {
        q = q
          .gte("transaction_date", `${year}-01-01`)
          .lte("transaction_date", `${year}-12-31`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as LedgerEntry[];
    },
    enabled: !!employeeId,
  });

  // Compute running balance (oldest → newest, then reverse for display)
  const entries = useMemo((): LedgerEntry[] => {
    const sorted = [...rawEntries].reverse(); // oldest first
    let balance  = 0;
    const withBalance = sorted.map((e) => {
      balance += (e.credit ?? 0) - (e.debit ?? 0);
      return { ...e, running_balance: balance };
    });
    return withBalance.reverse(); // newest first for display
  }, [rawEntries]);

  // Pagination
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary row
  const totals = useMemo(() => ({
    credit: entries.reduce((s, e) => s + (e.credit ?? 0), 0),
    debit:  entries.reduce((s, e) => s + (e.debit ?? 0), 0),
  }), [entries]);

  // CSV export
  const handleExport = () => {
    const header = "Date,Event,Leave Type,Credit,Debit,Running Balance,Reason\n";
    const rows = entries.map((e) =>
      [
        format(new Date(e.transaction_date), "yyyy-MM-dd"),
        EVENT_CONFIG[e.event_type as LedgerEventType]?.label ?? e.event_type,
        e.leave_type?.name ?? "",
        e.credit  > 0 ? e.credit  : "",
        e.debit   > 0 ? e.debit   : "",
        e.running_balance ?? "",
        `"${(e.reason ?? "").replace(/"/g, "'")}"`,
      ].join(",")
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `leave-ledger-${employeeId}-${year ?? "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2 border-2 border-dashed rounded-xl">
        <TrendingUp className="h-7 w-7 opacity-20" />
        <p className="text-sm">No ledger entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header: totals + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <TrendingUp className="h-4 w-4" />
            +{totals.credit} days credited
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 font-medium">
            <TrendingDown className="h-4 w-4" />
            -{totals.debit} days debited
          </div>
          <span className="text-muted-foreground text-xs">
            Net: <span className="font-semibold text-foreground">{totals.credit - totals.debit} days</span>
          </span>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Date</TableHead>
              <TableHead>Event</TableHead>
              {!leaveTypeId && <TableHead>Leave Type</TableHead>}
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageEntries.map((entry) => {
              const cfg = EVENT_CONFIG[entry.event_type as LedgerEventType];
              return (
                <TableRow key={entry.id} className="text-sm">
                  <TableCell className="text-muted-foreground">
                    {format(new Date(entry.transaction_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs border font-medium", cfg?.color)}>
                      {cfg?.label ?? entry.event_type}
                    </Badge>
                  </TableCell>
                  {!leaveTypeId && (
                    <TableCell>
                      <span
                        className="font-medium text-xs"
                        style={{ color: entry.leave_type?.color }}
                      >
                        {entry.leave_type?.name}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {(entry.credit ?? 0) > 0 ? (
                      <span className="font-semibold text-emerald-600">
                        +{entry.credit}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {(entry.debit ?? 0) > 0 ? (
                      <span className="font-semibold text-rose-600">
                        -{entry.debit}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-bold",
                      (entry.running_balance ?? 0) < 0
                        ? "text-rose-600"
                        : "text-foreground"
                    )}>
                      {entry.running_balance ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                    {entry.reason || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, entries.length)} of {entries.length} entries
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline" size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}