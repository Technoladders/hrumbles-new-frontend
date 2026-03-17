import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, getYear } from "date-fns";
import { HolidaySelectionDialog } from "@/components/TimeManagement/holidays/HolidaySelectionDialog";
import { EditHolidayDialog } from "@/components/TimeManagement/holidays/EditHolidayDialog";
import { WeekendConfigDialog } from "@/components/TimeManagement/holidays/WeekendConfigDialog";
import { HolidayHeader } from "@/components/TimeManagement/holidays/HolidayHeader";
import { MonthNavigation } from "@/components/TimeManagement/holidays/MonthNavigation";
import { HolidayTable } from "@/components/TimeManagement/holidays/HolidayTable";
import { useHolidays } from "@/hooks/TimeManagement/useHolidays";
import { Holiday } from "@/types/time-tracker-types";

const Holidays = () => {
  const {
    currentDate,
    holidays,
    isLoading,
    isDialogOpen,
    stats,
    setIsDialogOpen,
    handleDeleteHoliday,
    handleEditHoliday,
    handleAddHolidays,
    changeMonth,
    changeYear,
  } = useHolidays();

  const [weekendConfigOpen, setWeekendConfigOpen] = useState(false);
  const [editTarget, setEditTarget]               = useState<Holiday | null>(null);

  const currentMonthName = format(currentDate, "MMMM yyyy");

  return (
    <div className="content-area space-y-6">
      {/* Header + Stats */}
      <HolidayHeader
        onAddHolidayClick={() => setIsDialogOpen(true)}
        onWeekendConfigClick={() => setWeekendConfigOpen(true)}
        stats={stats}
        year={getYear(currentDate)}
      />

      {/* Main card */}
      <Card className="border-violet-100 dark:border-violet-900 shadow-sm overflow-hidden">
        {/* Purple accent top bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-violet-800 dark:text-violet-200">
                Holiday Calendar
              </CardTitle>
              <CardDescription>
                {holidays.length} holiday{holidays.length !== 1 ? "s" : ""} in {currentMonthName}
              </CardDescription>
            </div>
            <MonthNavigation
              currentMonthName={currentMonthName}
              onPreviousMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onPreviousYear={() => changeYear(-1)}
              onNextYear={() => changeYear(1)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <HolidayTable
            holidays={holidays}
            isLoading={isLoading}
            onDeleteHoliday={handleDeleteHoliday}
            onEditHoliday={h => setEditTarget(h)}
          />
        </CardContent>
      </Card>

      {/* ── Dialogs ─────────────────────────────────────── */}
      <HolidaySelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddHolidays}
      />

      <EditHolidayDialog
        holiday={editTarget}
        open={!!editTarget}
        onOpenChange={open => !open && setEditTarget(null)}
        onSave={handleEditHoliday}
      />

      <WeekendConfigDialog
        open={weekendConfigOpen}
        onOpenChange={setWeekendConfigOpen}
      />
    </div>
  );
};

export default Holidays;