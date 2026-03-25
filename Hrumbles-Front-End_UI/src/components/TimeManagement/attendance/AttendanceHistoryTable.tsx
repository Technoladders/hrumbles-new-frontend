import { useState, useMemo } from "react";
import { format, isValid } from "date-fns";
import { Clock, Coffee, UtensilsCrossed, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/hooks/TimeManagement/useAttendanceData";

interface AttendanceHistoryTableProps {
  records: AttendanceRecord[];
  isExternal: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const STATUS_CONFIG = {
  present:  { label: 'Present',  dot: 'bg-emerald-500', row: '',                         badge: 'bg-emerald-50  text-emerald-700  border-emerald-200'  },
  late:     { label: 'Late',     dot: 'bg-amber-400',   row: 'bg-amber-50/40',           badge: 'bg-amber-50    text-amber-700    border-amber-200'    },
  on_leave: { label: 'On Leave', dot: 'bg-indigo-400',  row: 'bg-indigo-50/30',          badge: 'bg-indigo-50   text-indigo-700   border-indigo-200'   },
  absent:   { label: 'Absent',   dot: 'bg-red-400',     row: 'bg-red-50/30',             badge: 'bg-red-50      text-red-600      border-red-200'      },
  weekend:  { label: 'Weekend',  dot: 'bg-gray-300',    row: 'bg-gray-50/60 opacity-60', badge: 'bg-gray-100    text-gray-500     border-gray-200'     },
  holiday:  { label: 'Holiday',  dot: 'bg-purple-400',  row: 'bg-purple-50/30',          badge: 'bg-purple-50   text-purple-700   border-purple-200'   },
  future:   { label: 'Upcoming', dot: 'bg-gray-200',    row: 'opacity-40',               badge: 'bg-gray-50     text-gray-400     border-gray-100'     },
} as const;

const fmtTime = (t: string | null) => {
  if (!t) return '—';
  const d = new Date(t);
  return isValid(d) ? format(d, 'hh:mm a') : '—';
};

const fmtDuration = (mins: number | null) => {
  if (!mins || mins <= 0) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const breakIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'lunch':  return <UtensilsCrossed className="h-3 w-3" />;
    case 'coffee': return <Coffee className="h-3 w-3" />;
    default:       return <Clock className="h-3 w-3" />;
  }
};

export const AttendanceHistoryTable = ({ records, isExternal }: AttendanceHistoryTableProps) => {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  // Filter out future + weekend for the table
  const tableRecords = useMemo(
    () => records.filter(r => r.dayStatus !== 'future' && r.dayStatus !== 'weekend'),
    [records]
  );

  const totalRecords = tableRecords.length;
  const totalPages   = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Reset to page 1 whenever pageSize changes or records change
  const safePage   = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex   = Math.min(startIndex + pageSize, totalRecords);
  const pageRecords = tableRecords.slice(startIndex, endIndex);

  const handlePageSize = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  return (
    <Card className="shadow-sm border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Attendance History
            </CardTitle>
            <CardDescription className="text-xs">
              {totalRecords} record{totalRecords !== 1 ? 's' : ''} in selected period
            </CardDescription>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={handlePageSize}>
              <SelectTrigger className="h-7 w-16 rounded-lg text-xs border-gray-200 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Day</TableHead>
                <TableHead className="text-xs">Clock In</TableHead>
                <TableHead className="text-xs">Clock Out</TableHead>
                <TableHead className="text-xs">Work Time</TableHead>
                <TableHead className="text-xs">Break</TableHead>
                <TableHead className="text-xs">Net Time</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRecords.length > 0 ? (
                pageRecords.map(rec => {
                  const cfg        = STATUS_CONFIG[rec.dayStatus] ?? STATUS_CONFIG.absent;
                  const breakTotal = rec.break_logs.reduce((s, b) => s + (b.duration_minutes ?? 0), 0);
                  const netMins    = (rec.duration_minutes ?? 0) - breakTotal;

                  const breakTypes = rec.break_logs.reduce<Record<string, number>>((acc, b) => {
                    const t = b.break_type.toLowerCase();
                    acc[t] = (acc[t] ?? 0) + (b.duration_minutes ?? 0);
                    return acc;
                  }, {});

                  const hasBreaks = Object.keys(breakTypes).length > 0;

                  return (
                    <TableRow key={rec.id} className={cn("transition-colors text-sm", cfg.row)}>
                      <TableCell className="font-medium text-gray-700 dark:text-gray-300">
                        {format(new Date(rec.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-xs">
                        {format(new Date(rec.date), 'EEE')}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {fmtTime(rec.clock_in_time)}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {fmtTime(rec.clock_out_time)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {fmtDuration(rec.duration_minutes)}
                      </TableCell>

                      {/* Break cell */}
                      <TableCell>
                        {hasBreaks ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {Object.entries(breakTypes).map(([type, mins]) => (
                              <span
                                key={type}
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 text-[10px] font-medium"
                              >
                                {breakIcon(type)}
                                {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Net time */}
                      <TableCell>
                        {rec.duration_minutes ? (
                          <span className={cn(
                            "text-xs font-medium",
                            netMins >= 480 ? "text-emerald-600" : netMins >= 360 ? "text-amber-600" : "text-red-500"
                          )}>
                            {fmtDuration(Math.max(0, netMins))}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                          cfg.badge
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                          {rec.dayStatus === 'on_leave' && rec.leaveTypeName  ? rec.leaveTypeName  :
                           rec.dayStatus === 'holiday'  && rec.holidayName   ? rec.holidayName    :
                           cfg.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Clock className="h-8 w-8 opacity-20" />
                      <p className="text-sm">No attendance records found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination bar ──────────────────────────────────────────────── */}
        {totalRecords > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            {/* Showing X–Y of Z */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {startIndex + 1}–{endIndex}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{totalRecords}</span>{' '}
              records
            </p>

            {/* Page nav */}
            <div className="flex items-center gap-1">
              {/* First page */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              {/* Prev */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant="ghost" size="icon"
                      className={cn(
                        "h-7 w-7 rounded-lg text-xs",
                        safePage === p
                          ? "bg-violet-600 text-white hover:bg-violet-700 hover:text-white"
                          : "text-gray-600 dark:text-gray-300"
                      )}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}

              {/* Next */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              {/* Last page */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};