
import React, { useState } from "react";
import { Filter } from "lucide-react";
import GoalCard from "@/components/goals/dashboard/GoalCard";
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
}

const GoalList: React.FC<GoalListProps> = ({ goals, title = "All Goals" }) => {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const filteredGoals = goals
    .filter((goal) => {
      if (filter === "all") return true;
      if (!goal.assignmentDetails) return false;
      return goal.assignmentDetails.status === filter;
    })
    .sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === "progress-high") {
        const progressA = a.assignmentDetails?.progress || 0;
        const progressB = b.assignmentDetails?.progress || 0;
        return progressB - progressA;
      } else if (sort === "progress-low") {
        const progressA = a.assignmentDetails?.progress || 0;
        const progressB = b.assignmentDetails?.progress || 0;
        return progressA - progressB;
      }
      return 0;
    });

  return (
    <div className="w-full">
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
          {filteredGoals.map((goal, index) => (
            <GoalCard key={goal.id} goal={goal} delay={index * 100} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalList;
