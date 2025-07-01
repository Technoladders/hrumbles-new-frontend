
import React, { useState } from "react";
import { Filter } from "lucide-react";
import GoalCard from "@/components/goals/common/GoalCard";
import { Button } from "@/components/ui/button";
import { GoalWithDetails } from "@/types/goal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GoalListProps {
  goals: GoalWithDetails[];
  title?: string;
  className?: string;
  showAllGoals?: boolean;
}

const GoalList: React.FC<GoalListProps> = ({ goals, title = "All Goals", className = "", showAllGoals = true }) => {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  // Filter goals based on showAllGoals preference (including expired ones if true)
  const dateFilteredGoals = showAllGoals 
    ? goals
    : goals.filter(goal => {
        const now = new Date();
        const endDate = new Date(goal.endDate);
        return endDate >= now;
      });

  // Further filter goals by status
  const filteredGoals = dateFilteredGoals
    .filter((goal) => {
      if (filter === "all") return true;
      if (!goal.assignments || goal.assignments.length === 0) return false;

      // Check status across all assignments
      switch(filter) {
        case "in-progress":
          return goal.assignments.some(a => a.status === "in-progress");
        case "pending":
          return goal.assignments.some(a => a.status === "pending");
        case "completed":
          return goal.assignments.every(a => a.status === "completed");
        case "overdue":
          return goal.assignments.some(a => a.status === "overdue");
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === "progress-high") {
        const progressA = a.overallProgress || 0;
        const progressB = b.overallProgress || 0;
        return progressB - progressA;
      } else if (sort === "progress-low") {
        const progressA = a.overallProgress || 0;
        const progressB = b.overallProgress || 0;
        return progressA - progressB;
      }
      return 0;
    });

  console.log("GoalList - Filtered Goals:", filteredGoals.length);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="in-progress">
                  In Progress
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pending">
                  Pending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="completed">
                  Completed
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="overdue">
                  Overdue
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                <DropdownMenuRadioItem value="newest">
                  Newest First
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  Oldest First
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="progress-high">
                  Highest Progress
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="progress-low">
                  Lowest Progress
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No goals found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((goal, index) => {
            // For each goal, get the most relevant instance to display
            const now = new Date();
            let relevantInstance = goal.instances ? 
              // First try to find a current active instance
              goal.instances.find(inst => {
                const start = new Date(inst.periodStart);
                const end = new Date(inst.periodEnd);
                return start <= now && end >= now;
              }) ||
              // Otherwise get the most recent instance
              goal.instances.sort((a, b) => 
                new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
              )[0]
              : undefined;

            if (!relevantInstance) {
              console.log(`No relevant instance found for goal: ${goal.id}`);
              return null;
            }

            return (
              <GoalCard 
                key={`${goal.id}-${relevantInstance.id}`}
                goal={goal}
                goalInstance={relevantInstance}
                allowManagement={true}
                onUpdate={() => {
                  // Placeholder for refresh logic
                  console.log("Goal updated");
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalList;
