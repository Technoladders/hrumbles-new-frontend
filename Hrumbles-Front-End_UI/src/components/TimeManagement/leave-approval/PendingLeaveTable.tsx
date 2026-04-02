import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO } from "date-fns";
import { Calendar, Check, X } from "lucide-react";
import { LeaveRequest } from "@/types/leave-types";
import { cn } from "@/lib/utils";

interface PendingLeaveTableProps {
  requests:         LeaveRequest[];
  isLoading:        boolean;
  selectedIds?:     Set<string>;
  onToggleSelect?:  (id: string) => void;
  onApprove:        (request: LeaveRequest) => void;
  onReject:         (request: LeaveRequest) => void;
}

function empName(emp: any): string {
  if (!emp) return "Unknown";
  if (emp.first_name || emp.last_name)
    return `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
  return emp.email ?? "Unknown";
}

export function PendingLeaveTable({
  requests, isLoading,
  selectedIds, onToggleSelect,
  onApprove, onReject,
}: PendingLeaveTableProps) {
  const showCheckboxes = !!onToggleSelect;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckboxes && <TableHead className="w-10" />}
          <TableHead>Employee</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={showCheckboxes ? 8 : 7} className="h-24 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            </TableCell>
          </TableRow>
        ) : requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showCheckboxes ? 8 : 7} className="h-24 text-center">
              <div className="flex flex-col items-center text-muted-foreground gap-2">
                <Calendar className="w-8 h-8 opacity-20" />
                <p>No pending leave requests</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          requests.map((req) => (
            <TableRow
              key={req.id}
              className={cn(
                selectedIds?.has(req.id) && "bg-emerald-50/40 dark:bg-emerald-950/10"
              )}
            >
              {showCheckboxes && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds?.has(req.id) ?? false}
                    onCheckedChange={() => onToggleSelect!(req.id)}
                  />
                </TableCell>
              )}

              <TableCell className="font-medium">
                <div>
                  <p>{empName(req.employee)}</p>
                  {(req.employee as any)?.hr_departments?.name && (
                    <p className="text-xs text-muted-foreground">
                      {(req.employee as any).hr_departments.name}
                    </p>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: req.leave_type?.color ?? "#6366f1" }}
                  />
                  {req.leave_type?.name ?? "—"}
                </div>
              </TableCell>

              <TableCell>
                {req.start_date
                  ? format(parseISO(req.start_date), "MMM dd, yyyy")
                  : "—"}
              </TableCell>

              <TableCell>
                {req.end_date
                  ? format(parseISO(req.end_date), "MMM dd, yyyy")
                  : "—"}
              </TableCell>

              <TableCell>
                <span className="font-medium">{req.working_days}</span>
                <span className="text-xs text-muted-foreground ml-1">days</span>
              </TableCell>

              {/* Truncated reason */}
              <TableCell className="max-w-[180px]">
                <p className="text-xs text-muted-foreground truncate" title={req.notes ?? ""}>
                  {req.notes ?? <span className="italic opacity-50">No reason</span>}
                </p>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApprove(req)}
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(req)}
                    className="text-rose-600 border-rose-300 hover:bg-rose-50"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}