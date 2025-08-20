// src/components/jobs/ai/steps/AiExperienceSkillsStep.tsx

import ExperienceSelector from "../ui/ExperienceSelector"; // Reusable UI component
import SkillSelector from "../ui/SkillSelector"; // Reusable UI component


interface ExperienceSkillsData {
  minimumYear: number;
  minimumMonth: number;
  maximumYear: number;
  maximumMonth: number;
  skills: string[];
}

interface AiExperienceSkillsStepProps {
  data: ExperienceSkillsData;
  onChange: (data: Partial<ExperienceSkillsData>) => void;
}

const AiExperienceSkillsStep = ({ data, onChange }: AiExperienceSkillsStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Experience & Skills</h3>
        <p className="text-sm text-gray-500">
          Review the required experience and skills for this role.
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
            onYearChange={(year) => onChange({ maximumYear: year })}
            onMonthChange={(month) => onChange({ maximumMonth: month })}
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

export default AiExperienceSkillsStep;
// 