
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskItem } from "../../TaskSection";

export const TasksList: React.FC = () => {
  return (
    <div className="relative h-[220px]">
      <ScrollArea className="h-full pr-4 -mr-4">
        <div className="space-y-1">
          <TaskItem time="Sep 13, 08:50" title="Interview" completed={true} />
          <TaskItem time="Sep 13, 10:30" title="Team-Meeting" completed={true} />
          <TaskItem time="Sep 13, 13:00" title="Project Update" completed={false} />
          <TaskItem time="Sep 13, 14:45" title="Discuss Q3 Goals" completed={false} />
          <TaskItem time="Sep 15, 16:30" title="HR Policy Review" completed={false} />
          <TaskItem time="Sep 16, 09:00" title="Code Review" completed={false} />
          <TaskItem time="Sep 16, 11:30" title="Client Meeting" completed={false} />
          <TaskItem time="Sep 16, 14:00" title="Sprint Planning" completed={false} />
        </div>
      </ScrollArea>

      {/* Subtle gradient to indicate more content */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
};
