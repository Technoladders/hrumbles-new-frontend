
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
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPreviousYear} title="Previous Year">
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onPreviousMonth} title="Previous Month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="min-w-[140px]">{currentMonthName}</Button>
      <Button variant="outline" size="icon" onClick={onNextMonth} title="Next Month">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onNextYear} title="Next Year">
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
