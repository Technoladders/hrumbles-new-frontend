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
import ProofIdTab from "./ProofIdTab";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface AddCandidateDrawerProps {
  job: JobData;
  onCandidateAdded: () => void;
  candidate?: Candidate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  skills?: Array<{
    name: string;
    rating: number;
    experienceYears: number;
    experienceMonths: number;
  }>;
  location?: string;
  expectedSalary?: number;
  currentSalary?: number;
  noticePeriod?: string;
  lastWorkingDay?: string;
  linkedInId: string;
  isLinkedInRequired?: boolean;
  hasOffers?: "Yes" | "No";
  offerDetails?: string;
  uan?: string;
  pan?: string;
  pf?: string;
  esicNumber?: string;
   career_experience?: any[] | null;
  projects?: any[] | null;
};

// Zod schema for Basic Information tab (excludes skills)
const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .regex(/^\+\d{10,15}$/, "Phone number must include country code and be 10-15 digits")
    .min(1, "Phone number is required"),
  currentLocation: z.string().min(1, "Current location is required"),
  preferredLocations: z.array(z.string()).min(1, "At least one preferred location is required"),
  totalExperience: z
    .number()
    .min(0, "Cannot be negative")
    .optional(),
  totalExperienceMonths: z
    .number()
    .min(0)
    .max(11, "Max 11 months")
    .optional(),
  relevantExperience: z
    .number()
    .min(0, "Cannot be negative")
    .optional(),
  relevantExperienceMonths: z
    .number()
    .min(0)
    .max(11, "Max 11 months")
    .optional(),
  currentSalary: z
    .number()
    .min(0, "Cannot be negative")
    .optional(),
  expectedSalary: z
    .number()
    .min(0, "Cannot be negative")
    .optional(),
  resume: z.string().url("Resume URL is required"),
  noticePeriod: z
    .enum(["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days"])
    .optional(),
  lastWorkingDay: z.string().optional(),
  // **FIX STARTS HERE**
  // 1. Define as a simple optional string. All logic will be in superRefine.
  linkedInId: z.string().optional(), 
  isLinkedInRequired: z.boolean().optional(),
  // **FIX ENDS HERE**
  hasOffers: z.enum(["Yes", "No"]).optional(),
  offerDetails: z.string().optional(),
}).superRefine((data, ctx) => {
  // 2. Implement the full conditional logic here.
  const { isLinkedInRequired, linkedInId } = data;

  // Rule 1: If the field has a value (is not empty), it MUST be a valid URL format.
  // This applies whether it's required or not.
  if (linkedInId && linkedInId.trim() !== '') {
    const urlCheck = z.string().url().safeParse(linkedInId);
    if (!urlCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid LinkedIn URL.",
        path: ["linkedInId"],
      });
    }
  }

  // Rule 2: If the toggle is ON, the field cannot be empty.
  if (isLinkedInRequired && (!linkedInId || linkedInId.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "LinkedIn URL is required.",
      path: ["linkedInId"],
    });
  }
});


// Zod schema for Skills Information tab
const skillsSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      rating: z.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5"),
      experienceYears: z.number().min(0, "Experience years cannot be negative").optional(),
      experienceMonths: z.number().min(0, "Experience months cannot be negative").max(11, "Max 11 months").optional(),
    })
  ).min(1, "At least one skill is required"),
});

