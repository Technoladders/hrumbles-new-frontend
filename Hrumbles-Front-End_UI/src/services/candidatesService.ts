
import { supabase } from "@/integrations/supabase/client";
import { Candidate } from "@/lib/types";
import { toast } from "sonner";

// Type definitions for database candidate
export interface DbCandidate {
  id?: string;
  job_id: string;
  name: string;
  status: string;
  applied_date: string;
  skills?: string[];
  email?: string;
  phone?: string;
  resume_url?: string;
  experience?: string;
  current_salary?: number;
  expected_salary?: number;
  location?: string;
  applied_from?: string;
  match_score?: number;
  main_status_id?: string;
  sub_status_id?: string;
  metadata?: any;
}

// Fetch candidates for a specific job
export const getCandidatesForJob = async (jobId: string): Promise<Candidate[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .select(`
        *,
        main_status:job_statuses!main_status_id(*),
        sub_status:job_statuses!sub_status_id(*)
      `)
      .eq('job_id', jobId);

    if (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }

    return (data || []).map(mapDbCandidateToCandidate);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return [];
  }
};

// Map database candidate to frontend Candidate type
const mapDbCandidateToCandidate = (dbCandidate: any): Candidate => {
  // Calculate progress based on status
  const progress = calculateProgressFromStatus(dbCandidate.status, dbCandidate.main_status?.name);
  
  return {
    id: dbCandidate.id,
    name: dbCandidate.name || '',
    status: dbCandidate.status || 'New',
    experience: dbCandidate.experience || '',
    matchScore: dbCandidate.match_score || 0,
    appliedDate: dbCandidate.applied_date || new Date().toISOString().split('T')[0],
    skills: dbCandidate.skills || [],
    email: dbCandidate.email || '',
    phone: dbCandidate.phone || '',
    currentSalary: dbCandidate.current_salary || 0,
    expectedSalary: dbCandidate.expected_salary || 0,
    location: dbCandidate.location || '',
    appliedFrom: dbCandidate.applied_from || '',
    resume: dbCandidate.resume_url ? {
      url: dbCandidate.resume_url,
      filename: dbCandidate.resume_filename || 'resume.pdf',
      size: dbCandidate.resume_size || 0,
      uploadDate: dbCandidate.resume_upload_date || new Date().toISOString()
    } : null,
    main_status_id: dbCandidate.main_status_id,
    sub_status_id: dbCandidate.sub_status_id,
    main_status: dbCandidate.main_status,
    sub_status: dbCandidate.sub_status,
    progress,
    currentStage: dbCandidate.main_status?.name || '',
    completedStages: [], // This would need to be calculated based on your application logic
    hasValidatedResume: false, // This would need to be set based on your application logic
  };
};

// Helper function to calculate progress from status
const calculateProgressFromStatus = (status: string, mainStatusName?: string): {
  screening: boolean;
  interview: boolean;
  offer: boolean;
  hired: boolean;
  joined: boolean;
} => {
  const defaultProgress = {
    screening: false,
    interview: false,
    offer: false,
    hired: false,
    joined: false
  };

  // Use main status name if available
  if (mainStatusName) {
    const stageOrder = ['Screening', 'Interview', 'Offer', 'Hired', 'Joined'];
    const stageIndex = stageOrder.indexOf(mainStatusName);
    
    if (stageIndex >= 0) {
      defaultProgress.screening = true;
      if (stageIndex >= 1) defaultProgress.interview = true;
      if (stageIndex >= 2) defaultProgress.offer = true;
      if (stageIndex >= 3) defaultProgress.hired = true;
      if (stageIndex >= 4) defaultProgress.joined = true;
    }
    
    return defaultProgress;
  }
  
  // Fall back to status string if main_status not available
  switch (status) {
    case 'New':
    case 'Screening':
      return { ...defaultProgress, screening: true };
    case 'InReview':
    case 'Interviewing':
      return { ...defaultProgress, screening: true, interview: true };
    case 'Selected':
      return { ...defaultProgress, screening: true, interview: true, offer: true, hired: true };
    case 'Offered':
      return { ...defaultProgress, screening: true, interview: true, offer: true };
    case 'Hired':
      return { ...defaultProgress, screening: true, interview: true, offer: true, hired: true };
    case 'Joined':
      return { ...defaultProgress, screening: true, interview: true, offer: true, hired: true, joined: true };
    default:
      return defaultProgress;
  }
};

// Create a dummy candidate for testing
export const createDummyCandidate = async (jobId: string): Promise<void> => {
  try {
    const { data: jobData, error: jobError } = await supabase
      .from('hr_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError) throw jobError;
    
    const newCandidate: DbCandidate = {
      job_id: jobId,
      name: `Test Candidate ${Math.floor(Math.random() * 1000)}`,
      status: 'New',
      applied_date: new Date().toISOString().split('T')[0],
      skills: jobData.skills || [],
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      phone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      resume_url: null,
      experience: '3 years',
      current_salary: 50000,
      expected_salary: 70000,
      location: 'Remote',
      applied_from: 'Test',
      match_score: Math.floor(Math.random() * 100),
      organization_id: jobData.organization_id
    };
    
    const { error } = await supabase
      .from('hr_job_candidates')
      .insert(newCandidate);
    
    if (error) throw error;
    
    toast.success('Test candidate created successfully');
  } catch (error) {
    console.error('Error creating dummy candidate:', error);
    toast.error('Failed to create test candidate');
  }
};
