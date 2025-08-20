
import { supabase } from "@/integrations/supabase/client";
import { CandidateStatus } from "@/lib/types";
import { MainStatus, SubStatus } from "@/services/statusService";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

// Interfaces remain unchanged
export interface HrJobCandidate {
  location: any;
  id: string;
  job_id: string;
  name: string;
  status: CandidateStatus;
  experience: string | null;
  match_score: number | null;
  applied_date: string;
  skills: string[] | null;
  email: string | null;
  phone: string | null;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: {
    currentLocation?: string;
    preferredLocations?: string[];
    totalExperience?: number;
    totalExperienceMonths?: number; // Added
    relevantExperience?: number;
    relevantExperienceMonths?: number; // Added
    currentSalary?: number;
    expectedSalary?: number;
    resume_url?: string;
    noticePeriod?: number; // Add Notice Period (in days)
  lastWorkingDay?: string; // Add Last Working Day (date string, e.g., "2025-05-30")

  uan?: string; // Add UAN
    pan?: string; // Add PAN
    pf?: string; // Add PF
    esicNumber?: string; // Add ESIC Number
    linkedInId?: string; // Added
    hasOffers?: "Yes" | "No"; // Added
    offerDetails?: string; // Added
    [key: string]: any; // Allow other fields
  } | null;
  skill_ratings: Record<string, any> | Array<{ name: string; rating: number }> | null;
  career_experience?: any[] | null;
  projects?: any[] | null;
  applied_from?: string;
  expected_salary: any;
  current_salary: any;
  main_status_id: string | null;
  sub_status_id: string | null;
  main_status?: Partial<MainStatus> | null;
  sub_status?: Partial<SubStatus> | null;
  created_by?: string;
  updated_by?: string;
  has_validated_resume?: boolean;
}

// Updated CandidateData interface
export interface CandidateData {
  location: any;
  expectedSalary: any;
  currentSalary: any;
  appliedFrom?: string;
  id: string;
  name: string;
  status: CandidateStatus;
  experience: string;
  matchScore: number;
  appliedDate: string;
  skills: string[];
  email?: string;
  phone?: string;
  resumeUrl?: string;
  metadata?: {
    currentLocation?: string;
    preferredLocations?: string[];
    totalExperience?: number;
    totalExperienceMonths?: number; // Added
    relevantExperience?: number;
    relevantExperienceMonths?: number; // Added
    currentSalary?: number;
    expectedSalary?: number;
    resume_url?: string;
    noticePeriod?: number; // Add Notice Period (in days)
  lastWorkingDay?: string; // Add Last Working Day (date string, e.g., "2025-05-30")
  uan?: string; // Add UAN
    pan?: string; // Add PAN
    pf?: string; // Add PF
    esicNumber?: string;
    linkedInId?: string; // Added
    hasOffers?: "Yes" | "No"; // Added
    offerDetails?: string; // Added
    [key: string]: any; // Allow other fields
  };
  skillRatings?: Array<{ name: string; rating: number }>;
  career_experience?: any[] | null;
  projects?: any[] | null;
  main_status?: Partial<MainStatus> | null;
  sub_status?: Partial<SubStatus> | null;
  createdBy?: string;
  updatedBy?: string;
  progress: {
    screening: boolean;
    interview: boolean;
    offer: boolean;
    hired: boolean;
    joined: boolean;
  };
}

