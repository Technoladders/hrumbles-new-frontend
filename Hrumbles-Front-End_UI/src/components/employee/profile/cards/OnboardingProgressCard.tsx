import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GoalInstance {
  period_type: string;
  progress: number;
  period_start: string;
  period_end: string;
}

export const OnboardingProgressCard = () => {
  const user = useSelector((state: any) => state.auth.user);
  const [instances, setInstances] = useState<GoalInstance[]>([]);
  const [totalOnboardingCount, setTotalOnboardingCount] = useState(0);

  useEffect(() => {
    const fetchOnboardingGoalInstances = async () => {
      if (!user?.id) return;

      try {
        // Step 1: Fetch total Onboarding count
        const { data: onboardingCounts, error: countError } = await supabase
          .from("hr_status_change_counts")
          .select("count")
          .eq("candidate_owner", user.id)
          .eq("sub_status_id", "c9716374-3477-4606-877a-dfa5704e7680");

        if (countError) throw countError;

        const total = onboardingCounts.reduce((sum, record) => sum + record.count, 0);
        setTotalOnboardingCount(total);

        // Step 2: Fetch the "Onboarding" goal from hr_goals
        const { data: onboardingGoal, error: goalError } = await supabase
          .from("hr_goals")
          .select("id")
          .eq("name", "Onboarding")
          .single();

        if (goalError || !onboardingGoal) throw new Error("Onboarding goal not found");

        // Step 3: Fetch assigned goals for the user for the "Onboarding" goal
        const { data: assignedGoals, error: assignedError } = await supabase
          .from("hr_assigned_goals")
          .select("id")
          .eq("employee_id", user.id)
          .eq("goal_id", onboardingGoal.id);

        if (assignedError) throw assignedError;
        if (!assignedGoals || assignedGoals.length === 0) {
          setInstances([]);
          return;
        }

        const assignedGoalIds = assignedGoals.map((ag) => ag.id);

        // Step 4: Fetch goal instances for all period types
        const { data: instancesData, error: instancesError } = await supabase
          .from("hr_goal_instances")
          .select("assigned_goal_id, period_start, period_end, progress, status")
          .in("assigned_goal_id", assignedGoalIds);

        if (instancesError) throw instancesError;

        // Step 5: Group instances by period type (Daily, Weekly, Monthly, Yearly)
        const periodTypes = ["Daily", "Weekly", "Monthly", "Yearly"];
        const currentDate = new Date("2025-05-12"); // Current date

        const groupedInstances: GoalInstance[] = periodTypes.map((periodType) => {
          // Filter instances for this period type (assuming period_type is inferred from duration)
          const filteredInstances = instancesData.filter((instance) => {
            const start = new Date(instance.period_start);
            const end = new Date(instance.period_end);
            const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

            if (periodType === "Daily" && durationDays <= 1) return true;
            if (periodType === "Weekly" && durationDays > 1 && durationDays <= 7) return true;
            if (periodType === "Monthly" && durationDays > 7 && durationDays <= 31) return true;
            if (periodType === "Yearly" && durationDays > 31) return true;
            return false;
          });

          // Find the active or most recent instance
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
            period_type: periodType,
            progress: instance ? parseFloat(instance.progress) || 0 : 0,
            period_start: instance ? instance.period_start : "",
            period_end: instance ? instance.period_end : "",
          };
        });

        setInstances(groupedInstances);
      } catch (error) {
        console.error("Error fetching Onboarding goal data:", error);
        toast.error("Failed to load Onboarding goal data");
      }
    };

    fetchOnboardingGoalInstances();
  }, [user?.id]);

  // Format period as "MMM D - MMM D"
  const formatPeriod = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  return (
    <Card className="p-6 card-gradient-wave hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-[#0055D4]">Onboarding Goal</h3>
        <div className="text-sm text-white">Total: {totalOnboardingCount}</div>
      </div>
      <div className="space-y-4 flex-1">
        {instances.map((instance) => (
          <div key={instance.period_type} className="flex items-center gap-2">
            <div className="w-20 text-sm text-white">{instance.period_type}</div>
            <div className="flex-1">
              <div className="text-xs text-gray-300 mb-1">
                {formatPeriod(instance.period_start, instance.period_end)}
              </div>
              <Progress value={instance.progress} />
            </div>
            <span className="text-sm font-medium w-12 text-right text-white">
              {Math.round(instance.progress)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};