import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, parseISO, subDays, isAfter } from "date-fns";
import { CheckSquare, X, Search } from "lucide-react";
import { LeaveRequest } from "@/types/leave-types";
import { cn } from "@/lib/utils";

interface RecentApprovalsTableProps {
  approvals:  LeaveRequest[];
  isLoading:  boolean;
  onCancel:   (request: LeaveRequest) => void;
}

const STATUS_STYLES: Record<string, string> = {
  approved:  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  rejected:  "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

function empName(emp: any): string {
  if (!emp) return "Unknown";
  if (emp.first_name || emp.last_name)
    return `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
  return emp.email ?? "Unknown";
}

export function RecentApprovalsTable({
  approvals, isLoading, onCancel,
}: RecentApprovalsTableProps) {
  const [search, setSearch]       = useState("");
  const [dateFilter, setDateFilter] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "rejected" | "cancelled">("all");

  const cutoff = useMemo(() => {
    if (dateFilter === "all") return null;
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
    return subDays(new Date(), days);
  }, [dateFilter]);

  const filtered = useMemo(() =>
    approvals.filter((a) => {
      const name = empName(a.employee).toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (cutoff && a.updated_at && !isAfter(parseISO(a.updated_at), cutoff)) return false;
      return true;
    }),
    [approvals, search, statusFilter, cutoff]
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actioned by</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center text-muted-foreground gap-2">
                  <CheckSquare className="w-8 h-8 opacity-20" />
                  <p>No approval activity found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <div>
                    <p>{empName(a.employee)}</p>
                    {(a.employee as any)?.hr_departments?.name && (
                      <p className="text-xs text-muted-foreground">
                        {(a.employee as any).hr_departments.name}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: a.leave_type?.color ?? "#6366f1" }}
                    />
                    {a.leave_type?.name ?? "—"}
                  </div>
                </TableCell>

                <TableCell>{format(parseISO(a.start_date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{format(parseISO(a.end_date),   "MMM dd, yyyy")}</TableCell>
                <TableCell>{a.working_days} days</TableCell>

                <TableCell>
                  <Badge className={cn(
                    "border text-xs",
                    STATUS_STYLES[a.status] ?? ""
                  )}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </Badge>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {empName((a as any).approved_by_employee)}
                </TableCell>

                <TableCell className="text-right">
                  {a.status === "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => onCancel(a)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} of {approvals.length} records
        </p>
      )}
    </div>
  );
}