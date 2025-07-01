
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2 } from "lucide-react";
import { Holiday } from "@/types/time-tracker-types";

interface HolidayTableProps {
  holidays: Holiday[];
  isLoading: boolean;
  onDeleteHoliday: (id: string) => void;
}

export const HolidayTable = ({ holidays, isLoading, onDeleteHoliday }: HolidayTableProps) => {
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg mb-2">No holidays found for this month</p>
        <p className="text-sm">Add holidays to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Holiday Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holidays.map((holiday) => (
            <TableRow key={holiday.id}>
              <TableCell className="font-medium">{holiday.name}</TableCell>
              <TableCell>{formatDate(holiday.date)}</TableCell>
              <TableCell>{holiday.day_of_week}</TableCell>
              <TableCell>
                <Badge className={`${
                  holiday.type === 'Company' ? 'bg-accent text-accent-foreground' : 'bg-warning text-warning-foreground'
                }`}>
                  {holiday.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDeleteHoliday(holiday.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
