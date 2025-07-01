
import { CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const UpcomingEvents = () => {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-card/90">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarIcon className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
        <CardDescription>
          Your scheduled events and reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[240px] pr-4">
          <div className="text-center py-6 text-muted-foreground">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No upcoming events</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
