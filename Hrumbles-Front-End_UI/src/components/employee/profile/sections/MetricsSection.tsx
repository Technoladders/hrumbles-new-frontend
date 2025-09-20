import React from "react";
import TimeTracker from "@/pages/TimeManagement/employee/TimeTracker";
import { CalendarCard } from "../cards/CalendarCard";
import { CandidateTimelineCard } from "../cards/CandidateTimelineCard";
// import { SubmissionChartCard } from "../cards/SubmissionChartCard";
import { OnboardingChartCard } from "../cards/OnboardingChartCard";
import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import CombinedSubmissionOnboardingChart from '@/components/employee/profile/cards/SubmissionChartCard';

interface MetricsSectionProps {
  employeeId: string;
  department: string;
  role: string;
  user: any;
  organizationId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId, department, role, organizationId, user }) => {
  const carouselEmployeeId = role === 'employee' ? employeeId : undefined;

  console.log("MetricsSection props:", { employeeId, department, role, organizationId, user });

  // --- START: MODIFIED LOGIC ---
  // This flag is now more specific. It's true for HR employees,
  // OR for admins who are NOT in the "Sales & Marketing" department.
  const showRecruitingWidgets = 
    (role === 'employee' && department === "Human Resource") ||
    (role === 'admin' && department !== "Sales & Marketing");
  // --- END: MODIFIED LOGIC ---
  

  return (
    <div className="space-y-6">
      {/* ROW 1: Three-Column Layout for Key Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
        <DashboardHeroCarousel 
          organizationId={organizationId} 
          employeeId={carouselEmployeeId}
          user={user}
        />
        </div>
        <div className="lg:col-span-5">
        <TimeTracker employeeId={employeeId} />
        </div>
        {/* Use the new, smarter flag to control the "View Jobs" link */}
        <div className="lg:col-span-2">
        <QuickActionsCard showJobsLink={showRecruitingWidgets} />
        </div>
        
      </div>

      {/* ROW 2: Two-Column Layout for Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Use the new flag to decide if the timeline card should render */}
        <div className="lg:col-span-1">
        {showRecruitingWidgets ? (
          <CandidateTimelineCard employeeId={employeeId} />
        ) : (
          // This space is now correctly left blank for Sales Admins,
          // allowing the layout to remain balanced. It could be used
          // for a future "Sales Pipeline" card.
          <div /> 
        )}
        </div>
        <div className="lg:col-span-2">
        <CalendarCard 
          employeeId={employeeId} 
          // This prop also uses the new flag to control interview visibility
          isHumanResourceEmployee={showRecruitingWidgets}
          role={role} 
          organizationId={organizationId}
        />
        </div>
      </div>
      
      {/* ROW 3: Conditional Charts for HR/Admins */}
      {/* The charts will also correctly hide based on the new flag */}
      {showRecruitingWidgets && (
        <div className="w-full h-[300px] md:h-[325px] lg:h-[300px]">
          <SubmissionChartCard employeeId={employeeId} role={role} organizationId={organizationId} />
          {/* <OnboardingChartCard employeeId={employeeId} role={role} /> */}
        </div>
      )}
    </div>
  );
};

export const SubmissionChartCard = CombinedSubmissionOnboardingChart;