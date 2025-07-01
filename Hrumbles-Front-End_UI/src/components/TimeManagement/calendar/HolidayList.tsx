
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Holiday } from "@/types/time-tracker-types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HolidayListProps {
  holidays: Holiday[];
}

export const HolidayList = ({ holidays }: HolidayListProps) => {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarDays className="h-5 w-5" />
          Official Holidays
        </CardTitle>
        <CardDescription>
          Official holidays for the current month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[240px] pr-4">
          {holidays.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No holidays for this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holidays.map((holiday) => (
                <div 
                  key={holiday.id} 
                  className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-accent/5 transition-colors"
                >
                  <div>
                    <div className="font-medium">{holiday.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(holiday.date), "MMMM d, yyyy")}
                    </div>
                  </div>
                  <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground">Holiday</Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
