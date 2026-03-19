import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface MonthNavigationProps {
  currentMonthName: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onPreviousYear: () => void;
  onNextYear: () => void;
}

export const MonthNavigation = ({
  currentMonthName,
  onPreviousMonth,
  onNextMonth,
  onPreviousYear,
  onNextYear,
}: MonthNavigationProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousYear}
        title="Previous Year"
        className="h-8 w-8 text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousMonth}
        title="Previous Month"
        className="h-8 w-8 text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="min-w-[140px] text-center font-semibold text-violet-700 dark:text-violet-300 text-sm px-2">
        {currentMonthName}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNextMonth}
        title="Next Month"
        className="h-8 w-8 text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNextYear}
        title="Next Year"
        className="h-8 w-8 text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};