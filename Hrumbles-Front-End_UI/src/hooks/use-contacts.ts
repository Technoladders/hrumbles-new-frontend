// src/hooks/use-contacts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { UnifiedContactListItem } from '@/types/contact'; 
import { Database } from '@/types/database.types'; 

// Define types for rows from Supabase for better type safety during mapping
type ContactFromDB = Database['public']['Tables']['contacts']['Row'] & { 
    company_data_from_join: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null 
};

type CandidateCompanyBaseFromDB = Database['public']['Tables']['candidate_companies']['Row'] & { 
    companies: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null;
};

type EmployeeAssociationBaseFromDB = Database['public']['Tables']['employee_associations']['Row'] & {
    companies: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null;
};

// Details from the analysis tables
type ResumeAnalysisData = Pick<Database['public']['Tables']['resume_analysis']['Row'], 
  'candidate_id' | 'job_id' | 'candidate_name' | 'email' | 'phone_number' | 'linkedin'
>;
type CandidateResumeAnalysisData = Pick<Database['public']['Tables']['candidate_resume_analysis']['Row'], 
  'candidate_id' | 'job_id' | 'candidate_name' | 'email' | 'phone_number' | 'linkedin'
>;


export const useContacts = () => {
  return useQuery<UnifiedContactListItem[], Error>({
    queryKey: ['combinedContactsListV4'], 
    queryFn: async (): Promise<UnifiedContactListItem[]> => {
      console.log("useContacts: Fetching all contacts, emp_assoc, cand_comp; enriching from analysis tables...");

      // --- 1. Fetch from 'contacts' table ---
      const { data: manualContactsData, error: manualContactsError } = await supabase
        .from('contacts')
        .select(`
          id, name, email, mobile, job_title, linkedin_url, contact_owner, contact_stage, created_at, updated_at, company_id,
          company_data_from_join:companies!fk_contacts_to_companies ( name ) 
        `) as { data: ContactFromDB[] | null; error: any };

      if (manualContactsError) {
        console.error('useContacts: Error fetching manual contacts:', manualContactsError);
        throw manualContactsError;
      }

      let processedItems: UnifiedContactListItem[] = (manualContactsData || []).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        job_title: c.job_title,
        linkedin_url: c.linkedin_url, 
        contact_owner: c.contact_owner,
        contact_stage: c.contact_stage,
        created_at: c.created_at,
        updated_at: c.updated_at,
        company_id: c.company_id,
        company_name: c.company_data_from_join?.name || null,
        source_table: 'contacts', 
        association_id: null,
        original_candidate_id: c.id, 
        candidate_job_id: null,
        candidate_years: null,
        association_start_date: null,
        association_end_date: null,
        association_is_current: null,
      }));

      // --- 2. Fetch base data from 'employee_associations' ---
      const { data: newAssociations, error: newAssocError } = await supabase
        .from('employee_associations')
        .select('id, candidate_id, company_id, job_id, designation, contact_owner, contact_stage, created_at, start_date, end_date, is_current, companies(name)') as { data: EmployeeAssociationBaseFromDB[] | null; error: any };

      if (newAssocError) { 
        console.error('useContacts: Error fetching employee_associations:', newAssocError); 
        throw newAssocError; 
      }
      
      // --- 3. Fetch base data from 'candidate_companies' ---
      const { data: legacyLinks, error: legacyError } = await supabase
        .from('candidate_companies')
        .select('candidate_id, job_id, company_id, designation, contact_owner, contact_stage, years, companies(name)') as { data: CandidateCompanyBaseFromDB[] | null; error: any };

      if (legacyError) { 
        console.error('useContacts: Error fetching legacy candidate_companies:', legacyError); 
        throw legacyError; 
      }

      // --- Consolidate (candidate_id, job_id) pairs for analysis lookups ---
      const analysisLookups: { candidate_id: string; job_id: string | null; original_source_item: any; source_type: 'employee_associations' | 'candidate_companies' }[] = [];
      
      (newAssociations || []).forEach(assoc => {
          if (assoc.candidate_id) {
               analysisLookups.push({ 
                   candidate_id: String(assoc.candidate_id), 
                   job_id: assoc.job_id ? String(assoc.job_id) : null,
                   original_source_item: assoc,
                   source_type: 'employee_associations'
                });
          }
      });
      (legacyLinks || []).forEach(link => {
          if (link.candidate_id) { 
              analysisLookups.push({ 
                  candidate_id: String(link.candidate_id), 
                  job_id: link.job_id ? String(link.job_id) : null,
                  original_source_item: link,
                  source_type: 'candidate_companies'
                });
          }
      });
      
      const uniqueLookupsInput = Array.from(new Set(analysisLookups.map(l => `${l.candidate_id}|${l.job_id}`)))
                                   .map(s => {
                                       const [candId, jobIdStr] = s.split('|');
                                       return { candidate_id: candId, job_id: jobIdStr === "null" || jobIdStr === "undefined" ? null : jobIdStr };
                                   });

      let candidateResumeAnalysisMap = new Map<string, CandidateResumeAnalysisData>();
      let resumeAnalysisMap = new Map<string, ResumeAnalysisData>();

      // --- Fetch candidate_resume_analysis in batches ---
      const craLookups = uniqueLookupsInput.filter(l => l.candidate_id && l.job_id && /^[0-9a-fA-F-]{36}$/.test(l.job_id)); 
      if (craLookups.length > 0) {
        const chunkSize = 10;
        const craDataAll: CandidateResumeAnalysisData[] = [];

        for (let i = 0; i < craLookups.length; i += chunkSize) {
          const chunk = craLookups.slice(i, i + chunkSize);
          const craFilterConditions = chunk.map(l => `and(candidate_id.eq.${l.candidate_id},job_id.eq.${l.job_id})`).join(',');
          console.log(`useContacts: Querying candidate_resume_analysis for chunk:`, craFilterConditions);

          const { data: craData, error: craError } = await supabase
            .from('candidate_resume_analysis')
            .select('candidate_id, job_id, candidate_name, email, phone_number, linkedin')
            .or(craFilterConditions);

          if (craError) {
            console.error('useContacts: Error fetching candidate_resume_analysis for chunk:', {
              message: craError.message,
              details: craError.details,
              hint: craError.hint,
              code: craError.code,
            });
            throw craError;
          }

          if (craData) {
            craDataAll.push(...craData);
          }
        }

        craDataAll.forEach(r => candidateResumeAnalysisMap.set(`${String(r.candidate_id)}|${String(r.job?.job_id)}`, r as CandidateResumeAnalysisData));
      }

      // --- Fetch resume_analysis ---
      const allCandidateIdsForRA = [...new Set(uniqueLookupsInput.filter(l => l.candidate_id).map(l => l.candidate_id))];
      if (allCandidateIdsForRA.length > 0) {
        const { data: raData, error: raError } = await supabase.from('resume_analysis')
          .select('candidate_id, job_id, candidate_name, email, phone_number, linkedin')
          .in('candidate_id', allCandidateIdsForRA);
        if (raError) console.error('useContacts: Error fetching resume_analysis:', raError);
        else (raData || []).forEach(r => {
          if (r.candidate_id && r.job_id) { 
            resumeAnalysisMap.set(`${String(r.candidate_id)}|${String(r.job_id)}`, r as ResumeAnalysisData);
          } else if (r.candidate_id) { 
            resumeAnalysisMap.set(`${String(r.candidate_id)}|NULL_JOB_RA`, r as ResumeAnalysisData);
          }
        });
      }

      // --- Process analysis lookups ---
      analysisLookups.forEach(lookup => {
        const item = lookup.original_source_item;
        const candIdStr = String(lookup.candidate_id); 
        const jobIdStr = lookup.job_id ? String(lookup.job_id) : null; 
        const mapKey = jobIdStr ? `${candIdStr}|${jobIdStr}` : null; 

        let name = null, email = null, mobile = null, linkedin = null;

        if (mapKey) {
          const craDetail = (jobIdStr && /^[0-9a-fA-F-]{36}$/.test(jobIdStr)) ? candidateResumeAnalysisMap.get(mapKey) : null;
          if (craDetail && craDetail.candidate_name && craDetail.candidate_name.trim() !== '' && craDetail.candidate_name !== 'Unknown') name = craDetail.candidate_name;
          if (craDetail?.email && craDetail.email.trim() !== '') email = craDetail.email;
          if (craDetail?.phone_number && craDetail.phone_number.trim() !== '') mobile = craDetail.phone_number;
          if (craDetail?.linkedin && craDetail.linkedin.trim() !== '') linkedin = craDetail.linkedin;

          const raDetail = resumeAnalysisMap.get(mapKey);
          if ((!name || name === 'Unknown') && raDetail?.candidate_name && raDetail.candidate_name.trim() !== '' && raDetail.candidate_name !== 'Unknown') name = raDetail.candidate_name;
          if ((!email || email.trim() === '') && raDetail?.email && raDetail.email.trim() !== '') email = raDetail.email;
          if ((!mobile || mobile.trim() === '') && raDetail?.phone_number && raDetail.phone_number.trim() !== '') mobile = raDetail.phone_number;
          if ((!linkedin || linkedin.trim() === '') && raDetail?.linkedin && raDetail.linkedin.trim() !== '') linkedin = raDetail.linkedin;
        }
        
        const baseNameFallback = lookup.source_type === 'employee_associations' 
          ? `Assoc: ${candIdStr.substring(0,8)}` 
          : `Legacy: ${candIdStr.substring(0,8)}`;
        name = (name && name.trim() !== '' && name !== 'Unknown') ? name : baseNameFallback;

        const commonUnifiedFields = {
          name: name,
          email: email,
          mobile: mobile,
          linkedin_url: linkedin,
          contact_owner: item.contact_owner,
          contact_stage: item.contact_stage,
          company_id: item.company_id,
          company_name: (item.companies as any)?.name || null,
          candidate_job_id: jobIdStr,
          job_title: item.designation || null, 
          created_at: lookup.source_type === 'employee_associations' ? item.created_at : null,
          updated_at: null, 
        };

        if (lookup.source_type === 'employee_associations') {
          processedItems.push({
            ...commonUnifiedFields,
            id: `assoc-${item.id}`,
            association_id: String(item.id),
            original_candidate_id: candIdStr,
            source_table: 'employee_associations',
            association_start_date: item.start_date,
            association_end_date: item.end_date,
            association_is_current: item.is_current,
          });
        } else if (lookup.source_type === 'candidate_companies') {
          processedItems.push({
            ...commonUnifiedFields,
            id: `candcomp-${item.candidate_id}-${item.job_id}-${item.company_id}`,
            original_candidate_id: candIdStr,
            source_table: 'candidate_companies',
            candidate_years: item.years || null,
            association_id: null,
            association_start_date: null,
            association_end_date: null,
            association_is_current: null,
          });
        }
      });
      
      const uniqueContactsMap = new Map<string, UnifiedContactListItem>();
      for (const item of processedItems) { 
        const key = (item.email && item.email.trim() !== '') ? item.email.toLowerCase() : item.id; 
        const existingItem = uniqueContactsMap.get(key);

        if (existingItem) {
          if (item.source_table === 'contacts' && existingItem.source_table !== 'contacts') {
            uniqueContactsMap.set(key, item); 
          } else if (item.source_table === 'employee_associations' && existingItem.source_table === 'candidate_companies') {
            uniqueContactsMap.set(key, item); 
          }
        } else {
          uniqueContactsMap.set(key, item);
        }
      }
      const finalData = Array.from(uniqueContactsMap.values());

      finalData.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : null;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : null;

        if (aDate && bDate) return bDate - aDate; 
        if (aDate && !bDate) return -1; 
        if (!aDate && bDate) return 1;  
        
        const nameA = a.name?.toLowerCase() || '\uffff'; 
        const nameB = b.name?.toLowerCase() || '\uffff';
        return nameA.localeCompare(nameB);
      });
      
      console.log(`useContacts: Final list count after deduplication: ${finalData.length}`);
      return finalData;
    },
  });
};

