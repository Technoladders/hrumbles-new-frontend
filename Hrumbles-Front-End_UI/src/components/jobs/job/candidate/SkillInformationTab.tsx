
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PlusCircle } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateFormData } from "./AddCandidateDrawer";
import SkillRatingItem from "./SkillRatingItem";

interface SkillInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  jobSkills: string[];
  onSave: (data: CandidateFormData) => void;
  onCancel: () => void;
}

const SkillInformationTab = ({ 
  form, 
  jobSkills,
  onSave, 
  onCancel 
}: SkillInformationTabProps) => {
  const [newSkill, setNewSkill] = useState("");
  
  const skills = form.watch("skills");
  
  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    
    if (!trimmedSkill) return;
    
    // Check if skill already exists
    if (skills.some(s => s.name.toLowerCase() === trimmedSkill.toLowerCase())) {
      return;
    }
    
    // Add new skill with default rating of 3
    const updatedSkills = [...skills, { name: trimmedSkill, rating: 3 }];
    form.setValue("skills", updatedSkills);
    setNewSkill("");
  };
  
  const handleRatingChange = (skillName: string, newRating: number) => {
    const updatedSkills = skills.map(skill => 
      skill.name === skillName 
        ? { ...skill, rating: newRating } 
        : skill
    );
    
    form.setValue("skills", updatedSkills);
  };
  
  const handleRemoveSkill = (skillName: string) => {
    const updatedSkills = skills.filter(skill => skill.name !== skillName);
    form.setValue("skills", updatedSkills);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 py-4">
        <div>
          <h3 className="text-lg font-medium mb-4">Candidate Skills</h3>
          
          {/* Add new skill input */}
          <div className="flex items-center space-x-2 mb-6">
            <Input
              placeholder="Add a new skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={handleAddSkill} 
              size="sm"
              variant="outline"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {/* Skills list with ratings */}
          <div className="space-y-4">
            {skills.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No skills added yet. Add skills to rate the candidate.
              </p>
            ) : (
              skills.map(skill => (
                <SkillRatingItem
                  key={skill.name}
                  skill={skill.name}
                  rating={skill.rating}
                  isJobSkill={jobSkills.includes(skill.name)}
                  onRatingChange={(newRating) => handleRatingChange(skill.name, newRating)}
                  onRemove={() => handleRemoveSkill(skill.name)}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SkillInformationTab;