// Updated mapDbCandidateToData function
export const mapDbCandidateToData = (candidate: HrJobCandidate): CandidateData => {
  console.log("Candidate from DB:", candidate); // Debug log

  const rawStatus = candidate.status || "New";
  const cleanedStatus = rawStatus.replace(/'::text$/, "") as CandidateStatus;

  // Parse skills from JSON strings to an array of skill names
  const skills = candidate.skills
    ? candidate.skills.map((skill) => {
        try {
          const parsed = JSON.parse(skill);
          return parsed.name || skill; // Extract name if it’s an object, fallback to raw string
        } catch {
          return skill; // If parsing fails, use the raw string
        }
      })
    : [];

  // Calculate progress based solely on main_status.name
  const mainStatusName = candidate.main_status?.name;
  const progress = {
    screening: false,
    interview: false,
    offer: false,
    hired: false,
    joined: false
  };

  if (mainStatusName) {
    const stageOrder = ['Screening', 'Interview', 'Offer', 'Hired', 'Joined'];
    const stageIndex = stageOrder.indexOf(mainStatusName);

    if (stageIndex >= 0) {
      progress.screening = true;
      if (stageIndex >= 1) progress.interview = true;
      if (stageIndex >= 2) progress.offer = true;
      if (stageIndex >= 3) progress.hired = true;
      if (stageIndex >= 4) progress.joined = true;
    }
  }

  return {
    id: candidate.id,
    name: candidate.name,
    status: cleanedStatus,
    experience: candidate.experience || "",
    matchScore: candidate.match_score || 0,
    appliedDate: candidate.applied_date,
    skills,
    email: candidate.email || undefined,
    phone: candidate.phone || undefined,
    resumeUrl: candidate.resume_url || undefined,
    metadata: candidate.metadata
      ? {
          currentLocation: candidate.metadata.currentLocation,
          preferredLocations: candidate.metadata.preferredLocations,
          totalExperience: candidate.metadata.totalExperience,
          totalExperienceMonths: candidate.metadata.totalExperienceMonths, // Added
          relevantExperience: candidate.metadata.relevantExperience,
          relevantExperienceMonths: candidate.metadata.relevantExperienceMonths, // Added
          currentSalary: candidate.metadata.currentSalary,
          expectedSalary: candidate.metadata.expectedSalary,
          resume_url: candidate.metadata.resume_url,
          noticePeriod: candidate.metadata.noticePeriod,
  lastWorkingDay: candidate.metadata.lastWorkingDay,
  linkedInId: candidate.metadata.linkedInId, // Added
          hasOffers: candidate.metadata.hasOffers, // Added
          offerDetails: candidate.metadata.offerDetails, // Added
  uan: candidate.metadata.uan, // Include UAN
          pan: candidate.metadata.pan, // Include PAN
          pf: candidate.metadata.pf, // Include PF
          esicNumber: candidate.metadata.esicNumber, // Include ESIC Number
          ...candidate.metadata // Preserve other metadata fields
        }
      : undefined,
    skillRatings: candidate.skill_ratings || undefined,
    appliedFrom: candidate.applied_from ?? undefined,
    currentSalary: candidate.current_salary ?? undefined,
    expectedSalary: candidate.expected_salary ?? undefined,
    location: candidate.location ?? undefined,
    main_status: candidate.main_status || undefined,
    sub_status: candidate.sub_status || undefined,
    hasValidatedResume: candidate.has_validated_resume || false,
    progress,
  };
};

// Rest of the file (mapCandidateToDbData, getCandidaftesByJobId, etc.) remains unchanged
// ... [Your other functions here] ...

export const mapCandidateToDbData = (candidate: CandidateData): Partial<HrJobCandidate> => {
  console.log("Input CandidateData:", candidate); // Debug log

  const dbCandidate = {
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience || null,
    match_score: candidate.matchScore,
    applied_date: candidate.appliedDate,
    skills: candidate.skills || [],
    email: candidate.email || null,
    phone: candidate.phone || null,
    resume_url: candidate.resumeUrl || null,
    metadata: candidate.metadata
      ? {
          currentLocation: candidate.metadata.currentLocation,
          preferredLocations: candidate.metadata.preferredLocations,
          totalExperience: candidate.metadata.totalExperience,
          totalExperienceMonths: candidate.metadata.totalExperienceMonths,
          relevantExperience: candidate.metadata.relevantExperience,
          relevantExperienceMonths: candidate.metadata.relevantExperienceMonths,
          currentSalary: candidate.metadata.currentSalary,
          expectedSalary: candidate.metadata.expectedSalary,
          resume_url: candidate.metadata.resume_url,
          noticePeriod: candidate.metadata.noticePeriod,
          lastWorkingDay: candidate.metadata.lastWorkingDay,
          uan: candidate.metadata.uan, // Include UAN
          pan: candidate.metadata.pan, // Include PAN
          pf: candidate.metadata.pf, // Include PF
          esicNumber: candidate.metadata.esicNumber, // Include ESIC Number
          linkedInId: candidate.metadata.linkedInId, // Added
          hasOffers: candidate.metadata.hasOffers, // Added
          offerDetails: candidate.metadata.offerDetails, // Added
        }
      : null,
    skill_ratings: candidate.skillRatings || null,
    applied_from: candidate.appliedFrom || null,
    current_salary: candidate.currentSalary || null,
    expected_salary: candidate.expectedSalary || null,
    updated_by: candidate.updatedBy,
    created_by: candidate.createdBy,
    career_experience: candidate.career_experience || null,
    projects: candidate.projects || null,
  };

  console.log("Mapped dbCandidate:", dbCandidate); // Debug log
  return dbCandidate;
};


// Get all candidates for a job
export const getCandidatesByJobId = async (jobId: string, statusFilter?: string): Promise<any[]> => {
  try {
    let query = supabase
      .from('hr_job_candidates')
      .select(`
        *,
        id, 
        job_id, 
        name, 
        status, 
        experience, 
        match_score, 
        applied_date, 
        skills, 
        email, 
        phone, 
        resume_url, 
        metadata, 
        skill_ratings, 
        applied_from, 
        current_salary, 
        expected_salary, 
        location, 
        main_status_id, 
        sub_status_id,
        has_validated_resume,
        overall_score,
        created_at,
        ctc,
        accrual_ctc,
        main_status:job_statuses!main_status_id(*),
        sub_status:job_statuses!sub_status_id(*)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;

    // Set default status if any candidate lacks main/sub status
    if (data && data.length > 0) {
      const candidatesToUpdate = data.filter(candidate => !candidate.main_status_id || !candidate.sub_status_id);
      
      if (candidatesToUpdate.length > 0) {
        console.log(`Found ${candidatesToUpdate.length} candidates without a status. Setting default status.`);

        const { data: mainStatuses, error: mainStatusError } = await supabase
          .from('job_statuses')
          .select('*')
          .eq('name', 'New')
          .eq('type', 'main')
          .single();

        if (mainStatusError) throw mainStatusError;

        if (mainStatuses) {
          const { data: subStatuses, error: subStatusError } = await supabase
            .from('job_statuses')
            .select('*')
            .eq('parent_id', mainStatuses.id)
            .eq('type', 'sub');

          if (subStatusError) throw subStatusError;

          const defaultSubStatus = subStatuses && subStatuses.length > 0
            ? subStatuses[0]
            : { id: 'new_application' };

          const updatePromises = candidatesToUpdate.map(candidate =>
            supabase
              .from('hr_job_candidates')
              .update({
                main_status_id: mainStatuses.id,
                sub_status_id: defaultSubStatus.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', candidate.id)
          );

          const updateResults = await Promise.all(updatePromises);
          updateResults.forEach(({ error: updateError }) => {
            if (updateError) {
              console.error('Error updating candidate status:', updateError);
            }
          });
        }
      }
    }

    // Ensure hasValidatedResume is consistently returned
    const result = (data || []).map(candidate => ({
      ...candidate,
      hasValidatedResume: candidate.has_validated_resume || false,
     id: candidate.id,
  jobId: candidate.job_id,
  name: candidate.name,
  status: candidate.status,
  experience: candidate.experience,
  matchScore: candidate.match_score || 0,
  appliedDate: candidate.applied_date,
  skills: candidate.skills || [],
  email: candidate.email || undefined,
  phone: candidate.phone || undefined,
  resumeUrl: candidate.resume_url || undefined,
  metadata: candidate.metadata || undefined,
  skillRatings: candidate.skill_ratings || undefined,
  appliedFrom: candidate.applied_from ?? undefined,
  currentSalary: candidate.current_salary ?? undefined,
  expectedSalary: candidate.expected_salary ?? undefined,
  location: candidate.location ?? undefined,
  mainStatusId: candidate.main_status_id,
  subStatusId: candidate.sub_status_id,
  main_status: candidate.main_status,
  sub_status: candidate.sub_status,
  overallScore: candidate.overall_score || 0
    }));

    return result;
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return [];
  }
};

// Create a new candidate
export const createCandidate = async (jobId: string, candidate: CandidateData): Promise<CandidateData> => {
  try {
    const dbCandidate = mapCandidateToDbData(candidate);

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

    // Fetch the main status "Processed"
    const { data: mainStatus, error: mainStatusError } = await supabase
      .from("job_statuses")
      .select("id")
      .eq("type", "main")
      .eq("name", "Processed")
      .single();

    if (mainStatusError || !mainStatus) {
      console.error("Error fetching Processed main status:", mainStatusError);
      throw new Error("Could not find Processed main status");
    }

    // Fetch the sub-status "Processed (Internal)" linked to the "Processed" main status
    const { data: subStatus, error: subStatusError } = await supabase
      .from("job_statuses")
      .select("id")
      .eq("type", "sub")
      .eq("name", "Processed (Internal)")
      .eq("parent_id", mainStatus.id)
      .single();

    if (subStatusError || !subStatus) {
      console.error("Error fetching Processed (Internal) sub-status:", subStatusError);
      throw new Error("Could not find Processed (Internal) sub-status");
    }

    console.log("Payload for createCandidate:", {
      ...dbCandidate,
      job_id: jobId,
      main_status_id: mainStatus.id,
      sub_status_id: subStatus.id,
    }); // Debug log

    const { data, error } = await supabase
      .from("hr_job_candidates")
      .insert({
        ...dbCandidate,
        job_id: jobId,
        name: candidate.name,
        main_status_id: mainStatus.id, // Set main status to Processed
        sub_status_id: subStatus.id, // Set sub-status to Processed (Internal)
        organization_id: organization_id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating candidate:", error);
      throw error;
    }

    // Record the status change in hr_status_change_counts
    const statusUpdateSuccess = await updateCandidateStatusCounts(
      data.id, // Candidate ID from the inserted record
      jobId,
      mainStatus.id,
      subStatus.id,
      candidate.createdBy // Optional: user ID who created the candidate
    );

    if (!statusUpdateSuccess) {
      console.warn("Warning: Failed to update status change counts for candidate:", data.id);
      // Decide whether to throw an error or continue based on your requirements
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to create candidate for job ${jobId}:`, error);
    throw error;
  }
};

// Update a candidate
export const updateCandidate = async (
  id: string,
  candidate: CandidateData
): Promise<CandidateData> => {
  try {
    // Step 1: Get the existing candidate metadata
    const { data: existingData, error: fetchError } = await supabase
      .from('hr_job_candidates')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("Error fetching existing metadata:", fetchError);
      throw fetchError;
    }

    const existingMetadata = existingData?.metadata || {};

    // Step 2: Merge the new fields into existing metadata
    const updatedMetadata = {
      ...existingMetadata,
      uan: candidate.metadata?.uan || null,
      pan: candidate.metadata?.pan || null,
      pf: candidate.metadata?.pf || null,
      esicNumber: candidate.metadata?.esicNumber || null,
    };

    // Step 3: Update only the metadata field
    const { data, error: updateError } = await supabase
      .from('hr_job_candidates')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error("Error updating candidate metadata:", updateError);
      throw updateError;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update metadata for candidate with ID ${id}:`, error);
    throw error;
  }
};


export const editCandidate = async (id: string, candidate: CandidateData): Promise<CandidateData> => {
  try {
    const dbCandidate = mapCandidateToDbData(candidate);
    console.log("Payload being sent to DB:", dbCandidate); // Debug log

    const { data, error } = await supabase
      .from('hr_job_candidates')
      .update(dbCandidate)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating candidate:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update candidate with ID ${id}:`, error);
    throw error;
  }
};

