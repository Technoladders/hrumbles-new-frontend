// src/hooks/use-companies.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import {
  Company,
  CompanyDetail as CompanyDetailTypeFromTypes,
  CandidateDetail, 
  KeyPerson
} from '@/types/company';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Database } from '@/types/database.types'; 
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { v4 as uuidv4 } from 'uuid';

// --- Gemini Config & Helper Functions ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL_NAME = "gemini-1.5-pro";

function parseFinancialValue(value: any): number | null { /* ... (your existing function) ... */ 
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return !isNaN(value) ? value : null;
  if (typeof value === 'string') {
    try {
      let numStr = value.replace(/[$,€£¥₹,\s]/g, '');
      let multiplier = 1;
      const upperStr = numStr.toUpperCase();
      if (upperStr.includes('BILLION') || upperStr.endsWith('B')) {
        multiplier = 1_000_000_000;
        numStr = numStr.replace(/BILLION|B/gi, '');
      } else if (upperStr.includes('CRORE')) {
        multiplier = 10_000_000;
        numStr = numStr.replace(/CRORE/gi, '');
      } else if (upperStr.endsWith('M')) {
        multiplier = 1_000_000;
        numStr = numStr.slice(0, -1);
      } else if (upperStr.endsWith('K')) {
        multiplier = 1_000;
        numStr = numStr.slice(0, -1);
      }
      if (numStr === '' || numStr.toUpperCase() === 'N/A') return null;
      const number = parseFloat(numStr);
      return !isNaN(number) ? number * multiplier : null;
    } catch (e) {
      // console.warn("Could not parse financial value string:", value, e); // Reduced logging
      return null;
    }
  }
  return null;
}
function fixMalformedJson(text: string): string { /* ... (your existing function) ... */ 
  let fixedText = text;
  fixedText = fixedText.replace(/^\uFEFF/, '');
  fixedText = fixedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fixedText = fixedText.trim();
  const firstBrace = fixedText.indexOf('{');
  const lastBrace = fixedText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return '{}';
  }
  fixedText = fixedText.substring(firstBrace, lastBrace + 1);
  try { fixedText = fixedText.replace(/,\s*([\}\]])/g, '$1'); }
  catch(e) { /* console.warn("Regex for trailing comma removal failed:", e); */ } // Reduced logging
  fixedText = fixedText.replace(/,\s*$/, '');
  if (fixedText.includes('"key_people"')) {
      fixedText = fixedText.replace(/"key_people"\s*:\s*\[\s*,/g, '"key_people": [');
      fixedText = fixedText.replace(/"key_people"\s*:\s*\[([^\]]*)\]/g, (match, p1) => {
          const items = p1.split('},{').map((item: string, index: number, arr: string[]) => {
              let MfixedItem = item.trim();
              if (!MfixedItem.startsWith('{') && index > 0) MfixedItem = '{' + MfixedItem;
              if (!MfixedItem.endsWith('}') && index < arr.length -1) MfixedItem = MfixedItem + '}';
              return MfixedItem;
          }).join('},{');
          return `"key_people": [${items}]`;
      });
      fixedText = fixedText.replace(/"name":\s*"([^"]*)",\s*"([^"]*)"\s*(?=\})/g, '"name": "$1", "title": "$2"');
  }
  return fixedText;
}
function fallbackParseJson(text: string, companyName: string): any { /* ... (your existing function) ... */ 
  const result: any = { name: companyName };
  const fieldsToParse = [
    { key: 'website', regex: /"website"\s*:\s*"([^"]*)"/i }, { key: 'domain', regex: /"domain"\s*:\s*"([^"]*)"/i },
    { key: 'about', regex: /"about"\s*:\s*"([^"]*)"/i }, { key: 'start_date', regex: /"(?:start_date|founded_date)"\s*:\s*"([^"]*)"/i },
    { key: 'founded_as', regex: /"founded_as"\s*:\s*"([^"]*)"/i },
    { key: 'employee_count', regex: /"employee_count"\s*:\s*(\d+|"[^"]*")/i, isNumeric: true },
    { key: 'employee_count_date', regex: /"employee_count_date"\s*:\s*"([^"]*)"/i },
    { key: 'address', regex: /"address"\s*:\s*"([^"]*)"/i }, { key: 'location', regex: /"location"\s*:\s*"([^"]*)"/i },
    { key: 'industry', regex: /"industry"\s*:\s*"([^"]*)"/i }, { key: 'stage', regex: /"stage"\s*:\s*"([^"]*)"/i },
    { key: 'linkedin', regex: /"linkedin"\s*:\s*"([^"]*)"/i },
    { key: 'revenue', regex: /"revenue"\s*:\s*("[^"]*"|\d+\.?\d*)/i, isNumeric: true },
    { key: 'cashflow', regex: /"cashflow"\s*:\s*("[^"]*"|\d+\.?\d*)/i, isNumeric: true },
    { key: 'logo_url', regex: /"logo_url"\s*:\s*"([^"]*)"/i },
    { key: 'competitors', regex: /"competitors"\s*:\s*(\[.*?\]|"[^"]*")/i, isArray: true },
    { key: 'products', regex: /"products"\s*:\s*(\[.*?\]|"[^"]*")/i, isArray: true },
    { key: 'services', regex: /"services"\s*:\s*(\[.*?\]|"[^"]*")/i, isArray: true },
  ];
  fieldsToParse.forEach(fieldInfo => {
    const match = text.match(fieldInfo.regex); let value = null;
    if (match && match[1]) { value = match[1].trim(); if (value.toLowerCase() === 'null' || value.toLowerCase() === 'n/a' || value === "-") value = null; else if (fieldInfo.isNumeric) value = parseFinancialValue(value); else if (fieldInfo.isArray) { try { const arr = JSON.parse(value.startsWith('[') ? value : `[${value.split(',').map(s => `"${s.trim().replace(/"/g, '\\"')}"`).join(',')}]`); value = Array.isArray(arr) ? arr.map((item: any) => String(item).trim()).filter(Boolean) : null; } catch { value = value.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean); } } else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1); }
    result[fieldInfo.key] = value;
  });
  const kpMatch = text.match(/"key_people"\s*:\s*(\[[\s\S]*?\]|"-")/i);
  if (kpMatch && kpMatch[1]) { if (kpMatch[1] === '"-"' || kpMatch[1].toLowerCase() === '"n/a"') result.key_people = null; else { try { const kpArray = JSON.parse(kpMatch[1]); if (Array.isArray(kpArray) && kpArray.every(p => typeof p === 'object' && p !== null && 'name' in p && 'title' in p)) result.key_people = kpArray.map(p => ({ name: String(p.name).trim(), title: String(p.title).trim() })); else result.key_people = null; } catch (e) { result.key_people = null; } } } else result.key_people = null;
  return result;
}
function extractJsonWithFallback(text: string, companyName: string): any | null { /* ... (your existing function) ... */ 
    if (!text || typeof text !== 'string') { return null; }
    let cleanedText = fixMalformedJson(text);
    try {
        const parsed = JSON.parse(cleanedText);
        if (typeof parsed === 'object' && parsed !== null) {
            if (!parsed.name || typeof parsed.name !== 'string') { return fallbackParseJson(text, companyName); }
            if (parsed.key_people !== "-" && parsed.key_people !== null && (!Array.isArray(parsed.key_people) || !parsed.key_people.every((kp: any) => typeof kp === 'object' && kp !== null && 'name' in kp && typeof kp.name === 'string' && 'title' in kp && typeof kp.title === 'string'))) {
                const fallbackResult = fallbackParseJson(text, companyName);
                parsed.key_people = fallbackResult.key_people || null;
            }
            return parsed;
        }
        return fallbackParseJson(text, companyName);
    } catch (e) {
        return fallbackParseJson(text, companyName);
    }
}
async function validateUrl(url: string | null): Promise<string | null> { /* ... (your existing function) ... */ 
  if (!url || typeof url !== 'string' || url.trim() === '' || url.trim().toLowerCase() === 'n/a') return null;
  let cleanedUrl = url.trim();
  if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) { cleanedUrl = `https://${cleanedUrl}`; }
  cleanedUrl = cleanedUrl.replace(/[,/]+$/, '');
  try { new URL(cleanedUrl); return cleanedUrl;
  } catch (error) { console.warn(`URL syntax invalid for ${cleanedUrl}:`, error); return null; }
}

// --- Hook to fetch the list of companies ---
export const useCompanies = (fileId?: string) => { /* ... (your existing hook) ... */ 
   const authData = getAuthDataFromLocalStorage();
          if (!authData) {
            throw new Error('Failed to retrieve authentication data');
          }
          const { organization_id, userId } = authData;
  return useQuery<Company[], Error>({
    queryKey: ['companies', organization_id, fileId || 'all'],
    queryFn: async (): Promise<Company[]> => {
      if (!organization_id) {
        console.log("[useCompanies] No organizationId, returning empty array.");
        return [];
      }

      let query = supabase
        .from('companies')
        .select('id, name, logo_url, employee_count, industry, stage, location, created_by, updated_by, account_owner, website, linkedin, created_at, revenue, cashflow, founded_as, employee_count_date, competitors, products, services, key_people, about, domain, status, created_by_employee:hr_employees!companies_created_by_fkey(id, first_name, last_name), updated_by_employee:hr_employees!companies_updated_by_fkey(id, first_name, last_name)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .eq('organization_id', organization_id);
        
      if (fileId) {
        console.log(`[useCompanies] Fetching companies for fileId: ${fileId}`);
        query = query.eq('file_id', fileId);
      } else {
        console.log("[useCompanies] Fetching all companies for the organization.");
      }
        
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) { 
        console.error('Error fetching companies:', error); 
        throw error; 
      }
      
      console.log(`[useCompanies] Fetched ${data?.length || 0} companies.`);
      return data || [];
    },
    enabled: !!organization_id, // Only run if organizationId is available
  });
}

// --- Hook to fetch details for a single company by ID (ONLY from Supabase) ---
export const useCompanyDetails = (id: number | string | undefined) => { /* ... (your existing hook) ... */ 
  const companyIdNum = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery<CompanyDetailTypeFromTypes | null, Error>({
    queryKey: ['company', companyIdNum],
    queryFn: async (): Promise<CompanyDetailTypeFromTypes | null> => {
      if (!companyIdNum || isNaN(companyIdNum) || companyIdNum <= 0) {
          return null;
      }
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyIdNum).maybeSingle();
      if (error) { console.error(`useCompanyDetails: Error fetching company ID ${companyIdNum} from DB:`, error); throw error; }
      return (data as CompanyDetailTypeFromTypes) || null;
    },
    enabled: !!companyIdNum && !isNaN(companyIdNum) && companyIdNum > 0,
  });
}

// Define a type for the data we expect from resume_analysis
type ResumeAnalysisData = Pick<Database['public']['Tables']['resume_analysis']['Row'], 
  'candidate_id' | 'job_id' | 'candidate_name' | 'email' | 'phone_number' | 'linkedin'
>;
// Define a type for the data we expect from candidate_resume_analysis
type CandidateResumeAnalysisData = Pick<Database['public']['Tables']['candidate_resume_analysis']['Row'], 
  'candidate_id' | 'job_id' | 'candidate_name' | 'email' | 'phone_number' | 'linkedin'
>;


// --- Hook to fetch associated employees for a specific company ---
export const useCompanyEmployees = (companyId: number | string | undefined) => {
  const companyIdNum = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;

  return useQuery<CandidateDetail[], Error>({
    queryKey: ['company-employees-v2', companyIdNum], 
    queryFn: async (): Promise<CandidateDetail[]> => {
      if (!companyIdNum || isNaN(companyIdNum) || companyIdNum <= 0) {
          console.warn(`useCompanyEmployees: Invalid company ID: ${companyIdNum}`);
          return [];
      }
      console.log(`useCompanyEmployees: Fetching employees for company ID: ${companyIdNum}`);

      try {
        // 1. Fetch from 'contacts' associated with this company
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('id, name, email, job_title, company_id, linkedin_url, mobile, contact_owner, contact_stage')
          .eq('company_id', companyIdNum);

        if (contactsError) {
          console.error(`useCompanyEmployees: Error fetching contacts for company ${companyIdNum}:`, contactsError);
          throw contactsError;
        }

        const employeesFromContacts: CandidateDetail[] = (contactsData || []).map(contact => ({
          id: contact.id, 
          candidate_id: contact.id,
          name: contact.name || 'N/A',
          email: contact.email || 'N/A',
          phone_number: contact.mobile || null,
          linkedin: contact.linkedin_url || null,
          designation: contact.job_title || 'N/A',
          contact_owner: contact.contact_owner || null,
          contact_stage: contact.contact_stage || null,
          source_table: 'contacts',
          company_id: contact.company_id,
          job_id: null, 
          association_id: null,
        }));

        // 2. Fetch base data from 'candidate_companies'
        const { data: legacyLinks, error: legacyError } = await supabase
          .from('candidate_companies')
          .select('candidate_id, job_id, company_id, designation, contact_owner, contact_stage, years')
          .eq('company_id', companyIdNum);

        if (legacyError) { 
          console.error(`useCompanyEmployees: Error fetching legacy candidate_companies for company ${companyIdNum}:`, legacyError); 
          throw legacyError; 
        }

        // 3. Fetch base data from 'employee_associations'
        const { data: newAssociations, error: newAssocError } = await supabase
          .from('employee_associations')
          .select('id, candidate_id, company_id, job_id, designation, contact_owner, contact_stage, start_date, end_date, is_current, created_by')
          .eq('company_id', companyIdNum);

        if (newAssocError) { 
          console.error(`useCompanyEmployees: Error fetching new employee_associations for company ${companyIdNum}:`, newAssocError); 
          throw newAssocError; 
        }

        // --- Consolidate (candidate_id, job_id) pairs for lookups ---
        const lookups: { candidate_id: string; job_id: string | null }[] = [];
        (legacyLinks || []).forEach(link => {
            if (link.candidate_id) { // job_id can be null here if we want to try matching only by candidate_id later
                lookups.push({ candidate_id: String(link.candidate_id), job_id: link.job_id ? String(link.job_id) : null });
            }
        });
        (newAssociations || []).forEach(assoc => {
            if (assoc.candidate_id) {
                 lookups.push({ candidate_id: String(assoc.candidate_id), job_id: assoc.job_id ? String(assoc.job_id) : null });
            }
        });
        
        const uniqueLookups = Array.from(new Set(lookups.map(l => JSON.stringify(l)))).map(s => JSON.parse(s));

        // --- Fetch from candidate_resume_analysis ---
        let candidateResumeAnalysisMap = new Map<string, CandidateResumeAnalysisData>();
        if (uniqueLookups.length > 0) {
            const craLookups = uniqueLookups.filter(l => l.job_id && /^[0-9a-fA-F-]{36}$/.test(l.job_id)); // Only if job_id is a valid UUID for this table
            if (craLookups.length > 0) {
                const craFilterConditions = craLookups
                    .map(lookup => `and(candidate_id.eq.${lookup.candidate_id},job_id.eq.${lookup.job_id})`)
                    .join(',');
                console.log(`useCompanyEmployees: Fetching candidate_resume_analysis details for pairs:`, craLookups);
                const { data: craData, error: craError } = await supabase
                    .from('candidate_resume_analysis')
                    .select('candidate_id, job_id, candidate_name, email, phone_number, linkedin')
                    .or(craFilterConditions);
                if (craError) {
                    console.error('useCompanyEmployees: Error fetching candidate_resume_analysis details:', craError);
                } else {
                    (craData || []).forEach(cra => {
                        if (cra.candidate_id && cra.job_id) {
                            candidateResumeAnalysisMap.set(`${String(cra.candidate_id)}|${String(cra.job_id)}`, cra as CandidateResumeAnalysisData);
                        }
                    });
                    console.log(`useCompanyEmployees: Successfully fetched ${candidateResumeAnalysisMap.size} candidate_resume_analysis details.`);
                }
            }
        }

        // --- Fetch from resume_analysis ---
        let resumeAnalysisDetailsMap = new Map<string, ResumeAnalysisData>();
        if (uniqueLookups.length > 0) {
            // For resume_analysis, job_id is TEXT, so all job_id types from source are fine
            const raLookups = uniqueLookups.filter(l => l.job_id); // Must have a job_id
            if (raLookups.length > 0) {
                const raFilterConditions = raLookups
                    .map(lookup => `and(candidate_id.eq.${lookup.candidate_id},job_id.eq.${lookup.job_id})`)
                    .join(',');
                console.log(`useCompanyEmployees: Fetching resume_analysis details for pairs:`, raLookups);
                const { data: raData, error: raError } = await supabase
                    .from('resume_analysis') 
                    .select('candidate_id, job_id, candidate_name, email, phone_number, linkedin')
                    .or(raFilterConditions);
                if (raError) {
                    console.error('useCompanyEmployees: Error fetching resume_analysis details:', raError);
                } else {
                    (raData || []).forEach(ra => {
                        if (ra.candidate_id && ra.job_id) {
                            resumeAnalysisDetailsMap.set(`${String(ra.candidate_id)}|${String(ra.job_id)}`, ra as ResumeAnalysisData);
                        }
                    });
                    console.log(`useCompanyEmployees: Successfully fetched ${resumeAnalysisDetailsMap.size} resume_analysis details.`);
                }
            }
        }
        
        const mappedLegacyDetails: CandidateDetail[] = (legacyLinks || []).map((ccLink): CandidateDetail => {
          const jobKeyPart = ccLink.job_id ? String(ccLink.job_id) : "NULL_JOB"; // Handle null job_id for map key
          const candResumeKey = (ccLink.candidate_id && ccLink.job_id && /^[0-9a-fA-F-]{36}$/.test(ccLink.job_id)) ? `${String(ccLink.candidate_id)}|${jobKeyPart}` : null;
          const resumeKey = (ccLink.candidate_id && ccLink.job_id) ? `${String(ccLink.candidate_id)}|${jobKeyPart}` : null;
          
          const candAnalysisDetail = candResumeKey ? candidateResumeAnalysisMap.get(candResumeKey) : null;
          const analysisDetail = resumeKey ? resumeAnalysisDetailsMap.get(resumeKey) : null;

          const name = candAnalysisDetail?.candidate_name && candAnalysisDetail.candidate_name !== 'Unknown' 
                       ? candAnalysisDetail.candidate_name 
                       : (analysisDetail?.candidate_name && analysisDetail.candidate_name !== 'Unknown' 
                          ? analysisDetail.candidate_name 
                          : `Legacy: ${String(ccLink.candidate_id)?.substring(0,8) ?? 'N/A'}`);
          const email = candAnalysisDetail?.email || analysisDetail?.email || null;
          const phone = candAnalysisDetail?.phone_number || analysisDetail?.phone_number || null;
          const linkedin = candAnalysisDetail?.linkedin || analysisDetail?.linkedin || null;

          return {
            id: `cc-${ccLink.candidate_id}-${ccLink.job_id}-${ccLink.company_id}`,
            candidate_id: String(ccLink.candidate_id),
            name: name,
            email: email,
            phone_number: phone,
            linkedin: linkedin,
            designation: ccLink.designation || null,
            contact_owner: ccLink.contact_owner || null,
            contact_stage: ccLink.contact_stage || null,
            source_table: 'candidate_companies',
            company_id: ccLink.company_id,
            job_id: ccLink.job_id ? String(ccLink.job_id) : null,
            years: ccLink.years || null,
            association_id: null,
          };
        });

        const mappedNewDetails: CandidateDetail[] = (newAssociations || []).map((assoc): CandidateDetail => {
             const jobKeyPart = assoc.job_id ? String(assoc.job_id) : "NULL_JOB";
             const candResumeKey = (assoc.candidate_id && assoc.job_id && /^[0-9a-fA-F-]{36}$/.test(assoc.job_id)) ? `${String(assoc.candidate_id)}|${jobKeyPart}` : null;
             const resumeKey = (assoc.candidate_id && assoc.job_id) ? `${String(assoc.candidate_id)}|${jobKeyPart}` : null;

             const candAnalysisDetail = candResumeKey ? candidateResumeAnalysisMap.get(candResumeKey) : null;
             const analysisDetail = resumeKey ? resumeAnalysisDetailsMap.get(resumeKey) : null;

             const name = candAnalysisDetail?.candidate_name && candAnalysisDetail.candidate_name !== 'Unknown' 
                          ? candAnalysisDetail.candidate_name 
                          : (analysisDetail?.candidate_name && analysisDetail.candidate_name !== 'Unknown' 
                             ? analysisDetail.candidate_name 
                             : `Assoc: ${String(assoc.candidate_id)?.substring(0,8) ?? 'N/A'}`);
             const email = candAnalysisDetail?.email || analysisDetail?.email || null;
             const phone = candAnalysisDetail?.phone_number || analysisDetail?.phone_number || null;
             const linkedin = candAnalysisDetail?.linkedin || analysisDetail?.linkedin || null;

             return {
               id: String(assoc.id), 
               candidate_id: String(assoc.candidate_id),
               name: name,
               email: email,
               phone_number: phone,
               linkedin: linkedin,
               designation: assoc.designation || null,
               contact_owner: assoc.contact_owner || null,
               contact_stage: assoc.contact_stage || null,
               source_table: 'employee_associations',
               company_id: assoc.company_id,
               job_id: assoc.job_id ? String(assoc.job_id) : null,
               association_id: String(assoc.id),
               association_start_date: assoc.start_date,
               association_end_date: assoc.end_date,
               association_is_current: assoc.is_current,
               association_created_by: assoc.created_by,
             };
        });

        const allEmployeesRaw = [
            ...employeesFromContacts,
            ...mappedLegacyDetails,
            ...mappedNewDetails
        ];

        const finalDetails = allEmployeesRaw.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        console.log(`useCompanyEmployees: Final combined ${finalDetails.length} employee details for company ${companyIdNum}.`);
        return finalDetails;

      } catch (error) {
        console.error(`useCompanyEmployees: Error processing employees for company ${companyIdNum}:`, error);
        throw error;
      }
    },
    enabled: !!companyIdNum && !isNaN(companyIdNum) && companyIdNum > 0,
  });
};


// --- Hook to get company and employee counts ---
export const useCompanyCounts = () => { /* ... (your existing hook) ... */ 
  return useQuery<{ companies: number; employees: number }, Error>({
    queryKey: ['company-counts'],
    queryFn: async () => {
      try {
          const { count: companiesCount, error: companiesError } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true });

          if (companiesError) throw companiesError;

          const { data: assocEmployeeData, error: assocEmployeeError } = await supabase
            .from('employee_associations')
            .select('candidate_id', { head: false });
          if (assocEmployeeError) throw assocEmployeeError;

          const { data: legacyEmployeeData, error: legacyEmployeeError } = await supabase
            .from('candidate_companies')
            .select('candidate_id', { head: false });
          if (legacyEmployeeError) throw legacyEmployeeError;
            
          const uniqueCandidateIds = new Set([
            ...(assocEmployeeData || []).map(e => e.candidate_id),
            ...(legacyEmployeeData || []).map(e => e.candidate_id)
          ].filter(Boolean));

          return {
            companies: companiesCount ?? 0,
            employees: uniqueCandidateIds.size
          };
      } catch(error) {
           console.error('Error fetching counts:', error);
            return { companies: 0, employees: 0 };
      }
    }
  });
}

