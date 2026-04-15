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
  invite_source: InviteSource;
  candidate_id: string | null;
  candidate_owner_id: string | null;
  expires_at: string;
  sent_at: string;
  opened_at: string | null;
  created_at: string;
  hr_employees?: { first_name: string; last_name: string } | null;
  candidate_invite_responses?: CandidateInviteResponse | null;
}

// ── Invite source — extended with candidate_search ───────────────────────────
// candidate_search: invite sent directly from the global candidate search page
//   after revealing contact info. Stored in candidate_invites.invite_source.
export type InviteSource =
  | 'pipeline'
  | 'zivex'
  | 'talentpool'
  | 'candidate_search';  // ← NEW

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
  candidateId?: string;
  candidateOwnerId?: string;
  inviteSource?: InviteSource;  // ← now uses the union type properly
  // WhatsApp
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappBodyVars?: string[];   // Variable values for {{N}} in template
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
  candidateOwnerId?: string,
  pipelineStage: string = 'Screening',
  organizationId?: string
): Promise<void> => {
  const { createCandidate } = await import('./candidateService');

  // ── Background: upsert hr_talent_pool so the profile stays current ──────
  // Non-fatal — never blocks the main add-to-job flow.
  if (organizationId && response.email) {
    supabase
      .from('hr_talent_pool')
      .upsert({
        candidate_name:       response.candidate_name,
        email:                response.email,
        organization_id:      organizationId,
        phone:                response.phone                || undefined,
        current_location:     response.current_location     || undefined,
        current_company:      response.current_company      || undefined,
        current_designation:  response.current_designation  || undefined,
        total_experience:     response.total_experience      || undefined,
        parsed_experience_years: response.parsed_experience_years ?? undefined,
        notice_period:        response.notice_period         || undefined,
        linkedin_url:         response.linkedin_url          || undefined,
        resume_path:          response.resume_url            || undefined,
        current_salary:       response.current_salary        || undefined,
        expected_salary:      response.expected_salary       || undefined,
        parsed_current_ctc:   response.parsed_current_ctc    ?? undefined,
        parsed_expected_ctc:  response.parsed_expected_ctc   ?? undefined,
        top_skills:           response.top_skills?.length
                                ? response.top_skills.map(s => typeof s === 'string' ? s : s.name)
                                : undefined,
        source_platform: 'invite',
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'email,organization_id', ignoreDuplicates: false })
      .then(({ error }) => {
        if (error) console.warn('[inviteService] talent pool sync non-fatal:', error.message);
      });
  }

  const candidateData = {
    id:          '',
    name:        response.candidate_name,
    email:       response.email,
    phone:       response.phone,
    experience:  response.total_experience || '',
    matchScore:  0,
    appliedDate: new Date().toISOString().split('T')[0],
    skills:      (response.top_skills || []).map((s) => s.name || s),
    currentSalary:  response.current_salary  ? parseFloat(response.current_salary)  : undefined,
    expectedSalary: response.expected_salary ? parseFloat(response.expected_salary) : undefined,
    location:    response.current_location,
    appliedFrom: 'Invite',
    resumeUrl:   response.resume_url,
    status:      pipelineStage as 'Screening',
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
  candidateId: string,
  response: CandidateInviteResponse,
  candidateOwnerId?: string,
  organizationId?: string
): Promise<void> => {
  // ── Background: silently update hr_talent_pool ────────────────────────────
  // Runs fire-and-forget. Never surfaces errors to the recruiter.
  // Does NOT affect hr_job_candidates — that's handled below.
  if (organizationId && response.email) {
    const talentUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
      source_platform: 'invite',
    };
    if (response.candidate_name)       talentUpdate.candidate_name       = response.candidate_name;
    if (response.email)                talentUpdate.email                = response.email;
    if (response.phone)                talentUpdate.phone                = response.phone;
    if (response.current_location)     talentUpdate.current_location     = response.current_location;
    if (response.current_company)      talentUpdate.current_company      = response.current_company;
    if (response.current_designation)  talentUpdate.current_designation  = response.current_designation;
    if (response.total_experience)     talentUpdate.total_experience     = response.total_experience;
    if (response.parsed_experience_years != null) talentUpdate.parsed_experience_years = response.parsed_experience_years;
    if (response.notice_period)        talentUpdate.notice_period        = response.notice_period;
    if (response.linkedin_url)         talentUpdate.linkedin_url         = response.linkedin_url;
    if (response.resume_url)           talentUpdate.resume_path          = response.resume_url;
    if (response.current_salary)       talentUpdate.current_salary       = response.current_salary;
    if (response.expected_salary)      talentUpdate.expected_salary      = response.expected_salary;
    if (response.parsed_current_ctc  != null) talentUpdate.parsed_current_ctc  = response.parsed_current_ctc;
    if (response.parsed_expected_ctc != null) talentUpdate.parsed_expected_ctc = response.parsed_expected_ctc;
    if (response.top_skills?.length) {
      talentUpdate.top_skills = response.top_skills.map(s => typeof s === 'string' ? s : s.name);
    }

    supabase
      .from('hr_talent_pool')
      .upsert({ ...talentUpdate, organization_id: organizationId },
        { onConflict: 'email,organization_id', ignoreDuplicates: false })
      .then(({ error }) => {
        if (error) console.warn('[inviteService] pipeline talent pool sync non-fatal:', error.message);
        else console.log('[inviteService] talent pool silently updated for', response.email);
      });
  }

  // ── hr_job_candidates update (existing flow — unchanged) ──────────────────
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (candidateOwnerId) updatePayload.updated_by = candidateOwnerId;
  if (response.candidate_name)  updatePayload.name         = response.candidate_name;
  if (response.email)           updatePayload.email        = response.email;
  if (response.phone)           updatePayload.phone        = response.phone;
  if (response.total_experience)    updatePayload.experience      = response.total_experience;
  if (response.notice_period)       updatePayload.notice_period   = response.notice_period;
  if (response.current_location)    updatePayload.location        = response.current_location;
  if (response.parsed_current_ctc)  updatePayload.current_salary  = response.parsed_current_ctc;
  if (response.parsed_expected_ctc) updatePayload.expected_salary = response.parsed_expected_ctc;
  if (response.resume_url)          updatePayload.resume_url      = response.resume_url;

  const { data: existing, error: fetchErr } = await supabase
    .from('hr_job_candidates')
    .select('metadata')
    .eq('id', candidateId)
    .single();

  if (fetchErr) throw fetchErr;

  const submittedData = response.metadata?.submittedData || {};

  updatePayload.metadata = {
    ...(existing?.metadata || {}),
    ...(submittedData.currentLocation   ? { currentLocation:     submittedData.currentLocation   } : {}),
    ...(submittedData.noticePeriod      ? { noticePeriod:        submittedData.noticePeriod      } : {}),
    ...(submittedData.linkedInId        ? { linkedInId:          submittedData.linkedInId         } : {}),
    ...(response.linkedin_url           ? { linkedInId:          response.linkedin_url            } : {}),
    ...(response.current_company        ? { currentCompany:      response.current_company         } : {}),
    ...(response.current_designation    ? { currentDesignation:  response.current_designation     } : {}),
    ...(response.resume_url             ? { resume_url:          response.resume_url              } : {}),
    ...(response.parsed_current_ctc     ? { currentSalary:       response.parsed_current_ctc      } : {}),
    ...(response.parsed_expected_ctc    ? { expectedSalary:      response.parsed_expected_ctc     } : {}),
    profileUpdatedAt:          new Date().toISOString(),
    profileUpdatedViaInvite:   true,
  };

  const { error: updateErr } = await supabase
    .from('hr_job_candidates')
    .update(updatePayload)
    .eq('id', candidateId);
  if (updateErr) throw updateErr;

  const { error: responseErr } = await supabase
    .from('candidate_invite_responses')
    .update({ status: 'auto_updated' })
    .eq('id', responseId);
  if (responseErr) throw responseErr;
};
// all templates accept
