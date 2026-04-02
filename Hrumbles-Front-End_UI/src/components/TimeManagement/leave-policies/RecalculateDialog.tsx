import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface RecalculateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (year: number) => void;
  isRecalculating: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function RecalculateDialog({
  open,
  onOpenChange,
  onConfirm,
  isRecalculating,
}: RecalculateDialogProps) {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-amber-200 dark:border-amber-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Recalculate all balances?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1.5">
              <p className="font-semibold">⚠ This affects all employees in your organisation</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Leave balances will be recalculated based on current active policies</li>
                <li>Manual adjustments made this year will be preserved in the ledger but the balance may change</li>
                <li>Employees with pending requests are not affected — only the raw balance</li>
                <li>This only affects your organisation — no other tenants</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Recalculate for year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}{y === CURRENT_YEAR ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-600 hover:bg-amber-700 gap-2"
            onClick={() => onConfirm(selectedYear)}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`} />
            {isRecalculating ? "Recalculating…" : `Recalculate ${selectedYear}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}