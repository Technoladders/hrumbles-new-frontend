import { useState } from 'react';
import Modal from 'react-modal';
import mammoth from 'mammoth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';

// Import your card-based comparison view and its data type
import { CandidateComparisonView, ParsedCandidateProfile } from './CandidateComparisonView'; 

// --- DYNAMIC MODAL STYLES ---
const compactViewStyles = {
  content: { 
    top: '50%', 
    left: '50%', 
    right: 'auto', 
    bottom: 'auto', 
    marginRight: '-50%', 
    transform: 'translate(-50%, -50%)', 
    width: '50vw', 
    maxWidth: '750px', 
    padding: '0', 
    border: 'none', 
    borderRadius: '12px', 
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    zIndex: 1000, // Boost z-index to float above table/tabs (z-20)
  },
  overlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    backdropFilter: 'blur(4px)',
    zIndex: 999, // Overlay just below content
  },
};
const compareViewStyles = {
  content: { 
    top: '50%', 
    left: '50%', 
    right: 'auto', 
    bottom: 'auto', 
    marginRight: '-50%', 
    transform: 'translate(-50%, -50%)', 
    width: '96vw', 
    maxWidth: '2000px', 
    height: '90vh', 
    padding: '0', 
    border: 'none', 
    borderRadius: '12px', 
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)', 
    background: '#F9FAFB', 
    overflow: 'hidden',
    zIndex: 1000, // Boost z-index to float above table/tabs (z-20)
  },
  overlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    backdropFilter: 'blur(8px)',
    zIndex: 999, // Overlay just below content
  },
};
const detailViewStyles = {
  content: {
    top: '50%', left: '50%', right: 'auto', bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: '90vw', maxWidth: '1200px', height: '90vh',
    padding: '0', border: 'none', borderRadius: '12px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden', zIndex: 1000,
  },
  overlay: { 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    backdropFilter: 'blur(4px)',
    zIndex: 999, // Overlay just below content
  },
};

Modal.setAppElement('#root');
const ITEMS_PER_PAGE = 5;

// --- SELF-CONTAINED HELPER FUNCTIONS ---

async function parseFileToText(file: File): Promise<string> {
  const isDoc = file.type === 'application/msword';
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (isDoc || isDocx) {
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (file.type === 'application/pdf') {
    const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
    if (error) throw new Error(`PDF Parsing Failed: ${error.message}`);
    return data.text;
  }
  throw new Error('Unsupported file type');
}

// --- NEW: This function calls your Supabase Edge Function ---
async function runAnalysisViaEdge(resumeText: string, jobDescription: string): Promise<any> {
  if (!resumeText || !jobDescription) {
    throw new Error("Resume text and job description are required.");
  }

  const { data, error } = await supabase.functions.invoke('initial-analysis-4o', {
    body: {
      type: 'initial',
      payload: { jobDescription, resumeText },
    },
  });

  if (error) {
    // Try to parse a more specific error message from the function if available
    try {
      const errorBody = JSON.parse(error.message);
      throw new Error(errorBody.error || `Edge Function failed: ${error.message}`);
    } catch {
      throw new Error(`Edge Function invocation failed: ${error.message}`);
    }
  }

  if (!data || !data.analysis) {
    throw new Error("Edge Function returned an invalid or empty response.");
  }
  
  // The Edge Function returns { analysis, usage }. We only need the analysis object.
  return data.analysis;
}

const normalizeCompanyName = (name: string): string => {
  if (!name || typeof name !== 'string') return "";
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/\s*(ltd|limited|inc|corp|corporation|llc|co)\.?\s*$/i, '');
  normalized = normalized.replace(/[^\w\s-]/g, '');
  normalized = normalized.split(/\s+/).join(' ').trim();
  return normalized;
};