const AddCandidateDrawer = ({ job, onCandidateAdded, candidate, open, onOpenChange }: AddCandidateDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const isEditMode = !!candidate;

    const [parsedResumeData, setParsedResumeData] = useState<any | null>(null);

  // Use controlled open state if provided, otherwise use internal state
  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledOnOpenChange = onOpenChange || setIsOpen;

  const basicInfoForm = useForm<CandidateFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      currentLocation: "",
      preferredLocations: [],
      totalExperience: undefined,
      totalExperienceMonths: undefined,
      relevantExperience: undefined,
      relevantExperienceMonths: undefined,
      currentSalary: undefined,
      expectedSalary: undefined,
      resume: null,
      noticePeriod: candidate?.metadata?.noticePeriod || undefined,
      lastWorkingDay: candidate?.metadata?.lastWorkingDay || "",
      linkedInId: candidate?.metadata?.linkedInId || "",
      isLinkedInRequired: true, // Default to true
      hasOffers: candidate?.metadata?.hasOffers || undefined,
      offerDetails: candidate?.metadata?.offerDetails || "",
      uan: candidate?.metadata?.uan || "",
      pan: candidate?.metadata?.pan || "",
      pf: candidate?.metadata?.pf || "",
      esicNumber: candidate?.metadata?.esicNumber || "",
    }
  });

  const skillsForm = useForm<CandidateFormData>({
    resolver: zodResolver(skillsSchema),
    defaultValues: {
      skills: job.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: undefined, experienceMonths: undefined })) || []
    }
  });

  const proofIdForm = useForm<CandidateFormData>({
    defaultValues: {
      uan: candidate?.metadata?.uan || "",
      pan: candidate?.metadata?.pan || "",
      pf: candidate?.metadata?.pf || "",
      esicNumber: candidate?.metadata?.esicNumber || "",
    },
  });
  
  const handleClose = () => {
    basicInfoForm.reset();
    skillsForm.reset();
    proofIdForm.reset();
    setCandidateId(isEditMode ? candidate?.id.toString() : null);
    setParsedResumeData(null); 
    setActiveTab("basic-info");
    controlledOnOpenChange(false);
  };
  
  const watchedValues = basicInfoForm.watch();

  useEffect(() => {
    console.log("Basic Information Tab Data:", watchedValues);
  }, [watchedValues]);

  const checkDuplicateCandidate = async (jobId: string, email: string, phone: string) => {
    const { data, error } = await supabase
      .from("hr_job_candidates")
      .select("id, email, phone")
      .eq("job_id", jobId)
      .or(`email.eq.${email},phone.eq.${phone}`);

    if (error) {
      console.error("Error checking duplicate candidate:", error);
      throw error;
    }

    return data && data.length > 0;
  };

  const handleSaveBasicInfo = async (data: CandidateFormData) => {
    console.log("Form Data Before Saving:", data);

    // Validate form data against schema
    try {
      await basicInfoSchema.parseAsync(data);
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Please fill all required fields correctly.");
      return;
    }

    if (!data.resume) {
      toast.error("Resume is required. Please upload your resume.");
      return;
    }

    if (!job.id) {
      toast.error("Job ID is missing");
      return;
    }

    try {
      const appliedFrom = user?.user_metadata
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
        : "Unknown";
      const createdby = user?.id;

      const formatExperience = (years: number, months?: number) => {
        const yearsStr = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
        const monthsStr = months && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
        return [yearsStr, monthsStr].filter(Boolean).join(" and ") || "0 years";
      };

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
        location: data.currentLocation,
        appliedFrom,
        resumeUrl: data.resume,
        createdBy: createdby,
         career_experience: parsedResumeData?.work_experience || null,
        projects: parsedResumeData?.projects || null,
        metadata: {
          currentLocation: data.currentLocation,
          preferredLocations: data.preferredLocations,
          totalExperience: data.totalExperience,
          totalExperienceMonths: data.totalExperienceMonths,
          relevantExperience: data.relevantExperience,
          relevantExperienceMonths: data.relevantExperienceMonths,
          currentSalary: data.currentSalary,
          expectedSalary: data.expectedSalary,
          resume_url: data.resume,
          noticePeriod: data.noticePeriod,
          lastWorkingDay: data.lastWorkingDay,
          linkedInId: data.linkedInId,
          hasOffers: data.hasOffers,
          offerDetails: data.offerDetails,
          uan: data.uan,
          pan: data.pan,
          pf: data.pf,
          esicNumber: data.esicNumber,
        }
      };

      if (!candidateId) {
        const isDuplicate = await checkDuplicateCandidate(job.id, data.email, data.phone);
        if (isDuplicate) {
          toast.error("Candidate with same email or phone already exists for this job.");
          return;
        }

        const newCandidate = await createCandidate(job.id, candidateData);
        setCandidateId(newCandidate.id);
        toast.success("Basic information saved successfully");
      } else {
        await updateCandidate(candidateId, candidateData);
        toast.success("Basic information updated successfully");
      }

       // MODIFIED: Pass skills from parsed data to the next tab
      if (parsedResumeData?.skills && parsedResumeData.skills.length > 0) {
        skillsForm.setValue("skills", parsedResumeData.skills);
      }

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

      // Validate skills data
      try {
        skillsSchema.parse(data);
      } catch (error) {
        console.error("Skills validation error:", error);
        toast.error("Please provide valid skill ratings.");
        return;
      }

      await updateCandidateSkillRatings(candidateId, data.skills);
      
      toast.success("Skills updated successfully");
      setActiveTab("proof-id");
    } catch (error) {
      console.error("Error saving candidate skills:", error);
      toast.error("Failed to save skills information");
    }
  };

  const handleSaveProofId = async (data: CandidateFormData) => {
    try {
      setIsSaving(true);
      if (!candidateId || !job.id) {
        toast.error("Candidate ID or Job ID is missing");
        return;
      }

      const candidateData = {
        metadata: {
          uan: data.uan || undefined,
          pan: data.pan || undefined,
          pf: data.pf || undefined,
          esicNumber: data.esicNumber || undefined,
        },
      };

      await updateCandidate(candidateId, candidateData);
      toast.success("Proof ID information saved successfully");
      handleClose();
      onCandidateAdded();
    } catch (error) {
      console.error("Error saving proof ID information:", error);
      toast.error("Failed to save proof ID information");
    } finally {
      setIsSaving(false);
    }
  };

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
  
  const calculateMatchScore = (skills: Array<{name: string, rating: number}>) => {
    if (skills.length === 0) return 0;
    
    const totalPossibleScore = skills.length * 5;
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
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl  overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Add New Candidate</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
            <TabsTrigger 
              value="skills-info" 
              disabled={!candidateId}
            >
              Skill Information
            </TabsTrigger>
            <TabsTrigger value="proof-id" disabled={!candidateId}>
              Proof ID
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic-info">
            <BasicInformationTab 
              form={basicInfoForm} 
              onSaveAndNext={(data) => handleSaveBasicInfo(data)}
              onCancel={handleClose}
              onParseComplete={setParsedResumeData}
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
          <TabsContent value="proof-id">
            <ProofIdTab
              form={proofIdForm}
              onSave={(data) => handleSaveProofId(data)}
              onCancel={handleClose}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AddCandidateDrawer;