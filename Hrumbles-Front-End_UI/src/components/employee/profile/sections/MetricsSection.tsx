import React from "react";
import TimeTracker from "@/pages/TimeManagement/employee/TimeTracker";
import { CalendarCard } from "../cards/CalendarCard";
import { CandidateTimelineCard } from "../cards/CandidateTimelineCard";
import { OnboardingChartCard } from "../cards/OnboardingChartCard";
import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import CombinedSubmissionOnboardingChart from "@/components/employee/profile/cards/SubmissionChartCard";
import { ClientWorkflowChart } from "@/components/dashboard/chart/ClientWorkflowChart";
import { GoalPerformanceChart } from "@/components/dashboard/chart/GoalPerformanceChart";
import { SalesActivityChart } from "@/components/dashboard/chart/SalesActivityChart";
import InterviewWidget from "@/components/dashboard/cards/InterviewWidget";

interface MetricsSectionProps {
  employeeId: string;
  department: string;
  role: string;
  user: any;
  organizationId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({
  employeeId,
  department,
  role,
  organizationId,
  user,
}) => {
  const carouselEmployeeId = role === "employee" ? employeeId : undefined;

  console.log("MetricsSection props:", { employeeId, department, role, organizationId, user });

  // ── Visibility flags ─────────────────────────────────────────────────────
  const isHREmployee = role === "employee" && department === "Human Resource";
  const isAdmin = role === "admin";
  const isSalesTeam = department === "Sales & Marketing";

  const isSunlitOrg = "18836496-1ff5-4c37-b87d-9ad0e911d354"

  // showRecruitingWidgets: HR employees OR admins NOT in Sales & Marketing
  const showRecruitingWidgets =
    isHREmployee || (isAdmin && !isSalesTeam);

    const showCandidateTimeline =
  department === "Human Resource" &&
  (role === "employee" || role === "admin");

  // ── Interview widget flags ────────────────────────────────────────────────
  // Admin → sees ALL org interviews (filterByEmployee = false)
  // HR Employee → sees only interviews they created (filterByEmployee = true, employeeId)
  // Others → hidden
  const showInterviewWidget = isAdmin || isHREmployee;
  const filterInterviewByEmployee = isHREmployee; // admin sees all; HR employee sees their own

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ ROW 1: Carousel + Time Tracker + Quick Actions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <DashboardHeroCarousel
            organizationId={organizationId}
            employeeId={carouselEmployeeId}
            user={user}
          />
        </div>
        <div className="lg:col-span-5">
          <TimeTracker employeeId={employeeId} />
        </div>
        <div className="lg:col-span-3">
           <CandidateTimelineCard employeeId={employeeId} />
        </div>
      </div>

      {/* ═══ ROW 2: Calendar + Interview Widget (or Candidate Timeline fallback) ═══ */}
      {/*
        Fixed row height of 500px so both cards are identical in height.
        CalendarCard fills its column; InterviewWidget scrolls its tab content inside.
      */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        style={{ gridAutoRows: "350px" }}
      >
        {/* Calendar */}
        <div className={`h-full ${showInterviewWidget ? "lg:col-span-8" : "lg:col-span-9"}`}>
          <div
            className="h-full bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <CalendarCard
              employeeId={employeeId}
              isHumanResourceEmployee={showRecruitingWidgets}
              role={role}
              organizationId={organizationId}
            />
          </div>
        </div>

        {/* Right column — same 500px height */}
        <div className={`h-full ${showInterviewWidget ? "lg:col-span-4" : "lg:col-span-3"}`}>
          {showInterviewWidget ? (
            <InterviewWidget
              organizationId={organizationId}
              employeeId={filterInterviewByEmployee ? employeeId : undefined}
              filterByEmployee={filterInterviewByEmployee}
              delay={0.15}
            />
          ) : showRecruitingWidgets ? (
            <CandidateTimelineCard employeeId={employeeId} />
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* ═══ ROW 3: Client Workflow Chart (recruiting roles only) ═══ */}
      {showRecruitingWidgets && (
        <div className="w-full h-[400px]">
          <ClientWorkflowChart
            organizationId={organizationId}
            employeeId={employeeId}
          />
        </div>
      )}

      {/* ═══ ROW 4: Submission + Onboarding Chart (recruiting roles only) ═══ */}
      {showRecruitingWidgets && (
        <div className="w-full h-[300px] md:h-[325px] lg:h-[300px]">
          <SubmissionChartCard
            employeeId={employeeId}
            role={role}
            organizationId={organizationId}
          />
        </div>
      )}

      {/* ═══ ROW 5: Sales Activity (sales team or admin) ═══ */}
      {(isSalesTeam || isAdmin) && (
        <div className="grid grid-cols-1 gap-6">
          <div className="h-[400px]">
            <SalesActivityChart organizationId={organizationId} />
          </div>
        </div>
      )}

      {/* ═══ ROW 6: Goal Performance (all roles) ═══ */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="h-[400px]">
          <GoalPerformanceChart
            organizationId={organizationId}
            employeeId={employeeId}
          />
          <div className="h-8 lg:h-12" />
        </div>
      </div>
    </div>
  );
};

export const SubmissionChartCard = CombinedSubmissionOnboardingChart;