async function saveAnalysisToDB(profile: ParsedCandidateProfile, job_id: string, candidate_id: string, isInitial: boolean, user: any, organizationId: string, resumeText?: string): Promise<boolean> {
  try {
    // Validate required fields
    if (!job_id || !candidate_id) {
      throw new Error('Missing required fields: job_id or candidate_id');
    }

    // Step 1: Prepare resume_analysis payload
    const resumePayload = {
      job_id,
      candidate_id,
      resume_text: resumeText || null,
      resume_url: profile.resume_url || null,
      overall_score: Math.round(profile.overall_match_score || 0),
      matched_skills: profile.matched_skills ? JSON.parse(JSON.stringify(profile.matched_skills)) : null,
      summary: profile.summary || null,
      missing_or_weak_areas: Array.isArray(profile.missing_or_weak_areas) ? profile.missing_or_weak_areas : [],
      top_skills: Array.isArray(profile.top_skills) ? profile.top_skills : [],
      development_gaps: Array.isArray(profile.development_gaps) ? profile.development_gaps : [],
      additional_certifications: Array.isArray(profile.additional_certifications) ? profile.additional_certifications : [],
      section_wise_scoring: profile.section_wise_scoring ? JSON.parse(JSON.stringify(profile.section_wise_scoring)) : {},
      candidate_name: profile.candidate_name || 'Unknown',
      email: profile.email || '',
      github: profile.github || '',
      linkedin: profile.linkedin || '',
      updated_at: new Date().toISOString(),
      updated_by: user.id,
      organization_id: organizationId,
      ...(isInitial && { created_by: user.id }),
    };

    console.log('Saving to Supabase - Resume Analysis Payload:', JSON.stringify(resumePayload, null, 2));

    // Step 2: Upsert resume_analysis
    const { error: resumeError } = await supabase
      .from('resume_analysis')
      .upsert(resumePayload, { onConflict: ['job_id', 'candidate_id'] });

    if (resumeError) {
      console.error('Supabase Resume Error:', JSON.stringify(resumeError, null, 2));
      throw new Error(`Resume upsert failed: ${resumeError.message}`);
    }

    // Step 3: Company Association Logic
    if (profile.companies && Array.isArray(profile.companies)) {
      const companyEntries = [];
      const companyErrors = [];

      for (const company of profile.companies) {
        const normalizedCompanyName = normalizeCompanyName(company.name);
        if (!normalizedCompanyName) {
          console.warn("Skipping company entry with empty normalized name.");
          continue;
        }

        try {
          const { data: companyUpsertData, error: companyUpsertError } = await supabase
            .from('companies')
            .upsert({ name: normalizedCompanyName }, { onConflict: 'name' })
            .select('id')
            .single();

          if (companyUpsertError) {
            console.error(`Supabase Company Upsert Error for "${normalizedCompanyName}":`, JSON.stringify(companyUpsertError, null, 2));
            companyErrors.push(`Failed upsert for company "${normalizedCompanyName}": ${companyUpsertError.message}`);
            continue;
          }

          if (!companyUpsertData || !companyUpsertData.id) {
            console.error('Supabase Company Upsert Warning: Did not return ID for', normalizedCompanyName);
            companyErrors.push(`Upsert ok but no ID returned for company "${normalizedCompanyName}"`);
            continue;
          }

          const companyId = companyUpsertData.id;

          companyEntries.push({
            candidate_id,
            job_id,
            company_id: companyId,
            designation: company.designation || '-',
            years: company.years || '-',
          });

        } catch (loopError) {
          console.error(`Unexpected error processing company "${normalizedCompanyName}":`, loopError);
          companyErrors.push(`Unexpected error for company "${normalizedCompanyName}": ${loopError.message}`);
        }
      }

      if (companyEntries.length > 0) {
        console.log('Saving to Supabase - Candidate Companies Payload:', JSON.stringify(companyEntries, null, 2));
        const { error: linkError } = await supabase
          .from('candidate_companies')
          .upsert(companyEntries, { onConflict: 'candidate_id,job_id,company_id' });

        if (linkError) {
          console.error('Supabase Candidate Companies Upsert Error:', JSON.stringify(linkError, null, 2));
          throw new Error(`Candidate companies upsert failed: ${linkError.message}`);
        }
        console.log("Candidate company associations saved successfully.");

        if (companyErrors.length > 0) {
          console.warn("Non-critical errors encountered during company processing:", companyErrors);
        }

        // Verify saved company data
        const { data: savedCompanies, error: fetchError } = await supabase
          .from('candidate_companies')
          .select('company_id, designation, years, companies (id, name)')
          .eq('candidate_id', candidate_id)
          .eq('job_id', job_id);

        if (fetchError) {
          console.warn('Supabase Fetch Warning: Failed to verify company data after save:', JSON.stringify(fetchError, null, 2));
        } else {
          console.log('Verified Saved Companies:', JSON.stringify(savedCompanies, null, 2));
        }

      } else {
        console.log("No valid candidate company entries to save after processing.");
        if (companyErrors.length > 0) {
          console.warn("Non-critical errors encountered during company processing (no entries saved):", companyErrors);
        }
      }
    } else {
      console.log("No 'companies' array found in the result or it's empty.");
    }

    return true;
  } catch (err: any) {
    console.error('Error saving analysis data:', err);
    toast.error(`Error saving analysis: ${err.message || 'Unknown error'}`);
    return false;
  }
}

