import { useState } from "react";
import { format, parseISO, formatDistanceToNow, parse } from "date-fns";
import { cn } from "@/lib/utils";

import {
  Search, RefreshCw, CheckCircle2, XCircle, Eye,
  Clock, ArrowRight, Loader2, Check, X, ClipboardList,
  Calendar, Ban, AlertTriangle,
} from "lucide-react";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator }from "@/components/ui/separator";
import { Label }    from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

import { useRegularizationApproval } from "@/hooks/TimeManagement/regularization/useRegularizationApproval";
import { RegularizationRequest }      from "@/types/time-tracker-types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const t = iso.split('T')[1];
  if (!t) return '—';
  const clean = t.split('+')[0].split('Z')[0];
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '—';
  const d = new Date(); d.setHours(h, m, 0, 0);
  return format(d, 'hh:mm a');
};

const fmtDuration = (mins: number | null | undefined) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const initials = (first?: string | null, last?: string | null) =>
  `${first?.[0] ?? '?'}${last?.[0] ?? ''}`.toUpperCase();

// ── StatusBadge ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  pending:   { cls: 'bg-amber-100 text-amber-800 border-amber-200',    label: 'Pending'   },
  approved:  { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
  rejected:  { cls: 'bg-red-100 text-red-800 border-red-200',          label: 'Rejected'  },
  cancelled: { cls: 'bg-gray-100 text-gray-600 border-gray-200',       label: 'Cancelled' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return <Badge className={cn("text-xs border", cfg.cls)}>{cfg.label}</Badge>;
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['pending', 'approved', 'rejected', 'cancelled'] as const;

const RegularizationApproval = () => {
  const {
    searchTerm, setSearchTerm,
    filteredRequests,
    isLoading,
    activeTab, setActiveTab,
    selectedRequest,
    sheetOpen, setSheetOpen,
    expandedActionId,
    actionType,
    approverNotes, setApproverNotes,
    selectedIds,
    isActioning,
    counts,
    openDetail,
    openInlineAction,
    closeInlineAction,
    handleAction,
    handleBulkApprove,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch,
  } = useRegularizationApproval();

  const [bulkNotes, setBulkNotes] = useState("");
  const isPendingTab = activeTab === 'pending';
  const colCount     = isPendingTab ? 7 : 6;
  const allSelected  = filteredRequests.length > 0
    && selectedIds.length === filteredRequests.length;

  return (
    <div className="content-area space-y-6">

      {/* ── Header Bar ─────────────────────────────────────────────────────── */}
      <div className="pb-5 border-b space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Regularization Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and process employee timesheet correction requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-56 pl-9 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'pending',   label: 'Pending',   bg: 'bg-amber-50 border-amber-200 text-amber-800' },
            { key: 'approved',  label: 'Approved',  bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
            { key: 'rejected',  label: 'Rejected',  bg: 'bg-red-50 border-red-200 text-red-800' },
            { key: 'cancelled', label: 'Cancelled', bg: 'bg-gray-50 border-gray-200 text-gray-600' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => { setActiveTab(s.key); closeInlineAction(); }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                s.bg,
                activeTab === s.key && "ring-2 ring-offset-1 ring-violet-400",
              )}
            >
              <span className="text-base font-extrabold">
                {counts[s.key as keyof typeof counts]}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Tab underline nav */}
        <div className="flex gap-0 border-b -mb-5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); closeInlineAction(); clearSelection(); }}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                activeTab === tab
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              {isPendingTab && (
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Original → Requested</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colCount} className="py-3 px-4">
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-16 text-center">
                  <ClipboardList className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No <span className="font-medium">{activeTab}</span> requests
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map(req => (
                <>
                  {/* ── Data Row ── */}
                  <TableRow
                    key={req.id}
                    className={cn(
                      "hover:bg-gray-50/60 transition-colors",
                      expandedActionId === req.id && "bg-violet-50/30",
                    )}
                  >
                    {isPendingTab && (
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedIds.includes(req.id)}
                          onCheckedChange={() => toggleSelect(req.id)}
                        />
                      </TableCell>
                    )}

                    {/* Employee */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                          {initials(req.employee?.first_name, req.employee?.last_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {req.employee?.first_name} {req.employee?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {req.employee?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <p className="text-sm font-medium">
                        {format(parseISO(req.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(req.date), 'EEEE')}
                      </p>
                    </TableCell>

                    {/* Times */}
                    <TableCell>
                      {(req.original_clock_in || req.original_clock_out) && (
                        <p className="text-xs text-muted-foreground line-through mb-0.5">
                          {fmtTime(req.original_clock_in)} → {fmtTime(req.original_clock_out)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                        <span>{fmtTime(req.requested_clock_in)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>{fmtTime(req.requested_clock_out)}</span>
                      </div>
                    </TableCell>

                    {/* Reason */}
                    <TableCell>
                      <p
                        className="text-sm text-gray-700 max-w-[180px] truncate"
                        title={req.reason}
                      >
                        {req.reason}
                      </p>
                    </TableCell>

                    {/* Submitted */}
                    <TableCell>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}
                      </p>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                          onClick={() => openDetail(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isPendingTab ? (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-colors",
                                expandedActionId === req.id && actionType === 'approve'
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-700",
                              )}
                              onClick={() => openInlineAction(req, 'approve')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-colors",
                                expandedActionId === req.id && actionType === 'reject'
                                  ? "bg-red-100 text-red-700"
                                  : "text-gray-400 hover:bg-red-50 hover:text-red-700",
                              )}
                              onClick={() => openInlineAction(req, 'reject')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <StatusBadge status={req.status} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* ── Inline Action Expansion ── */}
                  {expandedActionId === req.id && isPendingTab && (
                    <TableRow key={`${req.id}-expand`} className="hover:bg-transparent">
                      <TableCell colSpan={colCount} className="p-0">
                        <div className={cn(
                          "mx-4 my-2 rounded-xl border p-4",
                          actionType === 'approve'
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-red-200 bg-red-50/60",
                        )}>
                          <p className={cn(
                            "text-sm font-semibold mb-3",
                            actionType === 'approve' ? "text-emerald-800" : "text-red-800",
                          )}>
                            {actionType === 'approve'
                              ? "✓ Approve this regularization request"
                              : "✗ Reject this regularization request"}
                          </p>
                          <div className="flex gap-3 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px] space-y-1">
                              <Label className="text-xs font-medium">
                                {actionType === 'approve'
                                  ? "Approval notes (optional)"
                                  : "Rejection reason (required)"}
                              </Label>
                              <Textarea
                                value={approverNotes}
                                onChange={e => setApproverNotes(e.target.value)}
                                placeholder={
                                  actionType === 'approve'
                                    ? "Optional notes for the employee…"
                                    : "Explain why this request is being rejected…"
                                }
                                className="min-h-[60px] resize-none text-sm"
                              />
                            </div>
                            <div className="flex gap-2 shrink-0 pb-0.5">
                              <Button
                                size="sm"
                                className={cn(
                                  "gap-1.5",
                                  actionType === 'approve'
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-red-600 hover:bg-red-700 text-white",
                                )}
                                onClick={() => handleAction(req.id)}
                                disabled={
                                  isActioning ||
                                  (actionType === 'reject' && !approverNotes.trim())
                                }
                              >
                                {isActioning
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : actionType === 'approve'
                                    ? <><Check className="h-4 w-4" /> Confirm Approve</>
                                    : <><X className="h-4 w-4" /> Confirm Reject</>}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={closeInlineAction}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Bulk Approve Bar ────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-violet-200 rounded-2xl shadow-2xl px-5 py-3">
          <span className="text-sm font-semibold text-violet-700 whitespace-nowrap">
            {selectedIds.length} selected
          </span>
          <Separator orientation="vertical" className="h-5" />
          <Input
            placeholder="Bulk notes (optional)…"
            value={bulkNotes}
            onChange={e => setBulkNotes(e.target.value)}
            className="w-48 h-8 text-sm"
          />
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 whitespace-nowrap"
            onClick={() => { handleBulkApprove(bulkNotes); setBulkNotes(""); }}
            disabled={isActioning}
          >
            {isActioning
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><CheckCircle2 className="h-4 w-4" /> Approve All</>}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Detail Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[460px] overflow-y-auto"
        >
          {selectedRequest && (
            <RequestDetailSheet request={selectedRequest} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── Detail Sheet Content ──────────────────────────────────────────────────────

const RequestDetailSheet = ({ request }: { request: RegularizationRequest }) => (
  <div className="space-y-5 pt-2">
    <SheetHeader>
      <SheetTitle>Regularization Details</SheetTitle>
      <SheetDescription>
        Submitted {formatDistanceToNow(parseISO(request.created_at), { addSuffix: true })}
      </SheetDescription>
    </SheetHeader>

    {/* Employee card */}
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border">
      <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-700 shrink-0">
        {initials(request.employee?.first_name, request.employee?.last_name)}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">
          {request.employee?.first_name} {request.employee?.last_name}
        </p>
        <p className="text-sm text-muted-foreground truncate">{request.employee?.email}</p>
      </div>
      <div className="ml-auto shrink-0">
        <StatusBadge status={request.status} />
      </div>
    </div>

    {/* Date */}
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-sm font-medium">
          {format(parseISO(request.date), 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(request.date), { addSuffix: true })}
        </p>
      </div>
    </div>

    <Separator />

    {/* Time comparison */}
    <div>
      <p className="text-sm font-semibold mb-3">Time Adjustment</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Original</p>
          <p className="text-sm font-medium">{fmtTime(request.original_clock_in)}</p>
          <ArrowRight className="h-3 w-3 text-muted-foreground my-1.5" />
          <p className="text-sm font-medium">{fmtTime(request.original_clock_out)}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-xs text-violet-600 mb-2 font-semibold">Requested</p>
          <p className="text-sm font-bold text-violet-800">
            {fmtTime(request.requested_clock_in)}
          </p>
          <ArrowRight className="h-3 w-3 text-violet-400 my-1.5" />
          <p className="text-sm font-bold text-violet-800">
            {fmtTime(request.requested_clock_out)}
          </p>
        </div>
      </div>
    </div>

    {/* Linked timesheet */}
    {request.time_log && (
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
        <p className="text-xs font-semibold text-blue-700 mb-2">
          Linked Timesheet Entry
        </p>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Clocked In</p>
            <p className="font-medium">{fmtTime(request.time_log.clock_in_time)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clocked Out</p>
            <p className="font-medium">{fmtTime(request.time_log.clock_out_time)}</p>
          </div>
          {request.time_log.duration_minutes ? (
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{fmtDuration(request.time_log.duration_minutes)}</p>
            </div>
          ) : null}
        </div>
      </div>
    )}

    <Separator />

    {/* Reason */}
    <div>
      <p className="text-sm font-semibold mb-2">Reason</p>
      <div className="rounded-xl bg-gray-50 border p-3 text-sm text-gray-700 leading-relaxed">
        {request.reason}
      </div>
    </div>

    {/* Approver notes */}
    {request.approver_notes && (
      <div>
        <p className="text-sm font-semibold mb-2">
          {request.status === 'approved' ? 'Approval Notes' : 'Rejection Reason'}
        </p>
        <div className={cn(
          "rounded-xl border p-3 text-sm leading-relaxed",
          request.status === 'approved'
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800",
        )}>
          {request.approver_notes}
        </div>
      </div>
    )}
  </div>
);

export default RegularizationApproval;