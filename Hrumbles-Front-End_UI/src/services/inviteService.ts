// src/services/inviteService.ts
import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CandidateInvite {
  id: string;
  organization_id: string;
  job_id: string;
  created_by: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  invite_token: string;
  channel: 'email' | 'whatsapp' | 'both';
  status: 'sent' | 'opened' | 'applied' | 'expired' | 'declined';
  invite_source: 'pipeline' | 'zivex' | 'talentpool';
  candidate_id: string | null;
  candidate_owner_id: string | null;
  expires_at: string;
  sent_at: string;
  opened_at: string | null;
  created_at: string;
  hr_employees?: { first_name: string; last_name: string } | null;
  candidate_invite_responses?: CandidateInviteResponse | null;
}

export interface CandidateInviteResponse {
  id: string;
  invite_id: string;
  talent_pool_id: string | null;
  candidate_name: string;
  email: string;
  phone: string | null;
  current_location: string | null;
  total_experience: string | null;
  parsed_experience_years: number | null;
  current_company: string | null;
  current_designation: string | null;
  current_salary: string | null;
  expected_salary: string | null;
  parsed_current_ctc: number | null;
  parsed_expected_ctc: number | null;
  notice_period: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  top_skills: Array<{ name: string }>;
  metadata: Record<string, any>;
  status: 'submitted' | 'added_to_job' | 'rejected' | 'auto_updated';
  recruiter_notes: string | null;
  submitted_at: string;
  created_at: string;
}

export interface InviteFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  totalExperience?: number;
  totalExperienceMonths?: number;
  currentCompany?: string;
  currentDesignation?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  linkedInId?: string;
  resume?: string;
  skills?: string[];
  preferredLocations?: string[];
}

export interface InviteStats {
  total: number;
  sent: number;
  opened: number;
  applied: number;
  expired: number;
}

export interface SendInviteParams {
  jobId: string;
  jobTitle: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  channel: 'email' | 'whatsapp' | 'both';
  expiryDays?: number;
  customMessage?: string;
  // Pipeline-invite specific
  candidateId?: string;       // hr_job_candidates.id — present only for pipeline invites
  candidateOwnerId?: string;  // created_by of the candidate row
  inviteSource?: 'pipeline' | 'zivex' | 'talentpool';
}

// ── Send invite ───────────────────────────────────────────────────────────────

export const sendCandidateInvite = async (
  params: SendInviteParams
): Promise<{ success: boolean; token: string; link: string }> => {
  const authData = getAuthDataFromLocalStorage();
  if (!authData) throw new Error('Not authenticated');

  const { organization_id, userId } = authData;
  const appOrigin = window.location.origin;

  const { data, error } = await supabase.functions.invoke('send-candidate-invite', {
    body: {
      ...params,
      organizationId:    organization_id,
      createdBy:         userId,
      appOrigin,
      // Pipeline extras
      candidateId:       params.candidateId       || null,
      candidateOwnerId:  params.candidateOwnerId  || null,
      inviteSource:      params.inviteSource       || 'zivex',
    },
  });

  if (error) throw new Error(error.message || 'Failed to send invite');
  return data;
};

// ── Validate token (public page, no auth) ─────────────────────────────────────

export const validateInviteToken = async (token: string) => {
  const { data, error } = await supabase
    .from('candidate_invites')
    .select(`
      id, status, expires_at,
      candidate_name, candidate_email, candidate_phone,
      job_id, organization_id, created_by,
      invite_source, candidate_id,
      hr_jobs!candidate_invites_job_id_fkey (
        id, title, location, experience, skills, description,
        job_type, job_type_category, hiringMode
      )
    `)
    .eq('invite_token', token)
    .single();

  if (error) return null;
  return data;
};

// ── Mark invite opened (fire-and-forget) ──────────────────────────────────────

export const markInviteOpened = (token: string): void => {
  supabase.functions
    .invoke('mark-invite-opened', { body: { token } })
    .catch((err) => console.warn('markInviteOpened non-fatal:', err));
};

// ── Submit candidate application (public page) ────────────────────────────────

export const submitCandidateApplication = async (
  inviteToken: string,
  formData: InviteFormData
): Promise<{ success: boolean }> => {
  const { data, error } = await supabase.functions.invoke('process-candidate-invite', {
    body: { inviteToken, formData },
  });
  if (error) throw new Error(error.message || 'Submission failed');
  if (data?.error) throw new Error(data.error);
  return data;
};

// ── Get all invites for a job ─────────────────────────────────────────────────

