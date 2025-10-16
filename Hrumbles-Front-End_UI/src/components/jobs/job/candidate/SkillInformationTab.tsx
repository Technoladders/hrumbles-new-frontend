import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PlusCircle, ListX } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateFormData } from "./AddCandidateDrawer";
import SkillRatingItem from "./SkillRatingItem";

// --- Animation Variants for Framer Motion ---

// Defines the animation for the main section card
const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      when: "beforeChildren", // Ensures parent animates before children
      staggerChildren: 0.1, // Animates children one after another
    } 
  },
};

// Defines the animation for each item in the list
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    x: -30,
    transition: { duration: 0.2 }
  }
};

// Defines the 3D hover effect for input fields
const fieldHoverEffect = {
  hover: { 
    scale: 1.03,
    boxShadow: "0px 10px B0px -5px rgba(123, 97, 255, 0.2)",
    transition: { type: "spring", stiffness: 400, damping: 15 }
  }
};


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
  
  // Normalize skills to ensure it's an array of objects
  const normalizedSkills = Array.isArray(skills)
    ? skills.map(skill => 
        typeof skill === "string" 
          ? { name: skill, rating: 0, experienceYears: undefined, experienceMonths: undefined }
          : skill
      )
    : [];

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    
    if (!trimmedSkill) {
      toast.error("Skill name cannot be empty.");
      return;
    }
    
    if (normalizedSkills.some(s => s.name.toLowerCase() === trimmedSkill.toLowerCase())) {
      toast.error("Skill already exists.");
      return;
    }
    
    const updatedSkills = [...normalizedSkills, { 
      name: trimmedSkill, 
      rating: 0, 
      experienceYears: 0, 
      experienceMonths: 0 
    }];
    form.setValue("skills", updatedSkills);
    setNewSkill("");
  };
  
  const handleRatingChange = (skillName: string, newRating: number) => {
    const updatedSkills = normalizedSkills.map(skill => 
      skill.name === skillName 
        ? { ...skill, rating: newRating } 
        : skill
    );
    form.setValue("skills", updatedSkills);
  };

  const handleExperienceYearsChange = (skillName: string, newExperienceYears: number) => {
    const updatedSkills = normalizedSkills.map(skill => 
      skill.name === skillName 
        ? { ...skill, experienceYears: newExperienceYears } 
        : skill
    );
    form.setValue("skills", updatedSkills);
  };

  const handleExperienceMonthsChange = (skillName: string, newExperienceMonths: number) => {
    const updatedSkills = normalizedSkills.map(skill => 
      skill.name === skillName 
        ? { ...skill, experienceMonths: newExperienceMonths } 
        : skill
    );
    form.setValue("skills", updatedSkills);
  };
  
  const handleRemoveSkill = (skillName: string) => {
    const updatedSkills = normalizedSkills.filter(skill => skill.name !== skillName);
    form.setValue("skills", updatedSkills);
  };

  const validateSkills = (skills: CandidateFormData["skills"]) => {
    if (skills.length === 0) {
      toast.error("At least one skill is required.");
      return false;
    }

    for (const skill of skills) {
      if (skill.rating < 1 || skill.rating > 5) {
        toast.error(`Rating for ${skill.name} must be between 1 and 5.`);
        return false;
      }
      if (skill.experienceYears === undefined || skill.experienceYears === null) {
        toast.error(`Experience years for ${skill.name} is required.`);
        return false;
      }
      if (skill.experienceYears < 0) {
        toast.error(`Experience years for ${skill.name} cannot be negative.`);
        return false;
      }
      if (skill.experienceMonths === undefined || skill.experienceMonths === null) {
        toast.error(`Experience months for ${skill.name} is required.`);
        return false;
      }
      if (skill.experienceMonths < 0 || skill.experienceMonths > 11) {
        toast.error(`Experience months for ${skill.name} must be between 0 and 11.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (data: CandidateFormData) => {
    if (validateSkills(data.skills)) {
      onSave(data);
    }
  };
  
  return (
    <Form {...form}>
      <motion.form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-6 py-4"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <motion.h3 variants={itemVariants} className="text-xl font-bold mb-4 text-gray-800">Candidate Skills</motion.h3>
          
          <motion.div variants={itemVariants} className="flex items-center space-x-2 mb-6">
            <motion.div variants={fieldHoverEffect} whileHover="hover" className="flex-1">
                <Input
                placeholder="Add a new skill (e.g., Python)"
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
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                type="button" 
                onClick={handleAddSkill} 
                className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Skill
                </Button>
            </motion.div>
          </motion.div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {normalizedSkills.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center text-center py-8 text-gray-500 bg-gray-50 rounded-lg"
                >
                  <ListX className="h-10 w-10 mb-2 text-gray-400" />
                  <p className="font-semibold">No skills added yet.</p>
                  <p className="text-sm">Use the input above to add skills and rate the candidate.</p>
                </motion.div>
              ) : (
                normalizedSkills
                  .filter(skill => skill && skill.name) // Ensure valid skills
                  .map(skill => (
                    <motion.div
                      key={skill.name}
                      layout // This prop animates layout changes
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <SkillRatingItem
                        skill={skill.name}
                        rating={skill.rating ?? 0}
                        experienceYears={skill.experienceYears}
                        experienceMonths={skill.experienceMonths}
                        isJobSkill={jobSkills && Array.isArray(jobSkills) ? jobSkills.includes(skill.name) : false}
                        onRatingChange={(newRating) => handleRatingChange(skill.name, newRating)}
                        onExperienceYearsChange={(newExperienceYears) => handleExperienceYearsChange(skill.name, newExperienceYears)}
                        onExperienceMonthsChange={(newExperienceMonths) => handleExperienceMonthsChange(skill.name, newExperienceMonths)}
                        onRemove={() => handleRemoveSkill(skill.name)}
                      />
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <div className="flex justify-end space-x-4 pt-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50">
              Save & Next
            </Button>
          </motion.div>
        </div>
      </motion.form>
    </Form>
  );
};

export default SkillInformationTab;