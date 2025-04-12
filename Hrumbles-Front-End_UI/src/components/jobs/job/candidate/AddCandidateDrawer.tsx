import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { JobData, CandidateStatus } from "@/lib/types";
import BasicInformationTab from "./BasicInformationTab";
import SkillInformationTab from "./SkillInformationTab";
import { createCandidate, updateCandidate, updateCandidateSkillRatings } from "@/services/candidateService";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";


interface AddCandidateDrawerProps {
  job: JobData;
  onCandidateAdded: () => void;
  candidate?: Candidate;
  open?: boolean;        // Add this
  onOpenChange?: (open: boolean) => void;  // Add this
}

export type CandidateFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[];
  totalExperience: number;
  relevantExperience: number;
  totalExperienceMonths?: number;
  relevantExperienceMonths?: number;
  experience?: string; 
  resume: string | null; 
  skills: Array<{
    name: string;
    rating: number;
  }>;
  location?: string;       // Make optional
  expectedSalary?: number; // Make optional
  currentSalary?: number;  // Make optional
};

const AddCandidateDrawer = ({ job, onCandidateAdded, candidate, open, onOpenChange }: AddCandidateDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const user = useSelector((state: any) => state.auth.user);
  const isEditMode = !!candidate;

  // Use controlled open state if provided, otherwise use internal state
  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledOnOpenChange = onOpenChange || setIsOpen;

  console.log("user", user)

  const basicInfoForm = useForm<CandidateFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      currentLocation: "",
      preferredLocations: [],
      totalExperience: undefined, // Changed to undefined
    totalExperienceMonths: undefined,
    relevantExperience: undefined, // Changed to undefined
    relevantExperienceMonths: undefined,
    currentSalary: undefined, // Changed to undefined
    expectedSalary: undefined,
      resume: null,
      skills: []
    }
  });

  const skillsForm = useForm<CandidateFormData>({
    defaultValues: {
      skills: job.skills?.map(skill => ({ name: skill, rating: 0 })) || []
    }
  });
  
  const handleClose = () => {
    basicInfoForm.reset();
    skillsForm.reset();
    setCandidateId(isEditMode ? candidate?.id.toString() : null);
    setActiveTab("basic-info");
    controlledOnOpenChange(false); // Use controlled handler
  };
  
// Inside the component
const watchedValues = basicInfoForm.watch(); // Watches all form fields

useEffect(() => {
  console.log("Basic Information Tab Data:", watchedValues);
}, [watchedValues]); // Logs whenever the form values change

const handleSaveBasicInfo = async (data: CandidateFormData) => {
  console.log("Form Data Before Saving:", data); // Log the data

  try {
    if (!job.id) {
      toast.error("Job ID is missing");
      return;
    }

    const appliedFrom = user?.user_metadata
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : "Unknown";

      const createdby = user?.id

      // Format experience string to include months
      const formatExperience = (years: number, months?: number) => {
        const yearsStr = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
        const monthsStr = months && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
        return [yearsStr, monthsStr].filter(Boolean).join(" and ") || "0 years";
      };

    // Create a new candidate with basic information
    const candidateData = {
      id: candidateId || "",
      name: `${data.firstName} ${data.lastName}`,
      status: "Screening" as CandidateStatus,
      experience: formatExperience(data.totalExperience, data.totalExperienceMonths),
      matchScore: 0,
      appliedDate: new Date().toISOString().split('T')[0],
      skills: [],
      email: data.email,
      phone: data.phone,
      currentSalary: data.currentSalary,
      expectedSalary: data.expectedSalary,
      location: "",
      appliedFrom,
      resumeUrl: data.resume, // Ensure this is set correctly
      createdBy: createdby,
      metadata: {
        currentLocation: data.currentLocation,
        preferredLocations: data.preferredLocations,
        totalExperience: data.totalExperience,
        totalExperienceMonths: data.totalExperienceMonths, // Added
        relevantExperience: data.relevantExperience,
        relevantExperienceMonths: data.relevantExperienceMonths,
        currentSalary: data.currentSalary,
        expectedSalary: data.expectedSalary,
        resume_url: data.resume, // Optional: include in metadata as well
      }
    };

    console.log("Candidate Data to be Sent:", candidateData); // Log candidate data

    if (!candidateId) {
      // Create new candidate
      const newCandidate = await createCandidate(job.id, candidateData);
      setCandidateId(newCandidate.id);
      toast.success("Basic information saved successfully");
    } else {
      // Update existing candidate
      await updateCandidate(candidateId, candidateData);
      toast.success("Basic information updated successfully");
    }

    // Move to skills tab
    setActiveTab("skills-info");

  } catch (error) {
    console.error("Error saving candidate basic info:", error);
    toast.error("Failed to save basic information");
  }
};
  
const handleSaveSkills = async (data: CandidateFormData) => {
  try {
    if (!candidateId || !job.id) {
      toast.error("Candidate ID or Job ID is missing");
      return;
    }

    // Update only the skill_ratings field
    await updateCandidateSkillRatings(candidateId, data.skills);
    
    toast.success("Skills updated successfully");
    onCandidateAdded();
    handleClose();
  } catch (error) {
    console.error("Error saving candidate skills:", error);
    toast.error("Failed to save skills information");
  }
};
// Function to fetch candidate by ID
const fetchCandidateById = async (id: string) => {
  const { data, error } = await supabase
    .from('hr_job_candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching candidate:", error);
    return null;
  }

  return data;
};
  
  // Calculate a simple match score based on skill ratings (0-100)
  const calculateMatchScore = (skills: Array<{name: string, rating: number}>) => {
    if (skills.length === 0) return 0;
    
    const totalPossibleScore = skills.length * 5; // 5 is max rating
    const actualScore = skills.reduce((sum, skill) => sum + skill.rating, 0);
    
    return Math.round((actualScore / totalPossibleScore) * 100);
  };
  
  return (
    <Sheet open={controlledOpen} 
    onOpenChange={controlledOnOpenChange} >
      <SheetTrigger asChild>
        <Button 
          id={isEditMode ? "edit-candidate-btn" : "add-candidate-btn"} 
          onClick={() => controlledOnOpenChange(true)}
        >
          {isEditMode ? "Edit Candidate" : "Add Candidate"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Add New Candidate</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
            <TabsTrigger 
              value="skills-info" 
              disabled={!candidateId}
            >
              Skill Information
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic-info">
            <BasicInformationTab 
              form={basicInfoForm} 
              onSaveAndNext={(data) => handleSaveBasicInfo(data)}
              onCancel={handleClose}
            />
          </TabsContent>
          
          <TabsContent value="skills-info">
            <SkillInformationTab 
              form={skillsForm}
              jobSkills={job.skills || []}
              onSave={(data) => handleSaveSkills(data)}
              onCancel={handleClose}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AddCandidateDrawer;