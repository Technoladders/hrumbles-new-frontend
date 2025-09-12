import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SkillRatingItemProps {
  skill: string;
  rating: number;
  experienceYears: number | undefined;
  experienceMonths: number | undefined;
  isJobSkill: boolean;
  onRatingChange: (rating: number) => void;
  onExperienceYearsChange: (newExperienceYears: number) => void;
  onExperienceMonthsChange: (newExperienceMonths: number) => void;
  onRemove: () => void;
}

const SkillRatingItem = ({
  skill,
  rating,
  experienceYears,
  experienceMonths,
  isJobSkill,
  onRatingChange,
  onExperienceYearsChange,
  onExperienceMonthsChange,
  onRemove,
}: SkillRatingItemProps) => {
  const [isYearsFocused, setIsYearsFocused] = useState(false);
  const [isMonthsFocused, setIsMonthsFocused] = useState(false);

  console.log("Skill Rating Item", skill, rating, experienceYears, experienceMonths, isJobSkill)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md space-y-2 sm:space-y-0 sm:space-x-6">
      <div className="flex items-center space-x-2">
        <span className="font-medium">{skill}</span>
      </div>

      <div className="flex items-center justify-end space-x-4 w-full sm:w-auto">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={
              isYearsFocused
                ? experienceYears !== undefined ? experienceYears.toString() : ""
                : experienceYears !== undefined 
                  ? `${experienceYears} ${experienceYears === 1 ? "year" : "years"}`
                  : ""
            }
            onChange={(e) => {
              const numeric = e.target.value.replace(/[^\d]/g, "");
              const parsed = numeric ? parseInt(numeric, 10) : 0;
              onExperienceYearsChange(parsed);
            }}
            onFocus={() => setIsYearsFocused(true)}
            onBlur={() => setIsYearsFocused(false)}
            className="w-28"
            placeholder="Years"
          />
          <Input
            type="text"
            value={
              isMonthsFocused
                ? experienceMonths !== undefined ? experienceMonths.toString() : ""
                : experienceMonths !== undefined 
                  ? `${experienceMonths} ${experienceMonths === 1 ? "month" : "months"}`
                  : ""
            }
            onChange={(e) => {
              const numeric = e.target.value.replace(/[^\d]/g, "");
              const parsed = numeric ? parseInt(numeric, 10) : 0;
              onExperienceMonthsChange(Math.min(parsed, 11));
            }}
            onFocus={() => setIsMonthsFocused(true)}
            onBlur={() => setIsMonthsFocused(false)}
            className="w-28"
            placeholder="Months"
          />
        </div>

        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-5 w-5 cursor-pointer transition-colors",
                star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              )}
              onClick={() => onRatingChange(star)}
            />
          ))}
        </div>

        {!isJobSkill && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default SkillRatingItem;