// --- Hook to fetch details ONLY from Gemini AI ---
export const useFetchCompanyDetails = () => { /* ... (your existing hook) ... */ 
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
    console.error("Gemini API key (VITE_GEMINI_API_KEY) is missing or empty. AI Fetching will fail.");
    return async (_companyName: string): Promise<Partial<CompanyDetailTypeFromTypes>> => {
      throw new Error("Gemini API Key not configured.");
    };
  }

return async (identifier: string): Promise<Partial<CompanyDetailTypeFromTypes>> => {
    // ✅ Updated error message
    if (!identifier || identifier.trim() === "") {
      throw new Error("Company name, domain, or LinkedIn URL is required for AI fetch.");
    }

    // --- START: MODIFICATION ---
    const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error("User authentication data not found for logging.");
    }
    const { organization_id, userId } = authData;

    let inputTokens = 0;
    let outputTokens = 0;
    let responseText = "";
    let status = "FAILURE"; // Default status
    let parsedData: any = null;
    // --- END: MODIFICATION ---

 const prompt = `
        You will be given a single identifier which could be a company name, a website domain, or a LinkedIn company page URL.
        Your task is to first identify the precise company from this identifier and then provide comprehensive details for it.

        The identifier is: "${identifier}"

        Based on that identifier, find the company and provide the following details:
        1.  Official Company Name (key: "name")
        2.  Primary Website URL (key: "website")
        3.  Primary Domain (if different, key: "domain")
        4.  Short "About" description (paragraph, key: "about")
        5.  Founding Date or Year (key: "start_date", format YYYY-MM-DD or YYYY)
        6.  Original Name if founded as different (key: "founded_as")
        7.  Approx Total Employees (integer, key: "employee_count")
        8.  Date for Employee Count (key: "employee_count_date", format YYYY-MM-DD)
        9.  Full HQ Address (key: "address")
        10. HQ Location (City, Country format, key: "location")
        11. Main Industry (key: "industry")
        12. Current Company Stage/Status (e.g., "Public", "Private", "Customer", key: "stage")
        13. Official LinkedIn company page URL (key: "linkedin")
        14. Estimated Annual Revenue (string like "$61.6B", key: "revenue")
        15. Estimated Cash Flow (string like "$8.2B", key: "cashflow")
        16. Top 3-5 Competitors (array of strings, key: "competitors")
        17. Key Products/Platforms (array of strings, key: "products")
        18. Main Services Offered (array of strings, key: "services")
        19. Key People (array of objects {name: string, title: string}, THIS SHOULD INCLUDE THE CEO IF KNOWN, key: "key_people"). If none known, use null or an empty array.
        20. **Logo URL (key: "logo_url"): First, try to construct a logo URL from a reliable logo service like Clearbit using the company's domain (e.g., 'https://logo.clearbit.com/DOMAIN_NAME'). If you cannot determine the domain, then find the best publicly accessible, non-temporary logo URL you can find.**

        Return ONLY a single, valid JSON object with these keys. Use null if info not found. No extra text or markdown.
        Example for identifier "accenture.com": {"name":"Accenture", "domain":"accenture.com", "logo_url":"https://logo.clearbit.com/accenture.com"}
      `;

  try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = new GenerativeModel(
  GEMINI_API_KEY,
  { model: GEMINI_MODEL_NAME },
  {
    baseUrl: "https://asia-southeast1-aiplatform.googleapis.com/v1",
  }
);
      const generationConfig = { temperature: 0.2, topK: 1, topP: 1, maxOutputTokens: 3000 };
      const safetySettings: { category: HarmCategory; threshold: HarmBlockThreshold }[] = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
      const parts = [{ text: prompt }];
      const result = await model.generateContent({ contents: [{ role: "user", parts }], generationConfig, safetySettings });

      

      // --- START: MODIFICATION ---
      inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;
      responseText = result.response.text();
      // --- END: MODIFICATION ---

      if (!result.response?.candidates?.length) { throw new Error("Gemini: AI service did not provide a valid response."); }
      
      parsedData = extractJsonWithFallback(responseText, identifier);

      if (!parsedData || typeof parsedData !== 'object' || !parsedData.name || typeof parsedData.name !== 'string') { throw new Error("Gemini: AI failed to return valid or correctly structured JSON.");}

      status = "SUCCESS"; // Mark as successful if parsing worked

  const validatedWebsite = await validateUrl(parsedData.website);
      const validatedLinkedIn = await validateUrl(parsedData.linkedin);
      const selfHostedLogoUrl = await uploadLogoFromUrl(parsedData.logo_url);

      const mappedDetails: Partial<CompanyDetailTypeFromTypes> = {
          name: parsedData.name.trim(),
          website: validatedWebsite, domain: typeof parsedData.domain === 'string' ? parsedData.domain.trim() : null,
          about: typeof parsedData.about === 'string' ? parsedData.about.trim() : null,
          start_date: typeof parsedData.start_date === 'string' ? parsedData.start_date.trim() : null,
          founded_as: typeof parsedData.founded_as === 'string' ? parsedData.founded_as.trim() : null,
          employee_count: parseFinancialValue(parsedData.employee_count),
          employee_count_date: typeof parsedData.employee_count_date === 'string' ? parsedData.employee_count_date.trim() : null,
          address: typeof parsedData.address === 'string' ? parsedData.address.trim() : null,
          location: typeof parsedData.location === 'string' ? (parsedData.location.trim().toLowerCase() === "anytown, usa" ? null : parsedData.location.trim()) : null,
          industry: typeof parsedData.industry === 'string' ? parsedData.industry.trim() : null,
          stage: 'New', 
          linkedin: validatedLinkedIn,
          revenue: parseFinancialValue(parsedData.revenue), cashflow: parseFinancialValue(parsedData.cashflow),
          competitors: Array.isArray(parsedData.competitors) ? parsedData.competitors.map((c: any) => String(c || '').trim()).filter(Boolean) : null,
          products: Array.isArray(parsedData.products) ? parsedData.products.map((p: any) => String(p || '').trim()).filter(Boolean) : null,
          services: Array.isArray(parsedData.services) ? parsedData.services.map((s: any) => String(s || '').trim()).filter(Boolean) : null,
          key_people: parsedData.key_people === "-" || parsedData.key_people === null ? null : (Array.isArray(parsedData.key_people) ? parsedData.key_people.map((kp: any) => ({ name: String(kp.name || '').trim(), title: String(kp.title || '').trim() })).filter((kp: KeyPerson) => kp.name && kp.title) : null),
          logo_url: selfHostedLogoUrl, 
      };

      if (Array.isArray(mappedDetails.key_people)) {
          const ceoPerson = mappedDetails.key_people.find(p => p.title && p.title.toLowerCase().includes('ceo'));
          if (ceoPerson) { mappedDetails.ceo = ceoPerson.name; }
      } else if (typeof parsedData.ceo === 'string' && parsedData.ceo.trim()) { 
          mappedDetails.ceo = parsedData.ceo.trim();
      }
      return mappedDetails;

    } catch (error: any) {
      console.error(`Error fetching company details via Gemini for identifier "${identifier}":`, error);
      throw new Error(`Failed to fetch details from Gemini: ${error.message}`);
    } finally {
        // --- START: MODIFICATION ---
        // Always log the API call attempt to the database.
        await supabase.from('hr_gemini_usage_log').insert({
          organization_id: organization_id,
          created_by: userId,
          status: status,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          analysis_response: parsedData ?? { error: "Parsing failed", raw_response: responseText },
          parsed_email: null, // Not applicable for this type of call
          usage_type: 'company_fetch'
        });
        // --- END: MODIFICATION ---
    }
  };
}

// --- ADD THIS NEW HELPER FUNCTION ---
// This function will download an image from a URL and upload it to your Supabase Storage.
async function uploadLogoFromUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  try {
    // Invoke the 'image-proxy' function with the target URL
    const { data, error } = await supabase.functions.invoke('image-proxy', {
      body: { imageUrl: url },
    });

    if (error) {
      // This will catch network errors or if the function itself throws an unhandled error
      throw new Error(`Edge function invocation failed: ${error.message}`);
    }
    
    // The function returns JSON, so 'data' will have our object
    if (data.error) {
        // This catches errors returned deliberately from our function logic
        throw new Error(`Image proxy error: ${data.error}`);
    }

    console.log('Successfully proxied and uploaded logo:', data.publicUrl);
    return data.publicUrl || null;

  } catch (error: any) {
    console.error(`Error processing logo via proxy for ${url}:`, error.message);
    return null; // Return null on failure
  }
}