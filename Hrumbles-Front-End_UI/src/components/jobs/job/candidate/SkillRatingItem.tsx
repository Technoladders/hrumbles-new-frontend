
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SkillRatingItemProps {
  skill: string;
  rating: number;
  isJobSkill: boolean;
  onRatingChange: (rating: number) => void;
  onRemove: () => void;
}

const SkillRatingItem = ({
  skill,
  rating,
  isJobSkill,
  onRatingChange,
  onRemove
}: SkillRatingItemProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md">
      <div className="flex flex-col mb-2 sm:mb-0">
        <div className="flex items-center">
          <span className="font-medium mr-2">{skill}</span>
          {isJobSkill && (
            <Badge variant="outline" className="text-xs">Job Skill</Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-5 w-5 cursor-pointer transition-colors",
                star <= rating 
                  ? "text-yellow-400 fill-yellow-400" 
                  : "text-gray-300"
              )}
              onClick={() => onRatingChange(star)}
            />
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-4 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

export default SkillRatingItem;
