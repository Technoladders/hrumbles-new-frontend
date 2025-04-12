import React, { useState,useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/careerPage/ui/star';
import { supabase } from "@/integrations/supabase/client";

const SkillsSection = ({ formData, updateFormData }) => {
    const { toast } = useToast();
    const { jobId } = useParams<{ jobId: string }>();
    const [jobsData, setJobsData] = useState([]);
    const skills = formData.skills || []; // Ensure skills is always an array

    console.log("skills data", jobsData)
  
    const addSkill = () => {
      const updatedSkills = [...skills, { name: '', rating: 3 }];
      updateFormData({ ...formData, skills: updatedSkills });
    };
  
    const updateSkill = (index, field, value) => {
      const updatedSkills = [...skills];
      updatedSkills[index][field] = value;
      updateFormData({ ...formData, skills: updatedSkills });
    };
  
    const removeSkill = (index) => {
      const updatedSkills = skills.filter((_, i) => i !== index);
      updateFormData({ ...formData, skills: updatedSkills });
    };

    useEffect(() => {
        const fetchJobSkills = async () => {
            if (!jobId) return; // Ensure jobId is available
    
            const { data, error } = await supabase
                .from('hr_jobs')
                .select('skills') // Fetch only the skills column
                .eq('id', jobId) 
                .single(); // Expecting a single job result
    
            if (error) {
                toast({ 
                    title: 'Error fetching job skills', 
                    description: error.message, 
                    variant: 'destructive' 
                });
            } else {
                // Initialize skills with ratings
                const formattedSkills = data.skills.map(skill => ({ name: skill, rating: 0 }));
                setJobsData(formattedSkills);
                updateFormData({ ...formData, skills: formattedSkills }); // Store in form data as well
            }
        };
    
        fetchJobSkills();
    }, [jobId]);
    
    
    
  
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Rate Your Skills</h3>
            {jobsData.map((skill, index) => (
                <div key={index} className="flex items-center space-x-4">
                    <p className="text-md font-medium">{skill.name}</p>
                    <StarRating 
                        rating={skill.rating} 
                        onRate={(value) => updateSkill(index, 'rating', value)} 
                    />
                </div>
            ))}
        </div>
    );
    
  };
  
  export default SkillsSection;
  

