// components/ResumeAnalysisDetailView.tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { toast } from "sonner"; 
// --- NEW IMPORT ---
import { CandidateFormData } from "@/components/jobs/job/candidate/AddCandidateDrawer"; 



const transformAnalysisToFormData = (
  analysis: ParsedCandidateProfile,
  talentPoolCandidate?: { resume_path?: string }
): Partial<CandidateFormData> => {
    if (!analysis) { // Safety check
        toast.error("Analysis data is missing.");
        return {};
    }
    const [firstName, ...lastNameParts] = (analysis.candidate_name || "").split(" ");
    const lastName = lastNameParts.join(" ");
    const totalExperience = analysis.experience_years ? parseInt(analysis.experience_years, 10) : undefined;
console.log("analysis", analysis)
    return {
        firstName: firstName || "",
        lastName: lastName || "",
        email: analysis.email || "",
        phone: "", // Leave blank for manual entry
        currentLocation: analysis.location || "",
        preferredLocations: [],
        totalExperience: isNaN(totalExperience) ? undefined : totalExperience,
        totalExperienceMonths: 0,
        resume: talentPoolCandidate?.resume_path 
            || analysis.resume_url 
            || null,
        skills: analysis.top_skills?.map(skill => ({
            name: skill,
            rating: 0,
            experienceYears: 0,
            experienceMonths: 0,
        })) || [],
        linkedInId: analysis.linkedin || "",
        currentSalary: undefined,
        expectedSalary: undefined,
    };
};

const ResumeAnalysisDetailView = () => {
  const { jobId, candidateId } = useParams<{ jobId: string, candidateId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null); // hr_jobs.id (UUID)
  const [openCombobox, setOpenCombobox] = useState(false);

    const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const talentId = queryParams.get('talentId');
 
   const user = useSelector((state: any) => state.auth.user); // ✅ Get logged-in user
      const organization_id = useSelector((state: any) => state.auth.organization_id); // ✅ Get organization ID
 
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['resume-analysis', jobId, candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resume_analysis')
        .select('*')
        .eq('job_id', jobId)
        .eq('candidate_id', candidateId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!candidateId,
  });

  console.log("analysis", analysis)

   // --- START: MODIFICATION ---
  // New query to fetch the candidate's data from the talent pool if a talentId is available
  const { data: talentPoolCandidate } = useQuery({
    queryKey: ['talentPoolCandidate', talentId],
    queryFn: async () => {
      if (!talentId) return null;
      const { data, error } = await supabase
        .from('hr_talent_pool')
        .select('resume_path') 
        .eq('id', talentId)
        .single();
      
      if (error) {
        // Don't throw an error if not found, just return null
        if (error.code === 'PGRST116') return null; 
        throw error;
      }
      return data;
    },
    enabled: !!talentId, // This query will only run if talentId exists in the URL
  });
  // --- END: MODIFICATION ---

    // Fetch all jobs
    const { data: jobs, isLoading: isJobsLoading } = useQuery({
      queryKey: ["jobs"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("hr_jobs")
          .select("id, title, job_id")
          .order("title", { ascending: true });
        if (error) throw error;
        return data;
      },
    });
   
    // Debug and set default job
    useEffect(() => {
      if (analysis?.job_id && jobs && jobs.length > 0) {
        console.log('analysis.job_id:', analysis.job_id);
        console.log('jobs:', jobs);
        const matchingJob = jobs.find((job) => job.id === analysis.job_id); // Compare with hr_jobs.id (UUID)
        console.log('matchingJob:', matchingJob);
        if (matchingJob && !selectedJobId) {
          setSelectedJobId(matchingJob.id); // Set to hr_jobs.id (UUID)
        }
      }
    }, [analysis?.job_id, jobs, selectedJobId]);

    console.log("analysis.job_id:", analysis);
   
    // Find current job and others
    const currentJob = jobs?.find((job) => job.id === analysis?.job_id); // Compare with hr_jobs.id (UUID)
    const otherJobs = jobs?.filter((job) => job.id !== analysis?.job_id) || [];
   
const handleProceedWithAssignment = () => {
    if (!selectedJobId) {
      toast.error("Please select a job to assign the candidate to.");
      return;
    }
    if (!analysis) {
      toast.error("Analysis data is missing.");
      return;
    }

    // 1. Transform the analysis data
    const formData = transformAnalysisToFormData(analysis, talentPoolCandidate);
    
    // 2. Save the data to sessionStorage. The key is important.
    sessionStorage.setItem('aiCandidateForFinalize', JSON.stringify(formData));

    // 3. Close the modal and navigate to the selected job's page
    setIsAssignModalOpen(false);
    toast.info("Redirecting to job page to finalize candidate details...");
    navigate(`/jobs/${selectedJobId}`);
  };
   


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center mt-10 text-purple-600">No analysis found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto w-full"> {/* Adjusted max-width to 6xl for better fit */}
        <Link to={-1 as any}>
          <Button variant="ghost" className="mb-6 text-purple-600 hover:text-purple-800">
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-800 mb-2">
                {analysis.candidate_name || 'Unknown Candidate'}
              </h1>
              <p className="text-sm sm:text-base text-purple-600">
                Analyzed on: {new Date(analysis.updated_at).toLocaleString()}
              </p>
              {currentJob ? (
                <p className="text-sm sm:text-base text-purple-600">
                  Analyzed for Job: {currentJob.title} ({currentJob.job_id})
                </p>
              ) : (
                <p className="text-sm sm:text-base text-purple-600">
                  Analyzed for Job: Unknown ({analysis.job_id || 'N/A'})
                </p>
              )}
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="bg-purple-200 px-4 py-2 rounded-lg">
                <p className="text-lg font-semibold text-purple-800">Overall Score</p>
                <p className="text-2xl font-bold text-purple-700">{analysis.overall_score}%</p>
              </div>
               <Button onClick={() => setIsAssignModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                Assign to Job
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-2">Contact Information</h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p>Email: {analysis.email || 'N/A'}</p>
              <p>GitHub: {analysis.github || 'N/A'}</p>
              <p>LinkedIn: {analysis.linkedin || 'N/A'}</p>
            </div>
          </div>

          {/* Matched Skills Table */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Matched Skills</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Requirement</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Status</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.matched_skills?.length > 0 ? (
                    analysis.matched_skills.map((skill: any, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-700 border-b border-purple-100">{skill.requirement}</td>
                        <td className="p-3 text-purple-700 border-b border-purple-100 text-center">
                          {skill.matched === 'yes' ? '✅ Yes' : skill.matched === 'partial' ? '⚠️ Partial' : '❌ No'}
                        </td>
                        <td className="p-3 text-purple-600 border-b border-purple-100">{skill.details}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-3 text-purple-600 text-center">No skills data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section-wise Scoring Table */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Section-wise Scoring</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Section</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Weightage</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Submenu</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Score</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.section_wise_scoring && Object.values(analysis.section_wise_scoring).length > 0 ? (
                    Object.values(analysis.section_wise_scoring).flatMap((section: any, sectionIndex: number) =>
                      section.submenus.map((submenu: any, submenuIndex: number) => (
                        <tr key={`${sectionIndex}-${submenuIndex}`} className="hover:bg-purple-50 transition-colors">
                          {submenuIndex === 0 && (
                            <td
                              className="p-3 text-purple-700 border-b border-purple-100 align-top"
                              rowSpan={section.submenus.length}
                            >
                              {section.section}
                            </td>
                          )}
                          {submenuIndex === 0 && (
                            <td
                              className="p-3 text-purple-700 border-b border-purple-100 align-top"
                              rowSpan={section.submenus.length}
                            >
                              {section.weightage}%
                            </td>
                          )}
                          <td className="p-3 text-purple-700 border-b border-purple-100">{submenu.submenu} ({submenu.weightage}%)</td>
                          <td className="p-3 text-purple-700 border-b border-purple-100 text-center">{submenu.score}/10</td>
                          <td className="p-3 text-purple-600 border-b border-purple-100">{submenu.remarks}</td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-purple-600 text-center">No scoring data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xl font-semibold text-purple-800 mb-4">Top Skills</h3>
              <table className="w-full border-collapse">
                <tbody>
                  {analysis.top_skills?.length > 0 ? (
                    analysis.top_skills.map((skill: string, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-600 border-b border-purple-100">{skill}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-purple-600 text-center">No top skills listed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-800 mb-4">Missing/Weak Areas</h3>
              <table className="w-full border-collapse">
                <tbody>
                  {analysis.missing_or_weak_areas?.length > 0 ? (
                    analysis.missing_or_weak_areas.map((area: string, index: number) => (
                      <tr key={index} className="hover:bg-purple-50 transition-colors">
                        <td className="p-3 text-purple-600 border-b border-purple-100">{area}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-purple-600 text-center">No missing/weak areas identified</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Summary</h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600">
              {analysis.summary || 'No summary available'}
              
            </div>
          </div>

          {/* Assign Job Modal */}
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
  <DialogContent className="sm:max-w-[425px] md:max-w-[500px] lg:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Assign Candidate to Job</DialogTitle>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <Label htmlFor="job" className="text-right sm:col-span-1">
          Job
        </Label>
        <div className="sm:col-span-3">
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between"
                disabled={isJobsLoading}
              >
                {selectedJobId
                  ? `${jobs?.find((job) => job.id === selectedJobId)?.title} (${jobs?.find((job) => job.id === selectedJobId)?.job_id})`
                  : "Select a job..."}
                <Check className={cn("ml-2 h-4 w-4", selectedJobId ? "opacity-100" : "opacity-0")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] sm:w-[300px] md:w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search by job ID or title..." />
                <CommandList className="max-h-[200px] overflow-y-auto">
                  <CommandEmpty>No jobs found.</CommandEmpty>
                  {currentJob && (
                    <CommandGroup heading="Current Job">
                      <CommandItem
                        value={`${currentJob.job_id} ${currentJob.title}`}
                        onSelect={() => {
                          setSelectedJobId(currentJob.id);
                          setOpenCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedJobId === currentJob.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {currentJob.title} ({currentJob.job_id}) (Current Job)
                      </CommandItem>
                    </CommandGroup>
                  )}
                  <CommandGroup heading="Other Jobs">
                    {otherJobs.map((job) => (
                      <CommandItem
                        key={job.id}
                        value={`${job.id} ${job.title}`}
                        onSelect={() => {
                          setSelectedJobId(job.id);
                          setOpenCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedJobId === job.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {job.title} ({job.job_id})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsAssignModalOpen(false);
          setOpenCombobox(false);
        }}
      >
        Cancel
      </Button>
      <Button
                  onClick={handleProceedWithAssignment}
                  disabled={!selectedJobId || isJobsLoading} 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Proceed to Add
                </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalysisDetailView;