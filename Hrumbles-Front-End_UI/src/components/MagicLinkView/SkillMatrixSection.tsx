import React from "react";
import { Card } from "@/components/ui/card";
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
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ?"fill-purple-500 text-purple-500"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
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
      {/* Added max-h-[45rem] to set a height limit (approx. 7 rows) and overflow-y-auto to enable scrolling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[45rem] overflow-y-auto pr-2">
      {/* --- MODIFICATION END --- */}
        {sortedSkills.map((skill, index) => (
          <Card 
            key={index}
            className="relative overflow-hidden border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg group"
          >
           <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font text-gray-900 group-hover:text-purple-600 transition-colors">
                    {skill.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs font-semibold">
                      {getExperienceText(skill)}
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      {renderStars(skill.rating)}
                      <span className="text-sm font-semibold text-gray-600 ml-1">
                        {skill.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};