// src/components/jobs/job/experience-skills/SkillSelector.tsx

import { useState, KeyboardEvent } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface SkillSelectorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

const SkillSelector = ({ skills, onChange }: SkillSelectorProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddSkill = () => {
    const newSkill = inputValue.trim();
    if (newSkill && !skills.map(s => s.toLowerCase()).includes(newSkill.toLowerCase())) {
      onChange([...skills, newSkill]);
      setInputValue(''); // Clear input after adding
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission on Enter key
      handleAddSkill();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
        <div className="flex gap-2">
          <Input
            id="skills"
            placeholder="e.g., React, Node.js"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" variant="outline" onClick={handleAddSkill}>
            Add
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-20">
        {skills.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 w-full text-center">No skills added yet.</p>
        ) : (
          skills.map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-sm py-1 pl-3 pr-1">
              {skill}
              <button
                type="button"
                className="ml-2 rounded-full hover:bg-gray-300 p-0.5"
                onClick={() => handleRemoveSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillSelector;