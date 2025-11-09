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
  TabsList, 
  TabsTrigger,
  TabsContent 
} from "@/components/ui/tabs";
import { JobData, Candidate, CandidateData } from "@/lib/types"; // Assuming CandidateData type exists
import BasicInformationTab from "./BasicInformationTab";
import SkillInformationTab from "./SkillInformationTab";
import { createCandidate, editCandidate } from "@/services/candidateService";
import { useSelector } from "react-redux";
import { getJobById } from "@/services/jobService";
import { useQuery } from "@tanstack/react-query";
import ProofIdTab from "./ProofIdTab";
import { FileText, UserPlus } from "lucide-react"; 
import { motion } from "framer-motion"; 

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
  totalExperience?: number;
  totalExperienceMonths?: number;
  relevantExperience?: number;
  relevantExperienceMonths?: number;
  experience?: string;
  resume: string | null;
  skills: Array<{
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
  uan?: string;
  pan?: string;
  pf?: string;
  esicNumber?: string;
  linkedInId?: string;
  isLinkedInRequired?: boolean;
  hasOffers?: "Yes" | "No";
  offerDetails?: string;
    ctc?: number;
  currencyType?: string;
  budgetType?: string;
  joiningDate?: string;
  offerLetterUrl?: string;
  joiningLetterUrl?: string;
};

const AddCandidateDrawer = ({ job, onCandidateAdded, candidate, open, onOpenChange }: AddCandidateDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [candidateId, setCandidateId] = useState<string | null>(candidate?.id || null);
  const [isSaving, setIsSaving] = useState(false); // State for final save button
  const user = useSelector((state: any) => state.auth.user);
  const isEditMode = !!candidate;

  console.log("EditCandidate data", candidate);

  const { 
    data: jobs, 
  } = useQuery({
    queryKey: ['job', job.id],
    queryFn: () => getJobById(job.id || ""),
    enabled: !!job.id,
  });

// In EditCandidateDrawer.tsx

const parseSalaryString = (salaryString?: string | null) => {
    if (!salaryString || typeof salaryString !== 'string') {
        return { amount: undefined, currency: 'INR', period: 'LPA' };
    }
    const cleaned = salaryString.replace(/,/g, '');
    const currencyMatch = cleaned.match(/([$₹])/);
    const currency = currencyMatch ? (currencyMatch[1] === '$' ? 'USD' : 'INR') : 'INR';
    const amountMatch = cleaned.match(/(\d+(\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;
    const periodMatch = cleaned.match(/(LPA|Monthly|Hourly)/i);
    
    // **THE FIX:** Ensure title case ("Monthly"), not uppercase ("MONTHLY")
    const period = periodMatch ? (periodMatch[0].charAt(0).toUpperCase() + periodMatch[0].slice(1).toLowerCase()) : 'LPA';

    return { amount, currency, period };
};

  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledOnOpenChange = onOpenChange || setIsOpen;

  const basicInfoForm = useForm<CandidateFormData>({
    defaultValues: {
      // initial values
    },
  });

  const skillsForm = useForm<CandidateFormData>({
    defaultValues: {
      skills: jobs?.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: 0, experienceMonths: 0 })) || []
    }
  });

  const proofIdForm = useForm<CandidateFormData>({
    defaultValues: {
      uan: "",
      pan: "",
      pf: "",
      esicNumber: "",
    },
  });

  useEffect(() => {
    if (candidate && isEditMode) {
      const { amount, currency, period } = parseSalaryString(candidate.ctc);
      const joiningDate = candidate.joining_date ? candidate.joining_date.split('T')[0] : "";
      setCandidateId(candidate.id);
      basicInfoForm.reset({
        firstName: candidate.name.split(" ")[0] || "",
        lastName: candidate.name.split(" ").slice(1).join(" ") || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        currentLocation: candidate.metadata?.currentLocation || candidate.location || "",
        preferredLocations: candidate.metadata?.preferredLocations || [],
        totalExperience: candidate.metadata?.totalExperience,
        totalExperienceMonths: candidate.metadata?.totalExperienceMonths,
        relevantExperience: candidate.metadata?.relevantExperience,
        relevantExperienceMonths: candidate.metadata?.relevantExperienceMonths,
        currentSalary: candidate.currentSalary ?? candidate.metadata?.currentSalary,
        expectedSalary: candidate.expectedSalary ?? candidate.metadata?.expectedSalary,
        resume: candidate.resume || null,
        noticePeriod: candidate?.metadata?.noticePeriod || "",
        lastWorkingDay: candidate?.metadata?.lastWorkingDay || "", 
        linkedInId: candidate.metadata?.linkedInId || "",
        hasOffers: candidate.metadata?.hasOffers,
        offerDetails: candidate.metadata?.offerDetails || "",
       ctc: amount,
        currencyType: currency,
        budgetType: period,
        joiningDate: joiningDate || null,
        offerLetterUrl: candidate.metadata?.offerLetterUrl || "",
        joiningLetterUrl: candidate.metadata?.joiningLetterUrl || "",
      });

      const candidateSkills = candidate.skillRatings || candidate.skills || [];
      skillsForm.reset({
        skills: candidateSkills.length > 0 
          ? candidateSkills 
          : (jobs?.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: 0, experienceMonths: 0 })) || [])
      });

      proofIdForm.reset({
        uan: candidate.metadata?.uan || "",
        pan: candidate.metadata?.pan || "",
        pf: candidate.metadata?.pf || "",
        esicNumber: candidate.metadata?.esicNumber || "",
      });
    } else {
      basicInfoForm.reset({ skills: jobs?.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: 0, experienceMonths: 0 })) || [] });
      skillsForm.reset({ skills: jobs?.skills?.map(skill => ({ name: skill, rating: 0, experienceYears: 0, experienceMonths: 0 })) || [] });
      proofIdForm.reset();
      setCandidateId(null);
    }
  }, [candidate, isEditMode, basicInfoForm, skillsForm, proofIdForm, jobs, controlledOpen]);

  // FIX: Added handler to receive parsed resume data and populate form
  const handleParseComplete = (parsedData: any) => {
    if (!parsedData) return;

    if (parsedData.firstName) basicInfoForm.setValue("firstName", parsedData.firstName, { shouldValidate: true });
    if (parsedData.lastName) basicInfoForm.setValue("lastName", parsedData.lastName, { shouldValidate: true });
    if (parsedData.email) basicInfoForm.setValue("email", parsedData.email, { shouldValidate: true });
    if (parsedData.linkedin_url) basicInfoForm.setValue("linkedInId", parsedData.linkedin_url, { shouldValidate: true });
    
    if (parsedData.phone) {
      let phoneNumber = parsedData.phone.replace(/\s+/g, '');
      if (!phoneNumber.startsWith('+')) phoneNumber = `+91${phoneNumber}`;
      basicInfoForm.setValue("phone", phoneNumber, { shouldValidate: true });
    }
    
    if (parsedData.currentLocation) basicInfoForm.setValue("currentLocation", parsedData.currentLocation, { shouldValidate: true });

    if (parsedData.work_experience?.length > 0) {
      const calculateExperience = (workHistory: any[]) => {
          let totalMonths = 0;
          workHistory.forEach(job => {
              try {
                  const startDate = new Date(job.start_date);
                  const endDate = job.end_date === 'Present' ? new Date() : new Date(job.end_date);
                  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                      let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
                      months -= startDate.getMonth();
                      months += endDate.getMonth();
                      totalMonths += months <= 0 ? 0 : months;
                  }
              } catch (e) { console.warn("Could not parse date", job); }
          });
          return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
      };
      const exp = calculateExperience(parsedData.work_experience);
      basicInfoForm.setValue("totalExperience", exp.years, { shouldValidate: true });
      basicInfoForm.setValue("totalExperienceMonths", exp.months, { shouldValidate: true });
    }
  };


  const handleClose = () => {
    basicInfoForm.reset();
    skillsForm.reset();
    proofIdForm.reset();
    setCandidateId(null);
    setActiveTab("basic-info");
    controlledOnOpenChange(false);
  };

  const formatExperience = (years?: number, months?: number): string => {
    const yearsStr = years && years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
    const monthsStr = months && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
    return [yearsStr, monthsStr].filter(Boolean).join(" and ") || "0 years";
  };
  
  const buildPayload = () => {
    const basicInfoData = basicInfoForm.getValues();
    const skillsData = skillsForm.getValues();
    const proofIdData = proofIdForm.getValues();

    const appliedFrom = user?.user_metadata ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : "Unknown";

    const { ctc, currencyType, budgetType, joiningDate } = basicInfoData;
    const currencySymbol = currencyType === 'USD' ? '$' : '₹';
    const ctcString = ctc && currencyType && budgetType ? `${currencySymbol}${ctc} ${budgetType}` : candidate?.ctc;


    const payload: CandidateData = {
      id: candidateId || undefined,
      name: `${basicInfoData.firstName} ${basicInfoData.lastName}`,
      status: candidate?.status || "Screening",
      experience: formatExperience(basicInfoData.totalExperience, basicInfoData.totalExperienceMonths),
      matchScore: candidate?.matchScore || 0,
      appliedDate: candidate?.appliedDate || new Date().toISOString().split('T')[0],
      email: basicInfoData.email,
      phone: basicInfoData.phone,
      currentSalary: basicInfoData.currentSalary ?? null,
      expectedSalary: basicInfoData.expectedSalary ?? null,
      location: basicInfoData.currentLocation || "",
      appliedFrom: candidate?.appliedFrom || appliedFrom,
      resumeUrl: basicInfoData.resume,
      createdBy: candidate?.createdBy || user?.id,
      updatedBy: user?.id,
      skillRatings: skillsData.skills || [],
      ctc: ctcString,
      joining_date: joiningDate,
      offerLetterUrl: basicInfoData.offerLetterUrl || null,
      joiningLetterUrl: basicInfoData.joiningLetterUrl || null,
      metadata: {
        currentLocation: basicInfoData.currentLocation,
        preferredLocations: basicInfoData.preferredLocations,
        totalExperience: basicInfoData.totalExperience,
        totalExperienceMonths: basicInfoData.totalExperienceMonths,
        relevantExperience: basicInfoData.relevantExperience,
        relevantExperienceMonths: basicInfoData.relevantExperienceMonths,
        currentSalary: basicInfoData.currentSalary,
        expectedSalary: basicInfoData.expectedSalary,
        resume_url: basicInfoData.resume,
        noticePeriod: basicInfoData.noticePeriod,
        lastWorkingDay: basicInfoData.lastWorkingDay,
        linkedInId: basicInfoData.linkedInId,
        hasOffers: basicInfoData.hasOffers,
        offerDetails: basicInfoData.offerDetails,
        uan: proofIdData.uan || undefined,
        pan: proofIdData.pan || undefined,
        pf: proofIdData.pf || undefined,
        esicNumber: proofIdData.esicNumber || undefined,
        offerLetterUrl: basicInfoData.offerLetterUrl || null,
        joiningLetterUrl: basicInfoData.joiningLetterUrl || null,
      },
      progress: candidate?.progress || { screening: false, interview: false, offer: false, hired: false, joined: false }
    };
    return payload;
  }

  const handleSaveBasicInfo = async () => {
    try {
      if (!job.id) throw new Error("Job ID is missing");
      const payload = buildPayload();

      if (!candidateId) {
        const newCandidate = await createCandidate(job.id, payload);
        setCandidateId(newCandidate.id);
        toast.success("Candidate created successfully");
      } else {
        await editCandidate(candidateId, payload);
        toast.success("Candidate updated successfully");
      }
      setActiveTab("skills-info");
    } catch (error) {
      console.error("Error saving candidate basic info:", error);
      toast.error("Failed to save basic information");
    }
  };

  const handleSaveSkills = async () => {
    try {
      if (!candidateId || !job.id) throw new Error("Candidate ID or Job ID is missing");
      const payload = buildPayload();
      await editCandidate(candidateId, payload);
      toast.success("Skills updated successfully");
      setActiveTab("proof-id");
    } catch (error) {
      console.error("Error saving candidate skills:", error);
      toast.error("Failed to save skills information");
    }
  };

  const handleSaveProofId = async () => {
    setIsSaving(true);
    try {
      if (!candidateId || !job.id) throw new Error("Candidate ID or Job ID is missing");
      const payload = buildPayload();
      await editCandidate(candidateId, payload);
      toast.success("Candidate saved successfully!");
      onCandidateAdded();
      handleClose();
    } catch (error) {
      console.error("Error saving candidate proof ID:", error);
      toast.error("Failed to save final details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl lg:max-w-6xl xl:max-w-4xl 2xl:max-w-8xl overflow-y-auto">
        <SheetHeader className="mb-4 flex flex-row items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
            <UserPlus className="h-6 w-6 text-gray-600" />
          </div>
          <SheetTitle className="text-2xl font-bold text-gray-800">{isEditMode ? "Edit Candidate" : "Add New Candidate"}</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* STYLING CHANGE: Wrapped TabsList in a centered div */}
          <div className="flex justify-center mb-6">
           <TabsList className="inline-flex h-10 items-center justify-center rounded-full bg-gray-100 border p-1">
              <TabsTrigger 
                  value="basic-info"
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                  Basic Information
              </TabsTrigger>
              <TabsTrigger 
                  value="skills-info" 
                  disabled={!candidateId}
                   className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                  Skill Information
              </TabsTrigger>
              <TabsTrigger 
                  value="proof-id" 
                  disabled={!candidateId}
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:bg-[#3e36d9] data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                  Proof ID
              </TabsTrigger>
            </TabsList>
          </div>
        
          <TabsContent value="basic-info">
            <BasicInformationTab 
                form={basicInfoForm} 
                onSaveAndNext={handleSaveBasicInfo}
                onCancel={handleClose}
                onParseComplete={handleParseComplete} // FIX: Prop is now passed
                candidate={candidate} // Pass the candidate object
                isEditMode={isEditMode}   // Pass the isEditMode flag
            />
          </TabsContent>
          
          <TabsContent value="skills-info">
            <SkillInformationTab 
              form={skillsForm}
              jobSkills={job.skills || []}
              onSave={handleSaveSkills}
              onCancel={handleClose}
            />
          </TabsContent>

          <TabsContent value="proof-id">
            <ProofIdTab
              form={proofIdForm}
              onSave={handleSaveProofId}
              onCancel={handleClose}
              isSaving={isSaving} // Pass saving state
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AddCandidateDrawer;