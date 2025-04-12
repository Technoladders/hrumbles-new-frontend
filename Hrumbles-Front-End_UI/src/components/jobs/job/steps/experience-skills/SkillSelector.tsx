
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Mock skills for the component
const AVAILABLE_SKILLS = [
  "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node.js", 
  "Express", "Python", "Django", "Flask", "Java", "Spring Boot", 
  "C#", ".NET", "PHP", "Laravel", "Go", "Rust", "Swift", "Kotlin", 
  "SQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "GraphQL", 
  "RESTful API", "Docker", "Kubernetes", "AWS", "Azure", "GCP", 
  "CI/CD", "Git", "DevOps", "Agile", "Scrum", "UI/UX", "Figma", 
];

interface SkillSelectorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

const SkillSelector = ({ skills, onChange }: SkillSelectorProps) => {
  const [skillInput, setSkillInput] = useState("");
  
  const handleAddSkill = () => {
    const skill = skillInput.trim();
    
    if (!skill) return;
    
    if (skills.includes(skill)) {
      toast.error("This skill is already added");
      return;
    }
    
    onChange([...skills, skill]);
    setSkillInput("");
  };
  
  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove));
  };
  
  const handleSuggestedSkillClick = (skill: string) => {
    if (skills.includes(skill)) {
      toast.error("This skill is already added");
      return;
    }
    
    onChange([...skills, skill]);
  };
  
  // Filter suggested skills that are not already selected
  const filteredSuggestions = AVAILABLE_SKILLS.filter(
    skill => !skills.includes(skill) && 
    skill.toLowerCase().includes(skillInput.toLowerCase())
  ).slice(0, 5);
  
  return (
    <div className="space-y-4">
      <Label>Skills <span className="text-red-500">*</span></Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Enter skills required for this job"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSkill();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddSkill}
          className="px-4 py-2 bg-button text-white rounded-md hover:bg-button-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add
        </button>
      </div>
      
      {/* Suggested skills */}
      {skillInput && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filteredSuggestions.map(skill => (
            <span
              key={skill}
              onClick={() => handleSuggestedSkillClick(skill)}
              className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
      
      {/* Selected skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {skills.map(skill => (
            <span
              key={skill}
              className="bg-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full flex items-center"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="ml-1.5 focus:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillSelector;