// Update candidate status
// export const updateCandidateStatus = async (id: string, status: CandidateStatus): Promise<void> => {
//   try {
//     const { error } = await supabase
//       .from('hr_job_candidates')
//       .update({ status })
//       .eq('id', id);

//     if (error) {
//       console.error("Error updating candidate status:", error);
//       throw error;
//     }
//   } catch (error) {
//     console.error(`Failed to update status for candidate with ID ${id}:`, error);
//     throw error;
//   }
// };

// Update Skill Ratings alone Tab
// Update only the skill_ratings field for a candidate
export const updateCandidateSkillRatings = async (
  id: string,
  skillRatings: Array<{ name: string; rating: number }>
): Promise<CandidateData> => {
  try {
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .update({ skill_ratings: skillRatings }) // Update only skill_ratings
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating candidate skill ratings:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update skill ratings for candidate with ID ${id}:`, error);
    throw error;
  }
};

// Delete a candidate
export const deleteCandidate = async (id: string): Promise<void> => {
  try {
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { error } = await supabase
      .from('hr_job_candidates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting candidate:", error);
      throw error;
    }
  } catch (error) {
    console.error(`Failed to delete candidate with ID ${id}:`, error);
    throw error;
  }
};

// Update only the has_validated_resume field for a candidate
export const updateCandidateValidationStatus = async (candidateId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('hr_job_candidates')
      .update({ has_validated_resume: true })
      .eq('id', candidateId);

    if (error) {
      console.error("Error updating candidate validation status:", error);
      throw error;
    }
  } catch (error) {
    console.error(`Failed to update validation status for candidate with ID ${candidateId}:`, error);
    throw error;
  }
};



// Testing




/**
 * Get candidate status counts for a specific job
 * This allows us to get counts for main statuses or sub-statuses
 */
export const getCandidateStatusCounts = async (jobId: string, countType: 'main' | 'sub' = 'main'): Promise<{name: string, count: number, color: string}[]> => {
  try {
    const { data: candidates, error } = await supabase
      .from('hr_job_candidates')
      .select(`
        main_status:job_statuses!main_status_id(id, name, color),
        sub_status:job_statuses!sub_status_id(id, name, color)
      `)
      .eq('job_id', jobId);
    
    if (error) throw error;
    
    if (!candidates || candidates.length === 0) {
      return [];
    }
    
    // Process the data to get counts based on the requested type
    const statusMap = new Map<string, {count: number, name: string, color: string}>();
    
    candidates.forEach(candidate => {
      const status = countType === 'main' ? candidate.main_status : candidate.sub_status;
      if (!status) return;
      
      const statusKey = status.id;
      const statusName = status.name;
      const statusColor = status.color || '#7B43F1'; // Default color if none is set
      
      if (statusMap.has(statusKey)) {
        const current = statusMap.get(statusKey)!;
        statusMap.set(statusKey, {
          ...current,
          count: current.count + 1
        });
      } else {
        statusMap.set(statusKey, {
          count: 1,
          name: statusName,
          color: statusColor
        });
      }
    });
    
    // Convert the map to an array of objects
    return Array.from(statusMap.values());
  } catch (error) {
    console.error('Error fetching candidate status counts:', error);
    return [];
  }
};

// Fix the hr_status_change_counts issue by using maybeSingle() instead of single()
export const updateCandidateStatusCounts = async (
  candidateId: string,
  jobId: string,
  mainStatusId: string,
  subStatusId: string,
  userId?: string
): Promise<boolean> => {
  try {

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    // Check if a count entry already exists
    const { data: existingCount, error: countError } = await supabase
      .from('hr_status_change_counts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('main_status_id', mainStatusId)
      .eq('sub_status_id', subStatusId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows found
    
    if (countError) {
      console.error('Error checking existing count:', countError);
      return false;
    }

    if (existingCount) {
      // Update existing count
      const { error } = await supabase
        .from('hr_status_change_counts')
        .update({
          count: (existingCount.count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCount.id);
      
      if (error) {
        console.error('Error updating count:', error);
        return false;
      }
    } else {
      // Create new count entry
      const { error } = await supabase
        .from('hr_status_change_counts')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          main_status_id: mainStatusId,
          sub_status_id: subStatusId,
          employee_id: userId,
          count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: organization_id
        });
      
      if (error) {
        console.error('Error creating count:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating status change counts:', error);
    return false;
  }
};

export const getAllCandidatesWithVerificationInfo = async () => {

  const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  const { data, error } = await supabase
    .from('hr_job_candidates')
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      job:hr_jobs!hr_job_candidates_job_id_fkey(id, title), 
      creator:hr_employees!hr_job_candidates_created_by_fkey (first_name, last_name),
      uanlookups (
       created_at,
        lookup_type,
        response_data,
        user:hr_employees!uanlookups_verified_by_fkey (
          first_name,
          last_name
        )
      )
    `)
    .eq('organization_id', organization_id)
    .order('created_at', { referencedTable: 'uanlookups', ascending: false }); // Sort lookups by date

  if (error) {
    console.error("Error fetching all candidates with verification info:", error);
    throw new Error(error.message);
  }

  // Process the data to flatten it and keep only the latest verification
  return data.map(candidate => {
    const latestVerification = candidate.uanlookups.length > 0 ? candidate.uanlookups[0] : null;
    
    return {
      ...candidate,
      job_id: candidate.job?.id,
      job_title: candidate.job?.title,
      latest_verification: latestVerification // Attach the latest record
    };
  });
};