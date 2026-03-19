import { useState } from "react";
import { CalendarDays, Pencil, Trash2, RotateCcw, Globe } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Holiday } from "@/types/time-tracker-types";
import { cn } from "@/lib/utils";

interface HolidayTableProps {
  holidays: Holiday[];
  isLoading: boolean;
  onDeleteHoliday: (id: string) => void;
  onEditHoliday: (holiday: Holiday) => void;
}

const TYPE_STYLES: Record<string, string> = {
  National: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Regional: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  Company:  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
};

export const HolidayTable = ({
  holidays,
  isLoading,
  onDeleteHoliday,
  onEditHoliday,
}: HolidayTableProps) => {
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const formatDate = (dateString: string) => {
    try { return format(parseISO(dateString), "MMM d, yyyy"); }
    catch { return dateString; }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-violet-100 dark:border-violet-900" />
          <div className="w-12 h-12 rounded-full border-4 border-t-violet-600 animate-spin absolute inset-0" />
        </div>
        <p className="text-sm text-muted-foreground">Loading holidays…</p>
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-20 h-20 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center mb-5">
          <CalendarDays className="w-10 h-10 text-violet-300 dark:text-violet-700" />
        </div>
        <p className="text-base font-medium text-foreground mb-1">No holidays this month</p>
        <p className="text-sm">Click "Add Holiday" to mark days off for your organization.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="h-[520px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-2 border-violet-100 dark:border-violet-900">
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300">Holiday Name</TableHead>
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300">Date</TableHead>
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300">Day</TableHead>
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300">Type</TableHead>
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300">Regions</TableHead>
              <TableHead className="font-semibold text-violet-700 dark:text-violet-300 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {holidays.map((holiday, idx) => {
              const past = isPast(parseISO(holiday.date));
              return (
                <TableRow
                  key={holiday.id}
                  className={cn(
                    "transition-colors group",
                    past ? "opacity-60" : "",
                    idx % 2 === 0
                      ? "bg-violet-50/30 dark:bg-violet-950/10"
                      : "bg-background"
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {holiday.name}
                      {holiday.is_recurring && (
                        <Tooltip>
                          <TooltipTrigger>
                            <RotateCcw className="h-3.5 w-3.5 text-violet-400" />
                          </TooltipTrigger>
                          <TooltipContent>Recurring — repeats every year</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {formatDate(holiday.date)}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {holiday.day_of_week}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={cn(
                        "border text-xs font-medium",
                        TYPE_STYLES[holiday.type] ?? TYPE_STYLES.National
                      )}
                    >
                      {holiday.type}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {holiday.applicable_regions ?? "All"}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900"
                            onClick={() => onEditHoliday(holiday)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit holiday</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950"
                            onClick={() => setDeleteTarget(holiday)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete holiday</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-rose-200 dark:border-rose-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Delete holiday?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to delete{" "}
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>{" "}
              on{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget ? formatDate(deleteTarget.date) : ""}
              </span>
              . This cannot be undone and may affect attendance and leave calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (deleteTarget) onDeleteHoliday(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete holiday
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};