export const useContactDetails = (contactId: string | undefined) => {
  return useQuery<UnifiedContactListItem | null, Error>({ 
    queryKey: ['contact', contactId], 
    queryFn: async (): Promise<UnifiedContactListItem | null> => {
      if (!contactId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`*, company_data_from_join:companies!fk_contacts_to_companies (name)`) 
        .eq('id', contactId)
        .maybeSingle() as { data: (ContactFromDB & {company_data_from_join: {name: string} | null}) | null; error: any };


      if (error) throw error;

      if (data) {
        const contactData: UnifiedContactListItem = {
          id: data.id,
          name: data.name,
          email: data.email,
          mobile: data.mobile || null,
          job_title: data.job_title || null,
          linkedin_url: data.linkedin_url || null,
          contact_owner: data.contact_owner || null,
          contact_stage: data.contact_stage || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          created_by: data.created_by || null,
          updated_by: data.updated_by || null,
          company_id: data.company_id || null,
          company_name: data.company_data_from_join?.name || null,
          source_table: 'contacts',
          association_id: null,
          original_candidate_id: data.id, 
          candidate_job_id: null,
          candidate_years: null,
          association_start_date: null,
          association_end_date: null,
          association_is_current: null,
        };
        return contactData;
      }
      return null;
    },
    enabled: !!contactId, 
  });
};