export const getInvitesForJob = async (jobId: string): Promise<CandidateInvite[]> => {
  const { data, error } = await supabase
    .from('candidate_invites')
    .select(`
      *,
      hr_employees!candidate_invites_created_by_fkey (first_name, last_name),
      candidate_invite_responses (
        id, status, candidate_name, email, phone,
        current_location, total_experience, parsed_experience_years,
        current_company, current_designation,
        current_salary, expected_salary, parsed_current_ctc, parsed_expected_ctc,
        notice_period, linkedin_url, resume_url, top_skills,
        metadata, recruiter_notes, submitted_at, created_at
      )
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CandidateInvite[];
};

// ── Get invite stats ──────────────────────────────────────────────────────────

export const getInviteStatsForJob = async (jobId: string): Promise<InviteStats> => {
  const { data, error } = await supabase.rpc('get_invite_stats_for_job', { p_job_id: jobId });
  if (error) throw error;
  return (data as InviteStats) || { total: 0, sent: 0, opened: 0, applied: 0, expired: 0 };
};

// ── Add Zive-X response to job pipeline ───────────────────────────────────────

export const addInviteResponseToJob = async (
  responseId: string,
  inviteId: string,
  jobId: string,
  response: CandidateInviteResponse,
  candidateOwnerId?: string
): Promise<void> => {
  const { createCandidate } = await import('./candidateService');

  const candidateData = {
    id:          '',
    name:        response.candidate_name,
    email:       response.email,
    phone:       response.phone,
    experience:  response.total_experience || '',
    matchScore:  0,
    appliedDate: new Date().toISOString().split('T')[0],
    skills:      (response.top_skills || []).map((s) => s.name || s),
    currentSalary:  response.current_salary ? parseFloat(response.current_salary) : undefined,
    expectedSalary: response.expected_salary ? parseFloat(response.expected_salary) : undefined,
    location:    response.current_location,
    appliedFrom: 'Invite',
    resumeUrl:   response.resume_url,
    status:      'Screening' as const,
    // Preserve candidate owner
    createdBy:   candidateOwnerId || undefined,
    metadata: {
      currentLocation:  response.current_location,
      noticePeriod:     response.notice_period,
      totalExperience:  response.parsed_experience_years,
      currentSalary:    response.parsed_current_ctc,
      expectedSalary:   response.parsed_expected_ctc,
      linkedInId:       response.linkedin_url,
      resume_url:       response.resume_url,
      ...(response.metadata || {}),
    },
    progress: { screening: true, interview: false, offer: false, hired: false, joined: false },
  };

  await createCandidate(jobId, candidateData);

  const { error } = await supabase
    .from('candidate_invite_responses')
    .update({ status: 'added_to_job' })
    .eq('id', responseId);

  if (error) throw error;
};

// ── Reject invite response ────────────────────────────────────────────────────

export const rejectInviteResponse = async (
  responseId: string,
  notes?: string
): Promise<void> => {
  const { error } = await supabase
    .from('candidate_invite_responses')
    .update({ status: 'rejected', recruiter_notes: notes || null })
    .eq('id', responseId);
  if (error) throw error;
};

export const applyProfileUpdate = async (
  responseId: string,
  candidateId: string,           // hr_job_candidates.id
  response: CandidateInviteResponse,
  candidateOwnerId?: string      // preserve original owner
): Promise<void> => {
  // Build the update payload — only overwrite fields the candidate actually filled
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
 
  if (candidateOwnerId) {
    updatePayload.updated_by = candidateOwnerId;
  }
 
  // Name + contact
  if (response.candidate_name)  updatePayload.name         = response.candidate_name;
  if (response.email)           updatePayload.email        = response.email;
  if (response.phone)           updatePayload.phone        = response.phone;
 
  // Professional
  if (response.total_experience)     updatePayload.experience      = response.total_experience;
  if (response.notice_period)        updatePayload.notice_period   = response.notice_period;
  if (response.current_location)     updatePayload.location        = response.current_location;
  if (response.parsed_current_ctc)   updatePayload.current_salary  = response.parsed_current_ctc;
  if (response.parsed_expected_ctc)  updatePayload.expected_salary = response.parsed_expected_ctc;
  if (response.resume_url)           updatePayload.resume_url      = response.resume_url;
 
  // Merge metadata — patch only fields candidate provided
  // Read existing metadata first, then spread new values on top
  const { supabase } = await import('@/integrations/supabase/client');
 
  const { data: existing, error: fetchErr } = await supabase
    .from('hr_job_candidates')
    .select('metadata')
    .eq('id', candidateId)
    .single();
 
  if (fetchErr) throw fetchErr;
 
  const submittedData = response.metadata?.submittedData || {};
 
  updatePayload.metadata = {
    ...(existing?.metadata || {}),
    // Patch individual metadata fields
    ...(submittedData.currentLocation  ? { currentLocation:  submittedData.currentLocation  } : {}),
    ...(submittedData.noticePeriod     ? { noticePeriod:     submittedData.noticePeriod     } : {}),
    ...(submittedData.linkedInId       ? { linkedInId:       submittedData.linkedInId        } : {}),
    ...(response.linkedin_url          ? { linkedInId:       response.linkedin_url           } : {}),
    ...(response.current_company       ? { currentCompany:   response.current_company        } : {}),
    ...(response.current_designation   ? { currentDesignation: response.current_designation  } : {}),
    ...(response.resume_url            ? { resume_url:       response.resume_url             } : {}),
    ...(response.parsed_current_ctc    ? { currentSalary:    response.parsed_current_ctc     } : {}),
    ...(response.parsed_expected_ctc   ? { expectedSalary:   response.parsed_expected_ctc    } : {}),
    profileUpdatedAt: new Date().toISOString(),
    profileUpdatedViaInvite: true,
  };
 
  // Apply to hr_job_candidates
  const { error: updateErr } = await supabase
    .from('hr_job_candidates')
    .update(updatePayload)
    .eq('id', candidateId);
 
  if (updateErr) throw updateErr;
 
  // Mark response as applied
  const { error: responseErr } = await supabase
    .from('candidate_invite_responses')
    .update({ status: 'auto_updated' })
    .eq('id', responseId);
 
  if (responseErr) throw responseErr;
};