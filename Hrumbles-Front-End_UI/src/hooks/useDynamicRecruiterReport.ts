import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

// MODIFIED: The data structure is updated with the new columns
export interface DynamicRecruiterPerformanceData {
  recruiter: string;
  sourced: number;
  screened: number;
  submitted_to_client: number;
  interviews: number;
  offers: number;
  joined: number;
  screen_rejections: number; // New
  client_rejections: number;
  candidate_rejections: number;
}

// MODIFIED: Keywords are more specific now
const STATUS_KEYWORDS: { [key: string]: string[] } = {
  screened: ['forwarded by chro'],
  submitted_to_client: ['submitted to client'],
  interviews: ['interview', 'round', 'l1', 'l2', 'l3', 'telephonic', 'virtual', 'face-to-face'],
  offers: ['offer released', 'offer'],
  joined: ['joined'],
  screen_rejections: ['rejected by chro'], // New
  client_rejections: ['rejected by client', 'cv rejected by client'],
  candidate_rejections: ['offer declined', 'withdrew', 'not interested']
};

export const useDynamicRecruiterReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async (startDate: Date, endDate: Date): Promise<DynamicRecruiterPerformanceData[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData?.organization_id) {
        throw new Error('User is not authenticated or organization ID is missing.');
      }
      const { organization_id } = authData;
      
      const performanceMap = new Map<string, Omit<DynamicRecruiterPerformanceData, 'recruiter'>>();

      // 1. NEW: Fetch Sourced counts directly from `hr_job_candidates`
      const { data: sourcedData, error: sourcedError } = await supabase
        .from('hr_job_candidates')
        .select('created_by, employee:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name)')
        .eq('organization_id', organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('created_by', 'is', null);

      if (sourcedError) throw new Error(`Failed to fetch sourced candidates: ${sourcedError.message}`);

      // Aggregate sourced counts and initialize the performance map
      sourcedData.forEach(row => {
        if (row.employee) {
          const recruiterName = `${row.employee.first_name} ${row.employee.last_name}`;
          if (!performanceMap.has(recruiterName)) {
            performanceMap.set(recruiterName, {
              sourced: 0, screened: 0, submitted_to_client: 0, interviews: 0, offers: 0,
              joined: 0, screen_rejections: 0, client_rejections: 0, candidate_rejections: 0
            });
          }
          performanceMap.get(recruiterName)!.sourced += 1;
        }
      });

      // 2. Fetch all 'sub' statuses for the organization
      const { data: statuses, error: statusError } = await supabase
        .from('job_statuses')
        .select('id, name')
        .eq('organization_id', organization_id)
        .eq('type', 'sub');

      if (statusError) throw new Error(`Failed to fetch statuses: ${statusError.message}`);
      
      // 3. Create a map from status ID to a report category
      const statusIdToCategory = new Map<string, keyof typeof STATUS_KEYWORDS>();
      statuses.forEach(status => {
        const nameLower = status.name.toLowerCase();
        for (const [category, keywords] of Object.entries(STATUS_KEYWORDS)) {
          if (keywords.some(keyword => nameLower.includes(keyword))) {
            statusIdToCategory.set(status.id, category as keyof typeof STATUS_KEYWORDS);
            break; 
          }
        }
      });

      // 4. Fetch status change counts for all other metrics
      const { data: counts, error: countsError } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          sub_status_id,
          employee:hr_employees!hr_status_change_counts_candidate_owner_fkey(first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (countsError) throw new Error(`Failed to fetch counts: ${countsError.message}`);

      // 5. Aggregate the rest of the data
      counts.forEach(row => {
        if (!row.employee) return;
        
        const recruiterName = `${row.employee.first_name} ${row.employee.last_name}`;
        const category = statusIdToCategory.get(row.sub_status_id);
        
        if (!category) return;

        // Ensure recruiter exists in the map (in case they have status changes but no sourced candidates)
        if (!performanceMap.has(recruiterName)) {
            performanceMap.set(recruiterName, {
              sourced: 0, screened: 0, submitted_to_client: 0, interviews: 0, offers: 0,
              joined: 0, screen_rejections: 0, client_rejections: 0, candidate_rejections: 0
            });
        }
        
        const recruiterData = performanceMap.get(recruiterName)!;
        recruiterData[category] = (recruiterData[category] || 0) + (row.count || 1);
      });

      // 6. Format the final result array
      const result = Array.from(performanceMap.entries()).map(([recruiter, metrics]) => ({
        recruiter,
        ...metrics,
      }));
      
      return result;

    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, fetchReportData };
};