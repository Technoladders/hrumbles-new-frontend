
import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";

export const OnboardingProgressCard = () => {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Onboarding Progress</h3>
        <div className="text-xl font-bold">18%</div>
      </div>
      <Progress value={18} className="mb-6" />
      <div className="space-y-4 flex-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tasks Completed</span>
          <span className="font-medium">2/8</span>
        </div>
        <div className="space-y-6">
          {[30, 25, 0].map((progress, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <Progress value={progress} />
              </div>
              <span className="text-sm font-medium w-12 text-right">{progress}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