async function addToJobCandidates(profiles: ParsedCandidateProfile[], job_id: string, user: any, organizationId: string): Promise<void> {
  const insertPromises = profiles.map(profile => {
    const appliedFrom = user?.user_metadata
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : 'Unknown';

    const payload = {
      job_id,
      name: profile.candidate_name || 'Unknown Candidate',
      email: profile.email || null,
      github: profile.github || null,
      linkedin: profile.linkedin || null,
      skills: profile.top_skills || [],
      overall_score: profile.overall_match_score || null, // Aligned with analysis output
      applied_from: appliedFrom,
      created_by: user.id,
      has_validated_resume: false,
      main_status_id: null,
      sub_status_id: null,
      organization_id: organizationId,
      candidate_id: null, // From resume_analysis
      talent_id: null,
      resume_url: profile.resume_url || null,
    };

    console.log('Inserting into hr_job_candidates:', JSON.stringify(payload, null, 2));

    return supabase.from('hr_job_candidates').insert(payload);
  });

  const results = await Promise.all(insertPromises);
  const errors = results.filter(res => res.error);

  if (errors.length > 0) {
    // Log per-candidate errors for debugging
    errors.forEach((res, i) => console.error(`Candidate ${i} error:`, res.error));
    toast.error(`${errors.length} candidate(s) could not be added to job.`);
  }
  if (results.length > errors.length) {
    toast.success(`${results.length - errors.length} candidate(s) were successfully added to the job!`);
  }
}

