import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, subMonths, addMonths } from "date-fns";
 
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
 
export type CalendarProps = React.ComponentProps<typeof DayPicker>;
 
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onSelect,
  ...props
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days");
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
 
  // Quick selection handlers
  const handleQuickSelect = (type: string) => {
    const today = new Date();
    let newDate: Date;
 
    switch (type) {
      case "today":
        newDate = today;
        break;
      case "yesterday":
        newDate = new Date(today.setDate(today.getDate() - 1));
        break;
      case "week":
        newDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case "month":
        newDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      default:
        newDate = today;
    }
 
    setSelectedDate(newDate);
    setCurrentMonth(newDate);
    setViewMode("days");
    if (onSelect) {
      onSelect(newDate);
    }
  };
 
  // Month selection handler
  const handleMonthSelect = (month: number) => {
    const newDate = new Date(selectedDate || new Date());
    newDate.setMonth(month);
    setSelectedDate(newDate);
    setCurrentMonth(newDate);
    setViewMode("days");
    if (onSelect) {
      onSelect(newDate);
    }
  };
 
  // Year selection handler
  const handleYearSelect = (year: number) => {
    const newDate = new Date(selectedDate || new Date());
    newDate.setFullYear(year);
    setSelectedDate(newDate);
    setCurrentMonth(newDate);
    setViewMode("months");
  };
 
  // Month navigation handlers
  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };
 
  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };
 
  // Generate years for scrollable list
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
 
  // Scroll handler for year view
  const yearContainerRef = React.useRef<HTMLDivElement>(null);
 
  React.useEffect(() => {
    if (viewMode === "years" && yearContainerRef.current && selectedDate) {
      const selectedYearElement = yearContainerRef.current.querySelector(
        `[data-year="${selectedDate.getFullYear()}"]`
      );
      if (selectedYearElement) {
        selectedYearElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [viewMode, selectedDate]);
 
  const months = Array.from({ length: 12 }, (_, i) =>
    format(new Date(0, i), "MMMM")
  );
 
  return (
    <div className={cn("rounded-md border bg-white shadow-lg w-[300px]", className)}>
      {/* Header with Quick Selection */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-2">
          {["today", "yesterday", "week", "month"].map((type) => (
            <button
              key={type}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 px-2 text-xs bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
              )}
              onClick={() => handleQuickSelect(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {selectedDate && (
          <div className="text-sm text-gray-600 font-medium">
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        )}
      </div>
 
      {/* Navigation */}
      <div className="flex justify-between items-center p-2 border-b">
        <button
          onClick={viewMode === "days" ? handlePrevMonth : () => setViewMode("days")}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("months")}
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            {viewMode === "days" && format(currentMonth, "MMMM")}
          </button>
          <button
            onClick={() => setViewMode("years")}
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            {viewMode === "days" && format(currentMonth, "yyyy")}
          </button>
        </div>
        <button
          onClick={viewMode === "days" ? handleNextMonth : () => null}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>
 
      {/* Main Content */}
      <div className="p-3">
        {viewMode === "days" && (
          <DayPicker
            showOutsideDays={showOutsideDays}
            month={currentMonth}
            className="w-full"
            classNames={{
              months: "flex flex-col",
              month: "space-y-3",
              caption: "hidden",
              nav: "hidden",
              table: "w-full border-collapse",
              head_row: "flex justify-between",
              head_cell: "w-10 text-gray-500 text-xs font-medium uppercase",
              row: "flex justify-between mt-1",
              cell: "w-10 h-10 text-center text-sm p-0 relative",
              day: cn(
                "w-10 h-10 flex items-center justify-center rounded-full",
                "text-gray-700 hover:bg-blue-50",
                "aria-selected:bg-blue-600 aria-selected:text-white",
                "transition-colors"
              ),
              day_today: "border border-blue-200 bg-blue-50",
              day_outside: "text-gray-400",
              day_disabled: "text-gray-300 cursor-not-allowed",
              ...classNames,
            }}
            onDayClick={(date) => {
              setSelectedDate(date);
              setCurrentMonth(date);
              if (onSelect) {
                onSelect(date);
              }
            }}
            selected={selectedDate}
            {...props}
          />
        )}
 
        {viewMode === "months" && (
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <button
                key={month}
                className={cn(
                  "p-2 text-sm rounded-md",
                  "hover:bg-blue-50 text-gray-700",
                  selectedDate?.getMonth() === index &&
                    "bg-blue-600 text-white hover:bg-blue-700"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
 
        {viewMode === "years" && (
          <div
            ref={yearContainerRef}
            className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            <div className="grid grid-cols-1 gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  data-year={year}
                  className={cn(
                    "p-2 text-sm rounded-md text-left",
                    "hover:bg-blue-50 text-gray-700",
                    selectedDate?.getFullYear() === year &&
                      "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
 
Calendar.displayName = "Calendar";
 
export { Calendar };