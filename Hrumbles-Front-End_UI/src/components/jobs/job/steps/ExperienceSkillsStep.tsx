
import { useState } from "react";
import ExperienceSelector from "./experience-skills/ExperienceSelector";
import SkillSelector from "./experience-skills/SkillSelector";
import { ExperienceSkillsData } from "./experience-skills/types";

interface ExperienceSkillsStepProps {
  data: ExperienceSkillsData;
  onChange: (data: Partial<ExperienceSkillsData>) => void;
}

const ExperienceSkillsStep = ({ data, onChange }: ExperienceSkillsStepProps) => {
  // Calculate total experience in months for validation
  const minTotalMonths = data.minimumYear * 12 + data.minimumMonth;
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Experience & Skills</h3>
        <p className="text-sm text-gray-500">
          Specify the required experience and skills for this job.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExperienceSelector 
            label="Minimum Experience"
            yearsValue={data.minimumYear}
            monthsValue={data.minimumMonth}
            onYearChange={(year) => onChange({ minimumYear: year })}
            onMonthChange={(month) => onChange({ minimumMonth: month })}
            isMinimum={true}
          />
          
          <ExperienceSelector 
            label="Maximum Experience"
            yearsValue={data.maximumYear}
            monthsValue={data.maximumMonth}
            onYearChange={(year) => {
              onChange({ maximumYear: year });
              
              // Ensure max experience is not less than min experience
              const newMaxMonths = year * 12 + data.maximumMonth;
              if (newMaxMonths < minTotalMonths) {
                onChange({ 
                  maximumYear: data.minimumYear,
                  maximumMonth: data.minimumMonth
                });
              }
            }}
            onMonthChange={(month) => {
              onChange({ maximumMonth: month });
              
              // Ensure max experience is not less than min experience
              const newMaxMonths = data.maximumYear * 12 + month;
              if (newMaxMonths < minTotalMonths) {
                onChange({ 
                  maximumYear: data.minimumYear,
                  maximumMonth: data.minimumMonth 
                });
              }
            }}
            minYear={data.minimumYear}
            minMonth={data.minimumMonth}
          />
        </div>
        
        <SkillSelector 
          skills={data.skills}
          onChange={(skills) => onChange({ skills })}
        />
      </div>
    </div>
  );
};

export default ExperienceSkillsStep;
