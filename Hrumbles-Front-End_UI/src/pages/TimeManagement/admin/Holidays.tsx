
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { HolidaySelectionDialog } from "@/components/TimeManagement/holidays/HolidaySelectionDialog";
import { HolidayHeader } from "@/components/TimeManagement/holidays/HolidayHeader";
import { MonthNavigation } from "@/components/TimeManagement/holidays/MonthNavigation";
import { HolidayTable } from "@/components/TimeManagement/holidays/HolidayTable";
import { useHolidays } from "@/hooks/TimeManagement/useHolidays";

const Holidays = () => {
  const {
    currentDate,
    holidays,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    handleDeleteHoliday,
    handleAddHolidays,
    changeMonth,
    changeYear,
  } = useHolidays();

  const currentMonthName = format(currentDate, "MMMM yyyy");

  return (
    <div className="content-area">
      <HolidayHeader onAddHolidayClick={() => setIsDialogOpen(true)} />

      <Card className="border-none shadow-md bg-gradient-to-br from-card to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Holiday Calendar</CardTitle>
            <MonthNavigation
              currentMonthName={currentMonthName}
              onPreviousMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onPreviousYear={() => changeYear(-1)}
              onNextYear={() => changeYear(1)}
            />
          </div>
          <CardDescription>
            Official holidays for {currentMonthName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HolidayTable
            holidays={holidays}
            isLoading={isLoading}
            onDeleteHoliday={handleDeleteHoliday}
          />
        </CardContent>
      </Card>
      
      <HolidaySelectionDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddHolidays}
      />
    </div>
  );
};

export default Holidays;