// ===================================================================
// --- NEW: Single Candidate Detail View Component (inside the modal file) ---
// ===================================================================
const SingleAnalysisDetail = ({ analysisResult, onAddToJob, onBack, job, user, organizationId }: { 
  analysisResult: ParsedCandidateProfile, 
  onAddToJob: (updated: ParsedCandidateProfile) => void, 
  onBack: () => void, 
  job: any,
  user: any,
  organizationId: string
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [updatedSkills, setUpdatedSkills] = useState(analysisResult.matched_skills || []);
  const [currentAnalysis, setCurrentAnalysis] = useState(analysisResult);
  const [isRevalidated, setIsRevalidated] = useState(false);

  const updateSkillLocally = (index: number, newStatus: string) => {
    const newSkills = [...updatedSkills];
    newSkills[index].matched = newStatus;
    setUpdatedSkills(newSkills);
    setIsRevalidated(false); // Allow revalidation again if changed
  };

  const revalidateScores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initial-analysis-4o', {
        body: {
          type: 'revalidation',
          payload: {
            updatedSkills,
            initialSectionWiseScoring: currentAnalysis.section_wise_scoring,
          },
        },
      });
      if (error) throw new Error(error.message);

      // Merge the new scores with the existing analysis
      const revalidatedAnalysis = {
        ...currentAnalysis,
        overall_match_score: data.analysis.overall_match_score,
        section_wise_scoring: data.analysis.section_wise_scoring,
        matched_skills: updatedSkills, // Keep the user-modified skills
      };

      // Auto-save the revalidated data to DB
      const updatedWithId = {
        ...revalidatedAnalysis,
        candidate_id: currentAnalysis.candidate_id,
      };
      const saved = await saveAnalysisToDB(updatedWithId, job.id, currentAnalysis.candidate_id, false, user, organizationId, currentAnalysis.resume_text);
      if (saved) {
        setCurrentAnalysis(updatedWithId);
        setIsRevalidated(true);
        toast.success("Scores revalidated and saved successfully!");
      } else {
        throw new Error("Failed to save revalidated data.");
      }

    } catch (err: any) {
      toast.error(`Revalidation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add to job
  const handleAddToJob = () => {
    const updatedProfile = {
      ...currentAnalysis,
      matched_skills: updatedSkills,
    };
    onAddToJob(updatedProfile);
  }

  // RENDER LOGIC FOR THE DETAIL VIEW (Adapted from your old ResumeAnalysisModal)
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analysis for: {currentAnalysis.candidate_name}</h2>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={onBack}>Back to Input</Button>
           <Button onClick={handleAddToJob} disabled={isLoading}>
             {isLoading ? 'Adding...' : 'Add to Job'}
           </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        <div className="text-center">
            <h3 className="text-lg font-medium text-gray-600">Overall Match Score</h3>
            <p className="text-6xl font-bold text-purple-600">{Math.round(currentAnalysis.overall_match_score || 0)}%</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentAnalysis.location && (
            <div>
              <h4 className="font-medium text-gray-600">Location</h4>
              <p className="text-sm text-gray-800">{currentAnalysis.location}</p>
            </div>
          )}
          {currentAnalysis.experience_years && (
            <div>
              <h4 className="font-medium text-gray-600">Experience</h4>
              <p className="text-sm text-gray-800">{currentAnalysis.experience_years}</p>
            </div>
          )}
        </div>

        <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Summary</h4>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-gray-700">{currentAnalysis.summary}</div>
        
        {currentAnalysis.section_wise_scoring && Object.keys(currentAnalysis.section_wise_scoring).length > 0 && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">📊 Section-wise Scoring</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse bg-gray-50 rounded-lg border border-gray-200">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Section</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Weightage</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Submenu</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Submenu Weightage</th>
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Score (out of 10)</th>
                    {/* <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Weighted Score</th> */}
                    <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentAnalysis.section_wise_scoring).flatMap(([sectionName, section]: [string, any], sectionIdx: number) =>
                    section.submenus.map((submenu: any, submenuIdx: number) => (
                      <tr key={`${sectionIdx}-${submenuIdx}`} className="hover:bg-purple-50 transition-colors">
                        {submenuIdx === 0 && (
                          <td
                            className="p-3 text-purple-700 border-b border-purple-100 align-top"
                            rowSpan={section.submenus.length}
                          >
                            {sectionName}
                          </td>
                        )}
                        {submenuIdx === 0 && (
                          <td
                            className="p-3 text-purple-700 border-b border-purple-100 align-top"
                            rowSpan={section.submenus.length}
                          >
                            {section.weightage}%
                          </td>
                        )}
                        <td className="p-3 text-purple-700 border-b border-purple-100">{submenu.submenu}</td>
                        <td className="p-3 text-purple-700 border-b border-purple-100">{submenu.weightage}%</td>
                        <td className="p-3 text-purple-700 border-b border-purple-100 text-center">{submenu.score}/10</td>
                        {/* <td className="p-3 text-purple-700 border-b border-purple-100 text-center">{submenu.weighted_score}</td> */}
                        <td className="p-3 text-purple-600 border-b border-purple-100">{submenu.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-800 mb-4">Matched Skills</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead className="bg-purple-100">
                <tr>
                  <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Requirement</th>
                  <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Status</th>
                  <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Details</th>
                  <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Update</th>
                </tr>
              </thead>
              <tbody>
                {updatedSkills?.length > 0 ? (
                  updatedSkills.map((skill: any, index: number) => (
                    <tr key={index} className="hover:bg-purple-50 transition-colors">
                      <td className="p-3 text-purple-700 border-b border-purple-100">{skill.requirement}</td>
                      <td className="p-3 text-purple-700 border-b border-purple-100 text-center">
                        {skill.matched === 'yes' ? '✅ Yes' : skill.matched === 'partial' ? '⚠️ Partial' : '❌ No'}
                      </td>
                      <td className="p-3 text-purple-600 border-b border-purple-100">{skill.details}</td>
                      <td className="p-3 text-purple-600 border-b border-purple-100">
                        <select value={skill.matched} onChange={(e) => updateSkillLocally(index, e.target.value)} className="p-1 border rounded">
                          <option value="yes">Yes</option>
                          <option value="partial">Partial</option>
                          <option value="no">No</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-purple-600 text-center">No skills data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!isRevalidated && <Button onClick={revalidateScores} disabled={isLoading} className="mt-2">{isLoading ? 'Revalidating...' : 'Revalidate Scores'}</Button>}

        {currentAnalysis.companies && currentAnalysis.companies.length > 0 && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Work Experience</h4>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-2 border-b font-semibold">Company</th>
                    <th className="p-2 border-b font-semibold">Designation</th>
                    <th className="p-2 border-b font-semibold">Years</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAnalysis.companies.map((company, idx) => (
                    <tr key={idx} className="hover:bg-blue-100">
                      <td className="p-2 border-b">{company.name}</td>
                      <td className="p-2 border-b">{company.designation}</td>
                      <td className="p-2 border-b">{company.years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {currentAnalysis.missing_or_weak_areas && currentAnalysis.missing_or_weak_areas.length > 0 && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Missing or Weak Areas</h4>
            <ul className="list-disc pl-5 space-y-1">
              {currentAnalysis.missing_or_weak_areas.map((area, i) => <li key={i} className="text-gray-700">{area}</li>)}
            </ul>
          </>
        )}

        {currentAnalysis.top_skills && currentAnalysis.top_skills.length > 0 && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Top Skills</h4>
            <div className="flex flex-wrap gap-2">
              {currentAnalysis.top_skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
            </div>
          </>
        )}

        {currentAnalysis.development_gaps && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Development Gaps</h4>
            <p className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-gray-700">{currentAnalysis.development_gaps}</p>
          </>
        )}

        {currentAnalysis.additional_certifications && currentAnalysis.additional_certifications.length > 0 && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Additional Certifications</h4>
            <ul className="list-disc pl-5 space-y-1">
              {currentAnalysis.additional_certifications.map((cert, i) => <li key={i} className="text-gray-700">{cert}</li>)}
            </ul>
          </>
        )}

        {currentAnalysis.education_summary && (
          <>
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-2">Education Summary</h4>
            <p className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-gray-700">{currentAnalysis.education_summary}</p>
          </>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const ResumeUploadModal = ({ isOpen, onClose, onCandidateAdded,job }: any) => {
  
  const [view, setView] = useState<'input' | 'detail' | 'compare'>('input');
  const [singleAnalysisResult, setSingleAnalysisResult] = useState<ParsedCandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'bulk'>('paste');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidateProfile[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [resumeText, setResumeText] = useState('');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const handleSingleAnalysis = async () => {
    if (!job?.description || !job?.id) return toast.error("Job details are required for analysis.");

    let textToAnalyze: string | null = null;
    let sourceFileName: string = 'Pasted Resume';
    let fileToUpload: File | null = null;

    if (activeTab === 'paste' && resumeText.trim()) {
      textToAnalyze = resumeText.trim();
    } else if (activeTab === 'upload' && singleFile) {
      sourceFileName = singleFile.name;
      fileToUpload = singleFile;
    } else {
      return toast.error("No resume content provided.");
    }

    setIsProcessing(true);
    toast.info(`Analyzing ${sourceFileName}...`);

    try {
      if (fileToUpload) {
        textToAnalyze = await parseFileToText(fileToUpload);
      }
      if (!textToAnalyze) throw new Error("Could not extract text from the source.");

      // --- USE THE NEW EDGE FUNCTION ---
      const analysisResult = await runAnalysisViaEdge(textToAnalyze, job.description);
      
      const candidate_id = uuidv4();
      const finalProfile: ParsedCandidateProfile = {
        ...analysisResult,
        fileName: sourceFileName,
        resume_text: textToAnalyze,
        candidate_id,
      };

      if (fileToUpload) {
        const sanitizedFileName = fileToUpload.name.replace(/[^\w\s.-]/g, '');
        const filePath = `public/resumes/${job.id}/${uuidv4()}-${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage.from('candidate-resumes').upload(filePath, fileToUpload);
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('candidate-resumes').getPublicUrl(filePath);
        finalProfile.resume_url = urlData.publicUrl;
      }
      
      // Save to resume_analysis immediately
      const saved = await saveAnalysisToDB(finalProfile, job.id, candidate_id, true, user, organizationId, textToAnalyze);
      if (!saved) throw new Error("Failed to save analysis.");
      
      setSingleAnalysisResult(finalProfile);
      setView('detail');

    } catch (error: any) {
      console.error("Single analysis failed:", error);
      toast.error(`Failed to analyze: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!job?.description || !job?.id) return toast.error("Job details are required for analysis.");
    
    setIsProcessing(true);
    setProgress(0);
    
    const analysisPromises = Array.from(files).map(async (file, index) => {
      try {
        const sanitizedFileName = file.name.replace(/[^\w\s.-]/g, ''); 
        const filePath = `public/resumes/${job.id}/${uuidv4()}-${sanitizedFileName}`; 
        
        const { error: uploadError } = await supabase.storage.from('candidate-resumes').upload(filePath, file);
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('candidate-resumes').getPublicUrl(filePath);
        const resumeUrl = urlData.publicUrl;

        const text = await parseFileToText(file);
        // --- USE THE NEW EDGE FUNCTION ---
        const analysisResult = await runAnalysisViaEdge(text, job.description);
        
        const candidate_id = uuidv4();
        const finalProfile: ParsedCandidateProfile = {
          ...analysisResult,
          fileName: file.name,
          resume_text: text,
          resume_url: resumeUrl,
          candidate_id,
        };
        
        // Save to resume_analysis immediately
        const saved = await saveAnalysisToDB(finalProfile, job.id, candidate_id, true, user, organizationId, text);
        if (!saved) {
          throw new Error(`Failed to save analysis for ${file.name}`);
        }
        
        setProgress(((index + 1) / files.length) * 100);
        return { status: 'fulfilled' as const, value: finalProfile };

      } catch (error: any) {
        toast.error(`Failed to process ${file.name}: ${error.message}`);
        setProgress(((index + 1) / files.length) * 100);
        return { status: 'rejected' as const, reason: error };
      }
    });

    const results = await Promise.all(analysisPromises);
    const successfullyParsed = results.filter(res => res.status === 'fulfilled').map(res => res.value);

    if (successfullyParsed.length > 0) {
      successfullyParsed.sort((a, b) => (b.overall_match_score || 0) - (a.overall_match_score || 0));
      setParsedCandidates(successfullyParsed);
      setView('compare');
    } else { 
      toast.error("No resumes could be processed."); 
    }
    setIsProcessing(false);
  };

  const handleAddToJob = async (candidatesToAdd: ParsedCandidateProfile[]) => {
    if (candidatesToAdd.length === 0) {
      return toast.error("No candidates to add.");
    }

    if (!job?.id || !user?.id) {
      return toast.error("Missing job or user context.");
    }

    setIsProcessing(true);
    toast.info(`Adding ${candidatesToAdd.length} candidate(s) to the job...`);

    try {
      await addToJobCandidates(candidatesToAdd, job.id, user, organizationId);
      onCandidateAdded(); // Signal parent page to refetch
      handleClose();
    } catch (error: any) {
      console.error("Add to job failed:", error);
      toast.error(`Failed to add candidates: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setView('input');
    setSingleAnalysisResult(null);
    setActiveTab('paste');
    setParsedCandidates([]);
    setSelectedIndices(new Set());
    setCurrentPage(1);
    setProgress(0);
    setIsProcessing(false);
    setResumeText('');
    setSingleFile(null);
    onClose();
  };

  const handleSelectionChange = (actualIndex: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(actualIndex)) {
      newSet.delete(actualIndex);
    } else {
      newSet.add(actualIndex);
    }
    setSelectedIndices(newSet);
  };
  
  const handleSelectAll = () => {
    const allSelected = selectedIndices.size === parsedCandidates.length;
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      const allIndices = new Set(parsedCandidates.map((_, index) => index));
      setSelectedIndices(allIndices);
    }
  };
  
  const totalPages = Math.ceil(parsedCandidates.length / ITEMS_PER_PAGE);
  const candidatesToDisplay = parsedCandidates.length > ITEMS_PER_PAGE
    ? parsedCandidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : parsedCandidates;

  const getModalStyle = () => {
    if (view === 'detail') return detailViewStyles;
    if (view === 'compare') return compareViewStyles;
    return compactViewStyles;
  }
  
  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} style={getModalStyle()}>
      <div className={`flex flex-col h-full ${view === 'compare' ? 'bg-gray-50' : 'bg-white'}`}>
        
        {view === 'input' && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Analyse and Add Candidate</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-grow bg-white">
              <div className="flex justify-center p-4">
                <div className="bg-gray-100 rounded-lg p-1 flex items-center space-x-1">
                  <button onClick={() => setActiveTab('paste')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'paste' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Paste Resume</button>
                  <button onClick={() => setActiveTab('upload')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'upload' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Upload Single</button>
                  <button onClick={() => setActiveTab('bulk')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'bulk' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Bulk Upload</button>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'paste' && (
                  <div className="flex flex-col gap-4">
                    <Textarea
                      placeholder="Paste the full resume text here..."
                      className="min-h-[250px]"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={handleSingleAnalysis}
                      disabled={isProcessing || !resumeText.trim()}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze Pasted Text'}
                    </Button>
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div className="flex flex-col gap-4 text-center">
                    <div className="p-6 border-2 border-dashed rounded-lg">
                      <Input
                        type="file"
                        onChange={(e) => setSingleFile(e.target.files ? e.target.files[0] : null)}
                        accept=".pdf,.doc,.docx"
                        disabled={isProcessing}
                      />
                    </div>
                    <Button
                      onClick={handleSingleAnalysis}
                      disabled={isProcessing || !singleFile}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze Selected File'}
                    </Button>
                  </div>
                )}
                {activeTab === 'bulk' && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">Select multiple files (.pdf, .doc, .docx). They will be analyzed for your review.</p>
                    <div className="p-6 border-2 border-dashed rounded-lg"><Input type="file" onChange={handleBulkUpload} disabled={isProcessing} multiple accept=".pdf,.doc,.docx"/></div>
                    {isProcessing && <Progress value={progress} className="w-full mt-4" />}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === 'detail' && singleAnalysisResult && (
          <SingleAnalysisDetail 
            analysisResult={singleAnalysisResult}
            job={job}
            user={user}
            organizationId={organizationId}
            onAddToJob={(updated) => handleAddToJob([updated])}
            onBack={() => setView('input')}
          />
        )}

        {view === 'compare' && (
          <>
            <CandidateComparisonView
              candidates={candidatesToDisplay}
              selectedIndices={selectedIndices}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
              onExit={handleClose}
              onAddSingleCandidate={(candidate) => handleAddToJob([candidate])}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalCandidates={parsedCandidates.length}
            />
            <div className="flex justify-end gap-2 p-4 border-t mt-auto bg-gray-50 flex-shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
              <Button 
                onClick={() => handleAddToJob(Array.from(selectedIndices).map(index => parsedCandidates[index]))} 
                disabled={isProcessing || selectedIndices.size === 0} 
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? 'Adding...' : `Add ${selectedIndices.size} Selected`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ResumeUploadModal;