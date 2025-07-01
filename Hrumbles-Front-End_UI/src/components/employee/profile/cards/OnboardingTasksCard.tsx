import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GoalInstance {
  goal_type: string;
  period_type: string;
  progress: number;
  period_start: string;
  period_end: string;
}

export const OnboardingTasksCard: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const user = useSelector((state: any) => state.auth.user);
  const [submissionInstances, setSubmissionInstances] = useState<GoalInstance[]>([]);
  const [onboardingInstances, setOnboardingInstances] = useState<GoalInstance[]>([]);
  const [totalSubmissionCount, setTotalSubmissionCount] = useState(0);
  const [totalOnboardingCount, setTotalOnboardingCount] = useState(0);

  useEffect(() => {
    const fetchGoalInstances = async () => {
      if (!user?.id) return;

      try {
        // Fetch total Submission count
        const { data: submissionCounts, error: submissionCountError } = await supabase
          .from("hr_status_change_counts")
          .select("count")
          .eq("candidate_owner", user.id)
          .eq("sub_status_id", "71706ff4-1bab-4065-9692-2a1237629dda");

        if (submissionCountError) throw submissionCountError;
        const totalSubmissions = submissionCounts.reduce((sum, record) => sum + record.count, 0);
        setTotalSubmissionCount(totalSubmissions);

        // Fetch total Onboarding count
        const { data: onboardingCounts, error: onboardingCountError } = await supabase
          .from("hr_status_change_counts")
          .select("count")
          .eq("candidate_owner", user.id)
          .eq("sub_status_id", "c9716374-3477-4606-877a-dfa5704e7680");

        if (onboardingCountError) throw onboardingCountError;
        const totalOnboardings = onboardingCounts.reduce((sum, record) => sum + record.count, 0);
        setTotalOnboardingCount(totalOnboardings);

        // Fetch Submission and Onboarding goals from hr_goals
        const { data: goals, error: goalError } = await supabase
          .from("hr_goals")
          .select("id, name")
          .in("name", ["Submission", "Onboarding"]);

        if (goalError || !goals) throw new Error("Goals not found");

        const submissionGoal = goals.find((g) => g.name === "Submission");
        const onboardingGoal = goals.find((g) => g.name === "Onboarding");

        if (!submissionGoal || !onboardingGoal) throw new Error("Required goals not found");

        // Fetch assigned goals for the user
        const { data: assignedGoals, error: assignedError } = await supabase
          .from("hr_assigned_goals")
          .select("id, goal_id")
          .eq("employee_id", user.id)
          .in("goal_id", [submissionGoal.id, onboardingGoal.id]);

        if (assignedError) throw assignedError;
        if (!assignedGoals || assignedGoals.length === 0) {
          setSubmissionInstances([]);
          setOnboardingInstances([]);
          return;
        }

        const assignedGoalIds = assignedGoals.map((ag) => ag.id);

        // Fetch goal instances
        const { data: instancesData, error: instancesError } = await supabase
          .from("hr_goal_instances")
          .select("assigned_goal_id, period_start, period_end, progress, status")
          .in("assigned_goal_id", assignedGoalIds);

        if (instancesError) throw instancesError;

        // Group instances by goal type and period type
        const currentDate = new Date();
        const submissionPeriodTypes = ["Daily", "Weekly", "Monthly", "Yearly"];
        const onboardingPeriodTypes = ["Monthly", "Yearly"];

        // Process Submission instances
        const submissionGrouped: GoalInstance[] = submissionPeriodTypes.map((periodType) => {
          const filteredInstances = instancesData
            .filter((instance) => {
              const goal = assignedGoals.find((ag) => ag.id === instance.assigned_goal_id);
              if (goal?.goal_id !== submissionGoal.id) return false;
              const start = new Date(instance.period_start);
              const end = new Date(instance.period_end);
              const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
              if (periodType === "Daily" && durationDays <= 1) return true;
              if (periodType === "Weekly" && durationDays > 1 && durationDays <= 7) return true;
              if (periodType === "Monthly" && durationDays > 7 && durationDays <= 31) return true;
              if (periodType === "Yearly" && durationDays > 31) return true;
              return false;
            });

          const activeInstance = filteredInstances
            .filter((instance) => {
              const start = new Date(instance.period_start);
              const end = new Date(instance.period_end);
              return currentDate >= start && currentDate <= end;
            })
            .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())[0];

          const latestInstance = filteredInstances.sort(
            (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
          )[0];

          const instance = activeInstance || latestInstance;

          return {
            goal_type: "Submission",
            period_type: periodType,
            progress: instance ? parseFloat(instance.progress) || 0 : 0,
            period_start: instance ? instance.period_start : "",
            period_end: instance ? instance.period_end : "",
          };
        });

        // Process Onboarding instances
        const onboardingGrouped: GoalInstance[] = onboardingPeriodTypes.map((periodType) => {
          const filteredInstances = instancesData
            .filter((instance) => {
              const goal = assignedGoals.find((ag) => ag.id === instance.assigned_goal_id);
              if (goal?.goal_id !== onboardingGoal.id) return false;
              const start = new Date(instance.period_start);
              const end = new Date(instance.period_end);
              const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
              if (periodType === "Monthly" && durationDays > 7 && durationDays <= 31) return true;
              if (periodType === "Yearly" && durationDays > 31) return true;
              return false;
            });

          const activeInstance = filteredInstances
            .filter((instance) => {
              const start = new Date(instance.period_start);
              const end = new Date(instance.period_end);
              return currentDate >= start && currentDate <= end;
            })
            .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())[0];

          const latestInstance = filteredInstances.sort(
            (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
          )[0];

          const instance = activeInstance || latestInstance;

          return {
            goal_type: "Onboarding",
            period_type: periodType,
            progress: instance ? parseFloat(instance.progress) || 0 : 0,
            period_start: instance ? instance.period_start : "",
            period_end: instance ? instance.period_end : "",
          };
        });

        setSubmissionInstances(submissionGrouped);
        setOnboardingInstances(onboardingGrouped);
      } catch (error) {
        console.error("Error fetching goal data:", error);
        toast.error("Failed to load goal data");
      }
    };

    fetchGoalInstances();
  }, [user?.id, employeeId]);

  // Format period as "MMM D - MMM D"
  const formatPeriod = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-gray-100 to-gray-100 border-none rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance Goals</h2>
      <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
        {/* Submission Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">Submission Goals</h3>
            <span className="text-sm text-gray-600">Overall: {totalSubmissionCount}</span>
          </div>
          <div className="space-y-4">
            {submissionInstances
              .filter((instance) => formatPeriod(instance.period_start, instance.period_end) !== "N/A")
              .map((instance) => (
                <div key={`${instance.goal_type}-${instance.period_type}`} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-600">{instance.period_type}</div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {formatPeriod(instance.period_start, instance.period_end)}
                    </div>
                    <Progress
                      value={instance.progress}
                      className="h-2 bg-gray-200"
                      indicatorClassName="bg-indigo-600"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right">
                    {Math.round(instance.progress)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
        {/* Onboarding Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">Onboarding Goals</h3>
            <span className="text-sm text-gray-600">Overall: {totalOnboardingCount}</span>
          </div>
          <div className="space-y-4">
            {onboardingInstances
              .filter((instance) => formatPeriod(instance.period_start, instance.period_end) !== "N/A")
              .map((instance) => (
                <div key={`${instance.goal_type}-${instance.period_type}`} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-600">{instance.period_type}</div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {formatPeriod(instance.period_start, instance.period_end)}
                    </div>
                    <Progress
                      value={instance.progress}
                      className="h-2 bg-gray-200"
                      indicatorClassName="bg-teal-600"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right">
                    {Math.round(instance.progress)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Submission and onboarding date from joining and submission date not from created_at