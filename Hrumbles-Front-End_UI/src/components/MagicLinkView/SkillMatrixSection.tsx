import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
 
interface SkillMatrixSectionProps {
  skillRatings: Array<{
    name: string;
    rating: number;
    experienceYears?: number;
    experienceMonths?: number;
  }>;
}
 
export const SkillMatrixSection: React.FC<SkillMatrixSectionProps> = ({
  skillRatings,
}) => {
  console.log("skillMatrix rating", skillRatings);
 
  if (!skillRatings || skillRatings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No skill ratings available
      </div>
    );
  }
 
  // Sort skills by rating in descending order
  const sortedSkills = [...skillRatings].sort((a, b) => b.rating - a.rating);
 
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-purple-500 text-purple-500"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
        <span className="text-sm font-semibold text-gray-500 ml-1.5">
          {rating}/5
        </span>
      </div>
    );
  };
 
  const getExperienceText = (skill: typeof sortedSkills[0]) => {
    const years = skill.experienceYears || 0;
    const months = skill.experienceMonths || 0;
   
    if (years > 0 && months > 0) {
      return `${years}.${months} years`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    return '0 years';
  };
 
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Skill Matrix</h3>
     
      {/* --- MODIFICATION START --- */}
      {/* Replaced the grid of cards with a single container for skill rows */}
      <div className="space-y-1 max-h-[45rem] overflow-y-auto pr-3">
        {sortedSkills.map((skill, index) => (
          // Each skill is now a single row with padding and a bottom border
          <div
            key={index}
            className="flex flex-wrap items-center justify-between gap-4 p-3 border-b border-gray-100 last:border-b-0 hover:bg-purple-50 rounded-md transition-colors"
          >
            {/* Skill Name (left-aligned) */}
            <h4 className="text-sm  text-gray-800 flex-1">
              {skill.name}
            </h4>
           
            {/* Experience and Stars (right-aligned) */}
            <div className="flex items-center gap-x-4 gap-y-2 flex-shrink-0">
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs font-semibold px-2.5 py-1">
                {getExperienceText(skill)}
              </Badge>
             
              <div className="w-28"> {/* Fixed width container for stars to align them neatly */}
                {renderStars(skill.rating)}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* --- MODIFICATION END --- */}
    </div>
  );
};