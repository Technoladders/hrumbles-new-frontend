// src/components/jobs/job/candidate/AiCandidateFinalizeDrawer.tsx
// NEW COMPONENT

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { JobData, CandidateStatus } from "@/lib/types";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";

// RE-USE the same form components and data types
import BasicInformationTab from "./BasicInformationTab";
import SkillInformationTab from "./SkillInformationTab";
import ProofIdTab from "./ProofIdTab";
import { CandidateFormData } from "./AddCandidateDrawer"; // Reuse the type


import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// RE-USE the same services
import { createCandidate, updateCandidate, updateCandidateSkillRatings } from "@/services/candidateService";

interface AiCandidateFinalizeDrawerProps {
  job: JobData;
  initialData: Partial<CandidateFormData>; // This drawer ALWAYS receives initial data
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCandidateAdded: () => void; // To refresh the list
}

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
  .number({
    required_error: "Total experience (years) is required",
    invalid_type_error: "Enter a valid number",
  })
  .min(0, "Cannot be negative"),

totalExperienceMonths: z
  .number({
    required_error: "Total experience (months) is required",
    invalid_type_error: "Enter a valid number",
  })
  .min(0)
  .max(11, "Max 11 months"),
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
  .number({
    required_error: "Current salary is required",
    invalid_type_error: "Enter a valid number",
  })
  .min(0, "Cannot be negative"),

expectedSalary: z
  .number({
    required_error: "Expected salary is required",
    invalid_type_error: "Enter a valid number",
  })
  .min(0, "Cannot be negative"),
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

const AiCandidateFinalizeDrawer = ({ job, initialData, open, onOpenChange, onCandidateAdded }: AiCandidateFinalizeDrawerProps) => {
  const [activeTab, setActiveTab] = useState("basic-info");
  const [candidateId, setCandidateId] = useState<string | null>(null); // This will be set after the first save
  const [isSaving, setIsSaving] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  
  // Forms setup - identical to the other drawer
  const basicInfoForm = useForm<CandidateFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: initialData, // Use the initial data directly
  });

  const skillsForm = useForm<CandidateFormData>({
    resolver: zodResolver(skillsSchema),
    defaultValues: { skills: initialData.skills || [] }
  });

  const proofIdForm = useForm<CandidateFormData>({
    defaultValues: { uan: "", pan: "", pf: "", esicNumber: "" },
  });

  // Effect to populate form when the drawer opens with new data
  useEffect(() => {
    if (open && initialData) {
      console.log("Finalize Drawer received initial data:", initialData);
      basicInfoForm.reset(initialData);
      skillsForm.reset({ 
        skills: initialData.skills && initialData.skills.length > 0 
          ? initialData.skills 
          : job.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: 0, experienceMonths: 0 })) || []
      });
      proofIdForm.reset();
      // Reset state for a new candidate
      setCandidateId(null);
      setActiveTab("basic-info");
    }
  }, [open, initialData, job.skills]);

  const handleClose = () => {
    onOpenChange(false);
  };

  console.log("Basic Info Form Values:", basicInfoForm.getValues());

  // --- SAVE LOGIC ---
  // This logic is mostly copied, but simplified since we know we are always creating.

const handleSaveBasicInfo = async (data: CandidateFormData) => {
    if (!job.id) return toast.error("Job ID is missing");

    try {
      // Check for duplicates first
      const { data: duplicate } = await supabase
        .from("hr_job_candidates")
        .select("id")
        .eq("job_id", job.id)
        .or(`email.eq.${data.email},phone.eq.${data.phone}`)
        .maybeSingle();

      if (duplicate) {
        toast.error("A candidate with this email or phone already exists for this job.");
        return;
      }

      // Utility to format experience string
      const formatExperience = (years?: number, months?: number) => {
        const yearsStr = years && years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
        const monthsStr = months && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
        return [yearsStr, monthsStr].filter(Boolean).join(" and ") || "0 years";
      };

      // Build the complete payload for the createCandidate service
      const appliedFrom = user?.user_metadata ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : "Unknown";
      
      const payload = {
        name: `${data.firstName} ${data.lastName}`,
        status: "Screening" as CandidateStatus,
        experience: formatExperience(data.totalExperience, data.totalExperienceMonths),
        matchScore: 0, // Will be calculated later if needed
        appliedDate: new Date().toISOString().split('T')[0],
        email: data.email,
        phone: data.phone,
        currentSalary: data.currentSalary,
        expectedSalary: data.expectedSalary,
        location: data.currentLocation,
        appliedFrom,
        resumeUrl: data.resume,
        createdBy: user?.id,
        // The metadata object is crucial
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
        },
        skillRatings: skillsForm.getValues().skills // Also pass the initial skills
      };

      const newCandidate = await createCandidate(job.id, payload);
      setCandidateId(newCandidate.id);
      toast.success("Candidate created. Please review and rate skills.");
      setActiveTab("skills-info");

    } catch (error: any) {
      console.error("Error creating candidate:", error);
      toast.error(`Failed to save candidate: ${error.message}`);
    }
  };


  const handleSaveSkills = async (data: CandidateFormData) => {
    if (!candidateId) return toast.error("Candidate ID is missing.");
    try {
      await updateCandidateSkillRatings(candidateId, data.skills);
      toast.success("Skills saved.");
      setActiveTab("proof-id");
    } catch (error) {
      // ... error handling
    }
  };

  const handleSaveAndFinish = async (data: CandidateFormData) => {
    if (!candidateId) return toast.error("Candidate ID is missing.");
    setIsSaving(true);
    try {
      const proofIdPayload = { /* ... build proof ID payload ... */ };
      await updateCandidate(candidateId, proofIdPayload);
      toast.success("Candidate details saved successfully!");
      onCandidateAdded(); // Signal parent to refresh
      handleClose();
    } catch (error) {
      // ... error handling
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Finalize and Add Candidate from Analysis</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic-info">1. Verify Basic Info</TabsTrigger>
            <TabsTrigger value="skills-info" disabled={!candidateId}>2. Rate Skills</TabsTrigger>
            <TabsTrigger value="proof-id" disabled={!candidateId}>3. Add Proof ID</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic-info">
            {/* --- REUSE THE FORM TAB --- */}
            <BasicInformationTab 
              form={basicInfoForm} 
              onSaveAndNext={handleSaveBasicInfo}
              onCancel={handleClose}
              onParseComplete={() => {}} // This can be a no-op since data is already parsed
            />
          </TabsContent>
          
          <TabsContent value="skills-info">
            {/* --- REUSE THE FORM TAB --- */}
            <SkillInformationTab 
              form={skillsForm}
              jobSkills={job.skills || []}
              onSave={handleSaveSkills}
              onCancel={handleClose}
            />
          </TabsContent>

          <TabsContent value="proof-id">
            {/* --- REUSE THE FORM TAB --- */}
            <ProofIdTab
              form={proofIdForm}
              onSave={handleSaveAndFinish} // Final save button
              onCancel={handleClose}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AiCandidateFinalizeDrawer;