// components/SkillMatrixSection.tsx
import React from "react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Skill Matrix</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skillRatings.map((skill, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <p className="text-sm font-medium">{skill.name}</p>
              {skill.experienceYears !== undefined &&
                skill.experienceMonths !== undefined && (
                  <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                    {`${skill.experienceYears}.${skill.experienceMonths} years`}
                  </span>
                )}
              <div className="flex mt-2 sm:mt-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= skill.rating ? "text-yellow-400" : "text-gray-300"
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};