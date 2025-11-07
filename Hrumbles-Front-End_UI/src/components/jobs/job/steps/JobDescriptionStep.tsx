// src/components/jobs/job/steps/JobDescriptionStep.tsx

import { useState } from 'react';
import  supabase  from '../../../../config/supabaseClient'; 
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2, X } from 'lucide-react';

interface Skill {
  name: string;
  category: "IT" | "Non-IT";
}

interface JobDescriptionAndSkillsData {
  description: string;
  skills: Skill[]; 
}

interface JobDescriptionStepProps {
  data: Partial<JobDescriptionAndSkillsData>;
  onChange: (data: Partial<JobDescriptionAndSkillsData>) => void;
}

const JobDescriptionStep = ({ data, onChange }: JobDescriptionStepProps) => {
  const [description, setDescription] = useState(data?.description || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualSkillInput, setManualSkillInput] = useState('');
  
  const currentSkills = data?.skills || [];

  const handleProcessClick = async () => {
    if (description.trim().length < 5) return;
    setIsProcessing(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('process-job-description', {
        body: { jobDescription: description },
      });
      if (error) throw error;
      
      const { full_description, technical_skills, methodologies, related_skills } = responseData;
      const allSkills = [...(technical_skills || []), ...(methodologies || []), ...(related_skills || [])];
      const uniqueSkills = Array.from(new Set(allSkills));

      const skillObjects: Skill[] = uniqueSkills.map(name => ({
        category: ["Agile", "Scrum", "CI/CD", "MLOps"].includes(name) ? "Non-IT" : "IT",
        name
      }));

      setDescription(full_description);
      onChange({ description: full_description, skills: skillObjects });

    } catch (err) {
      console.error("JD processing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSkill = () => {
    const trimmedSkill = manualSkillInput.trim();
    if (trimmedSkill && !currentSkills.some(s => s.name.toLowerCase() === trimmedSkill.toLowerCase())) {
      const newSkill: Skill = { name: trimmedSkill, category: 'IT' };
      onChange({ description, skills: [...currentSkills, newSkill] });
      setManualSkillInput('');
    }
  };
  
  const handleRemoveSkill = (skillToRemove: Skill) => {
    onChange({ description, skills: currentSkills.filter(skill => skill.name !== skillToRemove.name) });
  };

  const itSkills = currentSkills.filter(s => s.category === 'IT');
  const nonItSkills = currentSkills.filter(s => s.category === 'Non-IT');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6 flex flex-col">
        <div className="space-y-2">
          <h3 className="text-lg text-purple-600 font-medium">Job Description</h3>
          <p className="text-sm  text-gray-500">Enter a short phrase or paste a full job description.</p>
        </div>
        <Textarea
          placeholder="e.g., Senior React developer with 5 years experience"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onChange({ ...data, description: e.target.value });
          }}
          className="flex-grow min-h-[400px]"
        />
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            onClick={handleProcessClick}
            disabled={isProcessing || description.length < 5}
            className="w-full"
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {isProcessing ? "Processing..." : "Analyze & Enhance"}
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg text-purple-600 font-medium">Final Skills Review</h3>
          <p className="text-sm text-gray-500">Review, remove, or add skills below.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-600 text-gray-700"> Skills</h4>
            <div className="p-3 border rounded-lg space-y-2 bg-gray-50/50 min-h-[120px]">
              {itSkills.length > 0 ? itSkills.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between bg-white p-2 rounded shadow-sm text-sm">
                  <span>{skill.name}</span>
                  <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                </div>
              )) : <p className="text-xs text-gray-400 text-center py-4">No IT skills found.</p>}
            </div>
          </div>
          {/* <div className="space-y-2"> */}
            {/* <h4 className="font-semibold text-gray-700">Business & Other Skills (Non-IT)</h4>
            <div className="p-3 border rounded-lg space-y-2 bg-gray-50/50 min-h-[120px]">
              {nonItSkills.length > 0 ? nonItSkills.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between bg-white p-2 rounded shadow-sm text-sm">
                  <span>{skill.name}</span>
                  <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                </div>
              )) : <p className="text-xs text-gray-400 text-center py-4">No Non-IT skills found.</p>}
            </div> */}
          {/* </div> */}
        </div>
        <div className="pt-4 border-t">
          <Label htmlFor="manualSkill" className="font-semibold">Add a Missing Skill</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="manualSkill"
              placeholder="e.g., GraphQL"
              value={manualSkillInput}
              onChange={(e) => setManualSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            />
            <Button type="button" onClick={handleAddSkill}>Add Skill</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionStep;