
import React from "react";
import { WorkTimeCard } from "../cards/WorkTimeCard";
import { TimeTrackerCard } from "../cards/TimeTrackerCard";
import { OnboardingTasksCard } from "../cards/OnboardingTasksCard";
import { OnboardingProgressCard } from "../cards/OnboardingProgressCard";
import { CalendarCard } from "../cards/CalendarCard";

interface MetricsSectionProps {
  employeeId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId }) => {
  return (
    <>

       <div className="h-[350px]">
        <TimeTrackerCard employeeId={employeeId} />
      </div>
      
      <div className="h-[350px]">
        <WorkTimeCard employeeId={employeeId} />
      </div>

    
      <div className="h-[350px]">
        <OnboardingTasksCard />
      </div>

      <div className="h-[350px]">
        <OnboardingProgressCard />
      </div>

      <div className="md:col-span-1 lg:col-span-1 xl:col-span-2 h-[300px]">
        <CalendarCard />
      </div>
    </>
  );
};
