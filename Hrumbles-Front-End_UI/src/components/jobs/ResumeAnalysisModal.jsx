import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../integrations/supabase/client'; // Adjust import path as needed
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';
import { toast } from "sonner";
 
function ResumeAnalysisModal({ jobId, onClose, setError, onAnalysisComplete = () => {}, initialData }) {
  const [resumeText, setResumeText] = useState(initialData?.resume_text || '');
  const [jobDescription, setJobDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState(initialData || null);
  const [updatedSkills, setUpdatedSkills] = useState(initialData?.matched_skills || []);
  const [candidateId, setCandidateId] = useState(initialData?.candidate_id || null);
  const [candidateName, setCandidateName] = useState(initialData?.candidate_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [github, setGithub] = useState(initialData?.github || '');
  const [linkedin, setLinkedin] = useState(initialData?.linkedin || '');
  const [isRevalidated, setIsRevalidated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
    const user = useSelector((state) => state.auth.user);
  const organizationId = useSelector((state) => state.auth.organization_id);
 

 
  useEffect(() => {
    const getJobDescription = async () => {
      if (!jobId) {
        setError('Please select a job first.');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('hr_jobs')
          .select('description')
          .eq('id', jobId)
          .single();
        if (error) throw error;
        if (!data?.description) throw new Error('Job description not found.');
        setJobDescription(data.description);
      } catch (err) {
        setError('Error loading job description: ' + err.message);
      }
    };
    getJobDescription();
  }, [jobId, setError]);
 

 
const analyzeResume = async () => {
    if (!jobDescription || !resumeText) {
      setError('Please provide both job description and resume.');
      return;
    }

    setIsLoading(true);
    const newCandidateId = candidateId || uuidv4();
    setCandidateId(newCandidateId);

    let inputTokens = 0;
    let outputTokens = 0;
    let status = 'FAILURE';
    let analysisForLog = null;
    let rawResponseForLog = null;

    try {
      // --- REPLACED: Direct fetch call with Supabase Edge Function invoke ---
      const { data, error: functionError } = await supabase.functions.invoke('initial-analysis-4o', {
        body: {
          type: 'initial',
          payload: {
            jobDescription,
            resumeText,
          },
        },
      });

      if (functionError) {
        // Try to parse the error message if it's JSON from our function
        try {
            const errorBody = JSON.parse(functionError.message);
            throw new Error(errorBody.error || functionError.message);
        } catch {
            throw new Error(`Failed to analyze resume: ${functionError.message}`);
        }
      }
      
      const { analysis: parsedResult, usage } = data;
      rawResponseForLog = parsedResult; // For logging the successful analysis

      if (!parsedResult) {
        throw new Error("Edge Function did not provide a valid analysis.");
      }
      
      inputTokens = usage?.prompt_tokens ?? 0;
      outputTokens = usage?.completion_tokens ?? 0;
      status = 'SUCCESS';
      analysisForLog = parsedResult;

      // --- The rest of the logic remains the same ---
      const normalizeCompanyName = (name) => {
        if (!name || typeof name !== 'string') return "";
        let normalized = name.toLowerCase().trim();
        normalized = normalized.replace(/\s*(ltd|limited|inc|corp|corporation|llc|co)\.?\s*$/i, '');
        normalized = normalized.replace(/[^\w\s-]/g, '');
        normalized = normalized.split(/\s+/).join(' ').trim();
        return normalized;
      };

      const companyData = (parsedResult.companies || []).map(company => {
        const normalizedName = normalizeCompanyName(company.name);
        if (!normalizedName) return null;
        return {
          name: normalizedName,
          original_name: company.name,
          designation: company.designation || '-',
          years: company.years || '-',
        }
      }).filter(Boolean);

      const uniqueCompanies = Array.from(
        new Map(companyData.map(item => [item.name, item])).values()
      );

      const companiesToSave = uniqueCompanies.map(c => ({
          name: c.name,
          designation: c.designation,
          years: c.years,
      }));
      
      setAnalysisResult({...parsedResult, companies: companiesToSave});
      setUpdatedSkills(parsedResult.matched_skills || []);
      setCandidateName(parsedResult.candidate_name || 'Unknown');
      setEmail(parsedResult.email || '');
      setGithub(parsedResult.github || '');
      setLinkedin(parsedResult.linkedin || '');

      const saved = await saveData(resumeText, { ...parsedResult, companies: uniqueCompanies }, newCandidateId, true);
      if (saved) {
        onAnalysisComplete({
          job_id: jobId,
          candidate_id: newCandidateId,
          candidate_name: parsedResult.candidate_name,
          overall_score: parsedResult.overall_match_score,
        });
        setIsAnalysisComplete(true);
      }
      setShowResults(false);
    } catch (err) {
      setError('Error analyzing resume: ' + err.message);
      analysisForLog = { error: err.message, raw_response: rawResponseForLog };
    } finally {
      await supabase.from('hr_gemini_usage_log').insert({
        organization_id: organizationId,
        created_by: user.id,
        status: status,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        analysis_response: analysisForLog,
        parsed_email: analysisForLog?.email || null,
        usage_type: 'resume_initial_analysis_openai' 
      });
      setIsLoading(false);
    }
  };
   
const saveData = async (resumeText, result, candidateId, isInitial = false) => {
      try {
        if (isInitial && result.email) {
          const { data: existing } = await supabase
            .from('resume_analysis')
            .select('candidate_id')
            .eq('email', result.email)
            .eq('job_id', jobId)
            .single();
          if (existing) {
          toast.error('Candidate with this email already added for this job.');
          setError('Candidate with this email already exists.');
          return false;
        }
        }
   
        // Validate required fields
        if (!jobId || !candidateId) {
          throw new Error('Missing required fields: job_id or candidate_id');
        }
   
        // Step 1: Prepare resume_analysis payload (no companies field)
        const resumePayload = {
          job_id: jobId,
          candidate_id: candidateId,
          resume_text: resumeText || null,
          overall_score: Math.round(result.overall_match_score),
          matched_skills: result.matched_skills ? JSON.parse(JSON.stringify(result.matched_skills)) : null,
          summary: result.summary || null,
          missing_or_weak_areas: Array.isArray(result.missing_or_weak_areas) ? result.missing_or_weak_areas : [],
          top_skills: Array.isArray(result.top_skills) ? result.top_skills : [],
          development_gaps: Array.isArray(result.development_gaps) ? result.development_gaps : [],
          additional_certifications: Array.isArray(result.additional_certifications) ? result.additional_certifications : [],
          section_wise_scoring: result.section_wise_scoring ? JSON.parse(JSON.stringify(result.section_wise_scoring)) : {},
          candidate_name: result.candidate_name || 'Unknown',
          email: result.email || '',
          github: result.github || '',
          linkedin: result.linkedin || '',
          updated_at: new Date().toISOString(),
           updated_by: user.id, // Always set the user who updated it
        organization_id: organizationId, // Add organization_id
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
   
        // START: Updated Step 3 - Company Association Logic using Upsert
        // ****************************************************************
        if (result.companies && Array.isArray(result.companies)) {
          const companyEntries = [];
          const companyErrors = []; // Collect errors without stopping immediately
 
          for (const company of result.companies) {
            // Company name is expected to be already normalized here
            const normalizedCompanyName = company.name;
            if (!normalizedCompanyName) {
              console.warn("Skipping company entry with empty normalized name.");
              continue; // Skip if name is empty after normalization
            }
 
            try {
                // Use upsert for companies based on the normalized name
                // Assumes 'companies' table has a unique constraint on 'name'
                const { data: companyUpsertData, error: companyUpsertError } = await supabase
                .from('companies')
                .upsert({ name: normalizedCompanyName /* add other company fields if needed */ }, { onConflict: 'name' }) // Use 'name' as the conflict target
                .select('id') // Select the ID after upsert
                .single(); // Expecting a single row back
 
              if (companyUpsertError) {
                 // Log specific error but continue processing others
                 console.error(`Supabase Company Upsert Error for "${normalizedCompanyName}":`, JSON.stringify(companyUpsertError, null, 2));
                 companyErrors.push(`Failed upsert for company "${normalizedCompanyName}": ${companyUpsertError.message}`);
                 continue; // Skip adding this company to entries
              }
 
              if (!companyUpsertData || !companyUpsertData.id) {
                  // Log specific error but continue processing others
                  console.error('Supabase Company Upsert Warning: Did not return ID for', normalizedCompanyName);
                  companyErrors.push(`Upsert ok but no ID returned for company "${normalizedCompanyName}"`);
                  continue; // Skip adding this company to entries
              }
 
              const companyId = companyUpsertData.id;
 
              // Add entry for the candidate_companies junction table
              companyEntries.push({
                candidate_id: candidateId,
                job_id: jobId,
                company_id: companyId,
                designation: company.designation || '-',
                years: company.years || '-',
              });
 
            } catch (loopError) {
                 // Catch any unexpected error during the loop for one company
                 console.error(`Unexpected error processing company "${normalizedCompanyName}":`, loopError);
                 companyErrors.push(`Unexpected error for company "${normalizedCompanyName}": ${loopError.message}`);
            }
          } // End FOR loop for companies
 
          // After processing all companies, check if there are entries to save
          if (companyEntries.length > 0) {
            console.log('Saving to Supabase - Candidate Companies Payload:', JSON.stringify(companyEntries, null, 2));
            const { error: linkError } = await supabase
              .from('candidate_companies')
              .upsert(companyEntries, { onConflict: 'candidate_id,job_id,company_id' }); // Corrected onConflict
 
            if (linkError) {
              console.error('Supabase Candidate Companies Upsert Error:', JSON.stringify(linkError, null, 2));
              // Decide if this error should stop the whole save process or just be logged
              // Throwing here makes it critical
              throw new Error(`Candidate companies upsert failed: ${linkError.message}`);
            }
            console.log("Candidate company associations saved successfully.");
 
            // Optional: Log any non-critical errors encountered during individual company upserts
            if (companyErrors.length > 0) {
                console.warn("Non-critical errors encountered during company processing:", companyErrors);
                // Optionally bubble up a warning, but don't mark save as failed
                // setError("Warning: Some company data might not have been saved correctly.");
            }
 
            // Step 4: Verify saved company data (Optional but good for debugging)
            // Removed the throw new Error from fetchError to make verification non-critical
            const { data: savedCompanies, error: fetchError } = await supabase
              .from('candidate_companies')
              .select('company_id, designation, years, companies (id, name)') // Select company name too
              .eq('candidate_id', candidateId)
              .eq('job_id', jobId);
 
            if (fetchError) {
              console.warn('Supabase Fetch Warning: Failed to verify company data after save:', JSON.stringify(fetchError, null, 2));
            } else {
                 console.log('Verified Saved Companies:', JSON.stringify(savedCompanies, null, 2));
            }
 
          } else {
             console.log("No valid candidate company entries to save after processing.");
             if (companyErrors.length > 0) {
                 console.warn("Non-critical errors encountered during company processing (no entries saved):", companyErrors);
                 // setError("Warning: Could not process company data."); // Optional warning
             }
          }
        } else {
            console.log("No 'companies' array found in the result or it's empty.");
        }
        // ****************************************************************
        // END: Updated Step 3 - Company Association Logic
        // ****************************************************************
   
        return true;
      } catch (err) {
        setError(`Error saving data: ${err.message || 'Unknown error'}`);
        console.error('Caught Error:', JSON.stringify(err, null, 2));
        return false;
      }
    };

   
    const updateSkillLocally = (index, newStatus) => {
      const newSkills = [...updatedSkills];
      newSkills[index].matched = newStatus;
      if (newStatus !== 'no') delete newSkills[index].question;
      setUpdatedSkills(newSkills);
    };
   
const revalidateSkills = async () => {
    setIsLoading(true);

    let inputTokens = 0;
    let outputTokens = 0;
    let status = 'FAILURE';
    let analysisForLog = null;
    let rawResponseForLog = null; // To store the raw response for error logging

    try {
      // Step 1: Call the Supabase Edge Function for revalidation
      const { data, error: functionError } = await supabase.functions.invoke('initial-analysis-4o', {
          body: {
              type: 'revalidation',
              payload: {
                  updatedSkills, // The locally modified skills
                  initialSectionWiseScoring: analysisResult.section_wise_scoring, // The original scoring rubric
              },
          },
      });

      // Handle errors returned from the Edge Function
      if (functionError) {
        try {
            // The function might return a JSON error object, try to parse it
            const errorBody = JSON.parse(functionError.message);
            throw new Error(errorBody.error || functionError.message);
        } catch {
            // Otherwise, use the raw error message
            throw new Error(`Failed to revalidate skills: ${functionError.message}`);
        }
      }

      const { analysis: updatedScores, usage } = data;
      rawResponseForLog = updatedScores; // Store successful response for potential logging

      if (!updatedScores || !updatedScores.overall_match_score) {
        throw new Error("Edge Function did not provide a valid revalidation response.");
      }
      
      // Step 2: Set variables for successful logging
      inputTokens = usage?.prompt_tokens ?? 0;
      outputTokens = usage?.completion_tokens ?? 0;
      status = 'SUCCESS';
      analysisForLog = updatedScores;
      
      console.log('Updated Scores from Edge Function:', updatedScores);

      // Step 3: Prepare the final result object with the new scores
      const updatedResult = {
        ...analysisResult,
        overall_match_score: Math.round(updatedScores.overall_match_score),
        section_wise_scoring: updatedScores.section_wise_scoring,
        matched_skills: updatedSkills, // Keep the user-modified skills
      };

      if (!jobId || !candidateId) {
        throw new Error('Missing required fields: job_id or candidate_id');
      }
      
      // Step 4: Update state and save the data
      setAnalysisResult(updatedResult);
      setIsRevalidated(true);
      const saved = await saveData(resumeText, updatedResult, candidateId, false);
      
      if (saved) {
        onAnalysisComplete({
          job_id: jobId,
          candidate_id: candidateId,
          candidate_name: candidateName,
          overall_score: updatedResult.overall_match_score,
        });
      }
      setShowResults(false);

    } catch (err) {
      // --- CATCH BLOCK with LOCAL FALLBACK ---
      setError('Error re-evaluating scores (using local fallback): ' + err.message);
      analysisForLog = { error: err.message, raw_response: rawResponseForLog };
      
      console.warn("Revalidation via Edge Function failed. Attempting local fallback calculation.");

      // Local fallback calculation if the API/Edge Function fails
      const updatedScoring = JSON.parse(JSON.stringify(analysisResult.section_wise_scoring)); // Deep copy
      const skillMap = {
        "Core Skills": ["Python for automation", "Bash for automation", "PowerShell for automation", "Ansible for automation", "Familiarity with scripting languages like JavaScript", "Experience with REST APIs", "Experience with AI integrated workflows"],
        "Tools": ["Familiarity with Jenkins", "Familiarity with Selenium", "Knowledge on containerization", "VMware VRO experience"],
        "Relevant Experience": ["RPA Automation experience", "Event, Incident and IT Process Automations experience", "Linux/Windows system administration experience"],
        "Duration": ["Linux/Windows system administration experience"],
        "Professional Projects": ["RPA Automation experience", "Event, Incident and IT Process Automations experience"],
      };

      // Recalculate scores based on the skill map
      Object.keys(skillMap).forEach(submenuName => {
        const mappedSkillRequirements = skillMap[submenuName];
        const relevantSkills = updatedSkills.filter(skill => mappedSkillRequirements.includes(skill.requirement));
        
        if (relevantSkills.length > 0) {
          const totalScore = relevantSkills.reduce((sum, skill) => {
            if (skill.matched === 'yes') return sum + 10;
            if (skill.matched === 'partial') return sum + 5;
            return sum + 0;
          }, 0);
          const avgScore = totalScore / relevantSkills.length;

          // Find and update the correct submenu in our scoring object
          for (const sectionKey in updatedScoring) {
              const section = updatedScoring[sectionKey];
              const submenuObj = section.submenus.find(sub => sub.submenu === submenuName);
              if (submenuObj) {
                  submenuObj.score = avgScore;
                  submenuObj.weighted_score = (submenuObj.weightage * avgScore) / 100;
                  break; // Move to the next skillMap key once found
              }
          }
        }
      });
      
      // Recalculate the overall score from the locally updated section scores
      const overallMatchScore = Object.values(updatedScoring).reduce((total, section) => {
        const sectionScore = section.submenus.reduce((sum, submenu) => sum + (submenu.weighted_score || 0), 0);
        return total + (sectionScore * section.weightage) / 100;
      }, 0);

      const updatedResultFallback = {
        ...analysisResult,
        overall_match_score: Math.round(overallMatchScore),
        section_wise_scoring: updatedScoring,
        matched_skills: updatedSkills,
      };

      // Update state and save the fallback data
      setAnalysisResult(updatedResultFallback);
      setIsRevalidated(true);
      const saved = await saveData(resumeText, updatedResultFallback, candidateId, false);
      if (saved) {
        onAnalysisComplete({
          job_id: jobId,
          candidate_id: candidateId,
          candidate_name: candidateName,
          overall_score: updatedResultFallback.overall_match_score,
        });
      }
      
    } finally {
      // This will run after either the try or catch block completes
      await supabase.from('hr_gemini_usage_log').insert({
        organization_id: organizationId,
        created_by: user.id,
        status: status, // Will be 'FAILURE' if catch block was entered, 'SUCCESS' otherwise
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        analysis_response: analysisForLog,
        parsed_email: email,
        usage_type: 'resume_revalidation_openai'
      });
      setIsLoading(false);
    }
  };
 
  return (
    <Modal
      isOpen={true}
      onRequestClose={onClose}
      style={{
        content: {
          maxWidth: '1000px',
          width: '95%',
          margin: '20px auto',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid #d1c4e9',
          background: '#fff',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <h2 className="text-2xl font-bold text-purple-800 mb-4">Resume Analysis</h2>
      <textarea
        placeholder="Paste your resume here..."
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        rows={8}
        className="w-full p-3 border border-purple-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div className="flex space-x-4 mb-4">
        <button
          onClick={analyzeResume}
          disabled={isLoading || !resumeText || !jobDescription}
          className={`px-4 py-2 rounded-lg text-white bg-purple font-semibold transition-colors ${
            isLoading || !resumeText || !jobDescription
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
          }`}
        >
          {isLoading ? 'Loading...' : 'Analyze'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Close
        </button>
      </div>
      {/* {isLoading && <p className="text-purple-600">Loading...</p>} */}
      { isAnalysisComplete && analysisResult && resumeText && (
        <div className="mt-4">
          <button
            onClick={() => setShowResults(!showResults)}
            className="px-4 py-2 rounded-lg bg-purple-200 text-purple-800 font-semibold hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {showResults ? 'Hide Results' : '👁️ View Results'}
          </button>
          {showResults && analysisResult && !isLoading && (
            <>
              <div className="mt-4">
                <h3 className="text-xl font-semibold text-purple-800 mb-2">Candidate: {candidateName}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600">
                  <p><strong>Email:</strong> {email || 'N/A'}</p>
                  <p><strong>GitHub:</strong> {github || 'N/A'}</p>
                  <p><strong>LinkedIn:</strong> {linkedin || 'N/A'}</p>
                </div>
                <h3 className="text-xl font-semibold text-purple-800 mb-2">
                  ✅ Overall Match Score: {analysisResult.overall_match_score}%
                </h3>
              </div>
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">🧾 Summary</h4>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-600">
                {analysisResult.summary || 'No summary available'}
              </div>
 
            <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">🔑 Matched Skills & Experiences</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead className="bg-purple-100">
                    <tr>
                      <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Requirement</th>
                      <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Status</th>
                      <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Details</th>
                      {!isRevalidated && <th className="p-3 text-purple-800 font-semibold border-b-2 border-purple-200">Update</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(updatedSkills) && updatedSkills.length > 0 ? (
                      updatedSkills.map((skill, idx) => (
                        <tr key={idx} className="hover:bg-purple-50 transition-colors">
                          <td className="p-3 text-purple-700 border-b border-purple-100">{skill.requirement}</td>
                          <td className="p-3 text-purple-700 border-b border-purple-100 text-center">
                            {skill.matched === 'yes' ? '✅ Yes' : skill.matched === 'partial' ? '⚠️ Partial' : '❌ No'}
                          </td>
                          <td className="p-3 text-purple-600 border-b border-purple-100">{skill.details}</td>
                          {!isRevalidated && (
                            <td className="p-3 border-b border-purple-100">
                              <select
                                value={skill.matched || ''}
                                onChange={(e) => updateSkillLocally(idx, e.target.value)}
                                className="w-full p-1 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              >
                                {/* <option value="" disabled>Choose</option> */}
                                <option value="no">No</option>
                                <option value="partial">Partial</option>
                                <option value="yes">Full</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isRevalidated ? 3 : 4} className="p-3 text-purple-600 text-center border-b border-purple-100">
                          No skills data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
 
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">⚠️ Missing or Weak Areas</h4>
              <ul className="list-disc pl-5 text-purple-600">
                {Array.isArray(analysisResult.missing_or_weak_areas) && analysisResult.missing_or_weak_areas.length > 0
                  ? analysisResult.missing_or_weak_areas.map((area, idx) => <li key={idx} className="mb-2">{area}</li>)
                  : <li>No data</li>}
              </ul>
 
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">🏷️ Top Skills</h4>
              <ul className="list-disc pl-5 text-purple-600">
                {Array.isArray(analysisResult.top_skills) && analysisResult.top_skills.length > 0
                  ? analysisResult.top_skills.map((skill, idx) => <li key={idx} className="mb-2">{skill}</li>)
                  : <li>No data</li>}
              </ul>
 
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">📜 Additional Certifications (Not Required by JD)</h4>
              {Array.isArray(analysisResult.additional_certifications) && analysisResult.additional_certifications.length > 0 ? (
                <ul className="list-disc pl-5 text-purple-600">
                  {analysisResult.additional_certifications.map((cert, idx) => <li key={idx} className="mb-2">{cert}</li>)}
                </ul>
              ) : (
                <p className="text-purple-600">None listed</p>
              )}
 
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">⚠️ Development Gaps</h4>
              <ul className="list-disc pl-5 text-purple-600">
                {Array.isArray(analysisResult.development_gaps) && analysisResult.development_gaps.length > 0
                  ? analysisResult.development_gaps.map((gap, idx) => <li key={idx} className="mb-2">{gap}</li>)
                  : <li>No data</li>}
              </ul>
 
              <h4 className="text-lg font-semibold text-purple-800 mt-6 mb-4">📊 Section-wise Scoring Rubric</h4>
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
                    {analysisResult.section_wise_scoring && Object.keys(analysisResult.section_wise_scoring).length > 0 ? (
                      Object.values(analysisResult.section_wise_scoring).flatMap((section, sectionIdx) =>
                        section.submenus.map((submenu, submenuIdx) => (
                          <tr key={`${sectionIdx}-${submenuIdx}`} className="hover:bg-purple-50 transition-colors">
                            {submenuIdx === 0 && (
                              <td
                                className="p-3 text-purple-700 border-b border-purple-100 align-top"
                                rowSpan={section.submenus.length}
                              >
                                {section.section}
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
                            <td className="p-3 text-purple-700 border-b border-purple-100">{submenu.submenu} ({submenu.weightage}%)</td>
                            <td className="p-3 text-purple-700 border-b border-purple-100 text-center">{submenu.score}</td>
                            <td className="p-3 text-purple-600 border-b border-purple-100">{submenu.remarks}</td>
                          </tr>
                        ))
                      )
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-purple-600 text-center border-b border-purple-100">
                          No scoring data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
 
             
 
              {!isRevalidated && (
                <button
                  onClick={revalidateSkills}
                  disabled={isLoading}
                  className={`mt-4 px-4 py-2 rounded-lg bg-purple text-white font-semibold transition-colors ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  }`}
                >
                  {isLoading ? 'Loading...' : 'Revalidate'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
 
export default ResumeAnalysisModal;
 