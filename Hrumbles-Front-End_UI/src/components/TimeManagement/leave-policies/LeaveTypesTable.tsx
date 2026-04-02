import { useState } from "react";
import { LeaveType } from "@/types/leave-types";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase, Pencil, Trash2, CalendarClock, MoreHorizontal,
  Copy, SlidersHorizontal, TrendingUp, Search, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteLeaveTypeDialog } from "./DeleteLeaveTypeDialog";

interface LeaveTypesTableProps {
  leaveTypes: LeaveType[];
  onEdit:         (lt: LeaveType) => void;
  onDelete:       (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onCopy:         (lt: LeaveType) => void;
  onAdjust:       (lt: LeaveType) => void;
}

type SortKey = "name" | "annual_allowance" | "is_active";

const GENDER_FULL: Record<string, string> = {
  Male:   "Male",
  Female: "Female",
  Other:  "Other",
};

const ACCRUAL_LABEL: Record<string, string> = {
  annual_upfront: "Upfront",
  monthly:        "Monthly",
};

export function LeaveTypesTable({
  leaveTypes,
  onEdit,
  onDelete,
  onToggleActive,
  onCopy,
  onAdjust,
}: LeaveTypesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [search, setSearch]             = useState("");
  const [sortKey, setSortKey]           = useState<SortKey>("name");
  const [sortAsc, setSortAsc]           = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = leaveTypes
    .filter((lt) =>
      !search || lt.name.toLowerCase().includes(search.toLowerCase()) ||
      lt.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === "name")             return mul * a.name.localeCompare(b.name);
      if (sortKey === "annual_allowance") return mul * (a.annual_allowance - b.annual_allowance);
      if (sortKey === "is_active")        return mul * (Number(b.is_active) - Number(a.is_active));
      return 0;
    });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn(
        "h-3 w-3",
        sortKey === k ? "text-foreground" : "text-muted-foreground/50"
      )} />
    </button>
  );

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search policies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[220px]">
                  <SortHeader label="Policy Name" k="name" />
                </TableHead>
                <TableHead>
                  <SortHeader label="Allowance" k="annual_allowance" />
                </TableHead>
                <TableHead>Applicability</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>
                  <SortHeader label="Status" k="is_active" />
                </TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        {search ? "No policies match your search." : "No leave policies yet. Create one to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lt) => (
                  <TableRow
                    key={lt.id}
                    className={cn(
                      "group transition-colors",
                      !lt.is_active && "opacity-60 bg-muted/20"
                    )}
                  >
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                          style={{ backgroundColor: lt.color }}
                        >
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{lt.name}</p>
                          {lt.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[160px]">
                              {lt.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Allowance */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold">{lt.annual_allowance} days/yr</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="h-3 w-3" />
                          {ACCRUAL_LABEL[lt.policy_settings?.accrual_frequency ?? "annual_upfront"] ?? "Upfront"}
                        </div>
                      </div>
                    </TableCell>

                    {/* Applicability */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {/* Gender */}
                        {(lt.gender_eligibility?.length < 3) ? (
                          lt.gender_eligibility?.map((g) => (
                            <Badge key={g} variant="outline" className="text-xs px-2 py-0.5">
                              {GENDER_FULL[g] ?? g}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                            All genders
                          </Badge>
                        )}

                        {/* Employment types */}
                        {lt.applicability?.employment_types?.map((et) => (
                          <Badge
                            key={et}
                            className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 border"
                          >
                            {et.replace("_", " ")}
                          </Badge>
                        ))}

                        {/* If no restrictions */}
                        {!lt.applicability?.employment_types?.length &&
                         !lt.applicability?.department_ids?.length &&
                         lt.gender_eligibility?.length === 3 && (
                          <span className="text-xs text-muted-foreground">All employees</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Rules */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lt.policy_settings?.proration && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 cursor-default">
                                Prorated
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Calculated based on joining date</TooltipContent>
                          </Tooltip>
                        )}
                        {(lt.policy_settings?.carry_forward_limit ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="text-[11px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 border cursor-default">
                                CF: {lt.policy_settings.carry_forward_limit}d
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Up to {lt.policy_settings.carry_forward_limit} days carry forward allowed
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {lt.policy_settings?.encashment_allowed && (
                          <Badge variant="outline" className="text-[11px] px-1.5 py-0.5">
                            Encashable
                          </Badge>
                        )}
                        {(lt.policy_settings?.probation_period_days ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 cursor-default">
                                Lock: {lt.policy_settings.probation_period_days}d
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Unavailable for {lt.policy_settings.probation_period_days} days after joining
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={lt.is_active}
                          onCheckedChange={(v) => onToggleActive(lt.id, v)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          lt.is_active ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                          {lt.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions — shown on hover */}
                    <TableCell className="text-right">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onEdit(lt)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit policy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCopy(lt)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAdjust(lt)}>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Adjust balances
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                              onClick={() => setDeleteTarget(lt)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {filtered.length} of {leaveTypes.length} policies
          </p>
        )}
      </div>

      <DeleteLeaveTypeDialog
        leaveType={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={(id) => {
          onDelete(id);
          setDeleteTarget(null);
        }}
      />
    </TooltipProvider>
  );
}