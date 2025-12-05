
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReportData } from '@/types/reports';
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface RecruiterPerformanceData {
  recruiter: string;
  jobs_assigned: number;
  profiles_submitted: number;
  internal_reject: number;
  internal_hold: number;
  sent_to_client: number;
  client_reject: number;
  client_hold: number;
  client_duplicate: number;
  interviews: {
    technical: number;
    technical_selected: number;
    technical_reject: number;
    l1: number;
    l1_selected: number;
    l1_reject: number;
    l2: number;
    l2_reject: number;
    end_client: number;
    end_client_reject: number;
  };
  offers: {
    made: number;
    accepted: number;
    rejected: number;
  };
  joining: {
    joined: number;
    no_show: number;
  };
}

export const useStatusReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientReport = async (startDate: Date, endDate: Date) => {
       

    setIsLoading(true);
    setError(null);

    try {
       const authData = getAuthDataFromLocalStorage();
            if (!authData) {
              throw new Error('Failed to retrieve authentication data');
            }
            const { organization_id, userId } = authData;
      // Fetch all statuses to map main and sub-statuses
      const { data: allStatuses, error: statusError } = await supabase
        .from('job_statuses')
        .select('id, name, type, parent_id')
        .eq('organization_id', organization_id);

      if (statusError) throw statusError;

      // Define main statuses, excluding 'New' and 'Passive – Future Fit'
      const includedMainStatuses = ['Processed', 'Interview', 'Offered', 'Joined'];
      const mainStatuses = allStatuses
        .filter(s => s.type === 'main' && includedMainStatuses.includes(s.name))
        .map(s => ({
          id: s.id,
          name: s.name,
        }));

      // Define display order for main statuses
      const statusOrder = ['Processed', 'Interview', 'Offered', 'Joined'];

      const processedSubStatuses = [
        'Processed (Client)',
        'Duplicate (Client)',
        'Client Hold',
        'Client Reject',
      ];

      // Map sub-statuses to their main status, excluding 'Candidate on hold'
      const statusMap = allStatuses.reduce((acc, status) => {
        if (status.type === 'sub' && status.name !== 'Candidate on hold') {
          acc[status.id] = {
            mainId: status.parent_id,
            subName: status.name,
          };
        }
        return acc;
      }, {});

      const { data, error } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          job_id,
          candidate_id,
          main_status_id,
          sub_status_id,
          created_at,
          updated_at,
          hr_jobs!inner(client_owner),
          main_status:job_statuses!hr_status_change_counts_main_status_id_fkey!inner(name),
          sub_status:job_statuses!hr_status_change_counts_sub_status_id_fkey!inner(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('main_status_id', 'is', null)
        .not('sub_status_id', 'is', null)
        .not('job_id', 'is', null)
        .not('candidate_id', 'is', null);

      if (error) throw error;

      console.log('fetchClientReport raw data:', data);

      // Transform data to aggregate by main status
      const transformedData = data.reduce((acc, curr) => {
        if (
          !curr.hr_jobs?.client_owner ||
          !curr.main_status?.name ||
          !curr.sub_status?.name ||
          !curr.candidate_id ||
          !curr.count
        ) {
          console.warn('Skipping row with null values:', curr);
          return acc;
        }

        const clientName = curr.hr_jobs.client_owner;
        const subStatusName = curr.sub_status.name;
        const mainStatusName = curr.main_status.name;
        const candidateId = curr.candidate_id;

        // Skip 'Candidate on hold'
        if (subStatusName === 'Candidate on hold') return acc;

        // Skip if main status is not in includedMainStatuses
        if (!includedMainStatuses.includes(mainStatusName)) return acc;

        // For Processed, only include specified sub-statuses
        if (mainStatusName === 'Processed' && !processedSubStatuses.includes(subStatusName)) {
          return acc;
        }

        if (!acc[clientName]) {
          acc[clientName] = {
            totalCandidates: new Set(),
            statusBreakdown: {},
          };
        }

        acc[clientName].totalCandidates.add(candidateId);

        if (!acc[clientName].statusBreakdown[mainStatusName]) {
          acc[clientName].statusBreakdown[mainStatusName] = 0;
        }
        acc[clientName].statusBreakdown[mainStatusName] += curr.count;

        return acc;
      }, {});

      const result = Object.entries(transformedData).map(([name, data]: [string, any]) => {
        const statusBreakdown = mainStatuses.map(main => ({
          statusName: main.name,
          count: data.statusBreakdown[main.name] || 0,
        })).sort((a, b) => {
          return statusOrder.indexOf(a.statusName) - statusOrder.indexOf(b.statusName);
        });
        return {
          name,
          totalCandidates: data.totalCandidates.size,
          statusBreakdown,
        };
      });

      return result;
    } catch (err) {
      console.error('fetchClientReport error:', err);
      setError(err.message || 'Failed to fetch client report');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndividualReport = async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);
  
    try {
      const { data: allStatuses, error: statusError } = await supabase
        .from('job_statuses')
        .select('id, name, type, parent_id');
  
      if (statusError) throw statusError;
  
      const statusCombinations = allStatuses
        .filter(s => s.type === 'main')
        .flatMap(main =>
          allStatuses
            .filter(sub => sub.type === 'sub' && sub.parent_id === main.id)
            .map(sub => ({
              mainId: main.id,
              subId: sub.id,
              statusName: `${main.name} - ${sub.name}`
            }))
        );
  
      const { data, error } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          candidate_id,
          main_status_id,
          sub_status_id,
          created_at,
          updated_at,
          hr_job_candidates!hr_status_change_counts_candidate_id_fkey!inner(
            created_by,
            hr_employees!hr_job_candidates_created_by_fkey!inner(first_name, last_name)
          ),
          main_status:job_statuses!hr_status_change_counts_main_status_id_fkey!inner(name),
          sub_status:job_statuses!hr_status_change_counts_sub_status_id_fkey!inner(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('main_status_id', 'is', null)
        .not('sub_status_id', 'is', null)
        .not('candidate_id', 'is', null)
        .not('hr_job_candidates.created_by', 'is', null)
        .order('updated_at', { ascending: false });
  
      if (error) throw error;
  
      console.log('fetchIndividualReport raw data:', data);
  
      const latestStatusByCandidate = new Map();
      data.forEach(row => {
        const candidateId = row.candidate_id;
        const employeeName = `${row.hr_job_candidates.hr_employees.first_name} ${row.hr_job_candidates.hr_employees.last_name}`;
        const statusName = `${row.main_status.name} - ${row.sub_status.name}`;
        const updatedAt = new Date(row.updated_at || row.created_at).getTime();
  
        if (!latestStatusByCandidate.has(candidateId)) {
          latestStatusByCandidate.set(candidateId, {
            candidateId,
            employeeName,
            statusName,
            updatedAt,
            count: row.count
          });
        } else {
          const existing = latestStatusByCandidate.get(candidateId);
          if (updatedAt > existing.updatedAt) {
            latestStatusByCandidate.set(candidateId, {
              candidateId,
              employeeName,
              statusName,
              updatedAt,
              count: row.count
            });
          }
        }
      });
  
      const transformedData = Array.from(latestStatusByCandidate.values()).reduce(
        (acc, { candidateId, employeeName, statusName, count, updatedAt }) => {
          if (!employeeName || !statusName || !count) {
            console.warn('Skipping row with null values:', { employeeName, statusName, count });
            return acc;
          }
  
          if (!acc[employeeName]) {
            acc[employeeName] = {
              totalCandidates: new Set(),
              statusBreakdown: {},
              dailyData: {}
            };
          }
  
          acc[employeeName].totalCandidates.add(candidateId);
  
          if (!acc[employeeName].statusBreakdown[statusName]) {
            acc[employeeName].statusBreakdown[statusName] = 0;
          }
          acc[employeeName].statusBreakdown[statusName] += count;
  
          const date = new Date(updatedAt).toISOString().split('T')[0];
          if (!acc[employeeName].dailyData[date]) {
            acc[employeeName].dailyData[date] = { date };
          }
          acc[employeeName].dailyData[date][statusName] =
            (acc[employeeName].dailyData[date][statusName] || 0) + count;
  
          return acc;
        },
        {}
      );
  
      const result = Object.entries(transformedData).map(([name, data]: [string, any]) => {
        const statusBreakdown = statusCombinations.map(combo => ({
          statusName: combo.statusName,
          count: data.statusBreakdown[combo.statusName] || 0
        }));
        const dailyData = Object.values(data.dailyData).sort((a: any, b: any) =>
          a.date.localeCompare(b.date)
        );
        return {
          name,
          totalCandidates: data.totalCandidates.size,
          statusBreakdown: statusBreakdown.sort((a, b) => a.statusName.localeCompare(b.statusName)),
          dailyData
        };
      });
  
      return result;
    } catch (err) {
      console.error('fetchIndividualReport error:', err);
      setError(err.message || 'Failed to fetch individual report');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

const fetchRecruiterReport = async (startDate: Date, endDate: Date): Promise<RecruiterPerformanceData[]> => {
    console.log('Starting fetchRecruiterReport with dates:', { startDate, endDate });
    setIsLoading(true);
    setError(null);
  
    try {
      // 1. Fetch recruiters from hr_jobs
      // We map ID -> Name here so we can display the name later, but we calculate using ID.
      const { data: recruitersData, error: recruitersError } = await supabase
        .from('hr_jobs')
        .select('assigned_to')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
  
      if (recruitersError) throw recruitersError;
  
      const recruiters = new Map<string, string>(); // Map<RecruiterID, RecruiterName>
      recruitersData?.forEach(job => {
        const assignedTo = job.assigned_to as { id: string, name: string, type: string } | null;
        if (!assignedTo?.id) {
          // You can handle unassigned if needed, but usually we skip or handle separately
          return; 
        }
        const ids = assignedTo.id.split(',').map(id => id.trim());
        const names = assignedTo.name.split(',').map(name => name.trim());
  
        ids.forEach((id, index) => {
          // Store the mapping. If duplicates exist, the last name found for the ID is used.
          recruiters.set(id, names[index]);
        });
      });
  
      // 2. Fetch status changes
      const { data: statusChanges, error: statusError } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          job_id,
          candidate_id,
          main_status_id,
          sub_status_id,
          created_at,
          updated_at,
          hr_job_candidates!hr_status_change_counts_candidate_id_fkey!inner(
            created_by,
            hr_employees!hr_job_candidates_created_by_fkey!inner(first_name, last_name)
          ),
          main_status:job_statuses!hr_status_change_counts_main_status_id_fkey!inner(name),
          sub_status:job_statuses!hr_status_change_counts_sub_status_id_fkey!inner(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('main_status_id', 'is', null)
        .not('sub_status_id', 'is', null)
        .not('candidate_id', 'is', null)
        .not('hr_job_candidates.created_by', 'is', null);
  
      if (statusError) throw statusError;
  
      // --- CHANGE START: Use ID based Maps instead of Name based Maps ---
      
      const profilesSubmittedByRecruiterId = new Map<string, number>();
      const uniqueSubmissions = new Set<string>(); // Tracks `${candidateId}_${jobId}`
  
      // Helper maps for other metrics (Key = Recruiter ID)
      const internalRejectById = new Map<string, number>();
      const internalHoldById = new Map<string, number>();
      const sentToClientById = new Map<string, number>();
      const clientRejectById = new Map<string, number>();
      const clientHoldById = new Map<string, number>();
      const clientDuplicateById = new Map<string, number>();
      const interviewsTechnicalById = new Map<string, number>();
      const interviewsTechnicalSelectedById = new Map<string, number>();
      const interviewsTechnicalRejectById = new Map<string, number>();
      const interviewsL1ById = new Map<string, number>();
      const interviewsL1SelectedById = new Map<string, number>();
      const interviewsL1RejectById = new Map<string, number>();
      const interviewsL2ById = new Map<string, number>();
      const interviewsL2RejectById = new Map<string, number>();
      const interviewsEndClientById = new Map<string, number>();
      const interviewsEndClientRejectById = new Map<string, number>();
      const offersMadeById = new Map<string, number>();
      const offersAcceptedById = new Map<string, number>(); // This is usually "joined" or "offer accepted"
      const offersRejectedById = new Map<string, number>();
      const joiningJoinedById = new Map<string, number>();
      const joiningNoShowById = new Map<string, number>();
  
      // 3. Process Data
      statusChanges?.forEach(row => {
        // IMPORTANT: Use the ID, not the name string
        const recruiterId = row.hr_job_candidates.created_by; 
        
        const candidateId = row.candidate_id;
        const jobId = row.job_id;
        const mainStatus = row.main_status?.name?.toLowerCase() || '';
        const subStatus = row.sub_status?.name?.toLowerCase() || '';
        const count = row.count || 1;
  
        // Deduplicated Submission Logic
        if (mainStatus === 'processed' && subStatus === 'processed (internal)') {
          const uniqueKey = `${candidateId}_${jobId}`;
          if (!uniqueSubmissions.has(uniqueKey)) {
            uniqueSubmissions.add(uniqueKey);
            profilesSubmittedByRecruiterId.set(recruiterId, (profilesSubmittedByRecruiterId.get(recruiterId) || 0) + 1);
          }
        }
  
        // Helper to increment ID-based maps
        const incrementMap = (map: Map<string, number>, key: string, val: number) => {
          map.set(key, (map.get(key) || 0) + val);
        };
  
        // Categorize other statuses
        switch (mainStatus) {
          case 'processed':
            if (subStatus === 'internal reject') incrementMap(internalRejectById, recruiterId, count);
            if (subStatus === 'candidate on hold') incrementMap(internalHoldById, recruiterId, count);
            if (subStatus === 'processed (client)') incrementMap(sentToClientById, recruiterId, count);
            if (subStatus === 'client reject') incrementMap(clientRejectById, recruiterId, count);
            if (subStatus === 'duplicate (client)' || subStatus === 'duplicate (internal)') {
              incrementMap(clientDuplicateById, recruiterId, count);
            }
            break;
          case 'interview':
            if (subStatus === 'technical assessment') incrementMap(interviewsTechnicalById, recruiterId, count);
            if (subStatus === 'technical assessment selected') incrementMap(interviewsTechnicalSelectedById, recruiterId, count);
            if (subStatus === 'technical assessment rejected') incrementMap(interviewsTechnicalRejectById, recruiterId, count);
            if (subStatus === 'l1') incrementMap(interviewsL1ById, recruiterId, count);
            if (subStatus === 'l1 selected') incrementMap(interviewsL1SelectedById, recruiterId, count);
            if (subStatus === 'l1 rejected') incrementMap(interviewsL1RejectById, recruiterId, count);
            if (subStatus === 'l2') incrementMap(interviewsL2ById, recruiterId, count);
            if (subStatus === 'l2 rejected') incrementMap(interviewsL2RejectById, recruiterId, count);
            if (subStatus === 'l3' || subStatus === 'end client round') incrementMap(interviewsEndClientById, recruiterId, count);
            if (subStatus === 'l3 rejected' || subStatus === 'end client rejected') incrementMap(interviewsEndClientRejectById, recruiterId, count);
            break;
          case 'offered':
            if (subStatus === 'offer issued') incrementMap(offersMadeById, recruiterId, count);
            if (subStatus === 'offer on hold') incrementMap(offersAcceptedById, recruiterId, count);
            if (subStatus === 'offer rejected') incrementMap(offersRejectedById, recruiterId, count);
            break;
          case 'joined':
            if (subStatus === 'joined') incrementMap(joiningJoinedById, recruiterId, count);
            if (subStatus === 'no show') incrementMap(joiningNoShowById, recruiterId, count);
            break;
        }
      });
  
      // 4. Build Final Result
      const recruiterPerformanceData: RecruiterPerformanceData[] = [];
  
      // Iterate through the recruiters found in hr_jobs (or you could iterate through all keys in the data maps if you want to include people not currently assigned to jobs)
      for (const [recruiterId, recruiterName] of recruiters) {
        
        // Count jobs assigned (Exact Match on ID)
        const { count: jobsAssigned, error: jobsError } = await supabase
          .from('hr_jobs')
          .select('id, assigned_to', { count: 'exact' })
          .ilike('assigned_to->>id', `%${recruiterId}%`)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
  
        if (jobsError) throw jobsError;
  
        // Lookup data using ID
        const performanceData: RecruiterPerformanceData = {
          recruiter: recruiterName, // Display Name
          jobs_assigned: jobsAssigned || 0,
          profiles_submitted: profilesSubmittedByRecruiterId.get(recruiterId) || 0,
          internal_reject: internalRejectById.get(recruiterId) || 0,
          internal_hold: internalHoldById.get(recruiterId) || 0,
          sent_to_client: sentToClientById.get(recruiterId) || 0,
          client_reject: clientRejectById.get(recruiterId) || 0,
          client_hold: clientHoldById.get(recruiterId) || 0,
          client_duplicate: clientDuplicateById.get(recruiterId) || 0,
          interviews: {
            technical: interviewsTechnicalById.get(recruiterId) || 0,
            technical_selected: interviewsTechnicalSelectedById.get(recruiterId) || 0,
            technical_reject: interviewsTechnicalRejectById.get(recruiterId) || 0,
            l1: interviewsL1ById.get(recruiterId) || 0,
            l1_selected: interviewsL1SelectedById.get(recruiterId) || 0,
            l1_reject: interviewsL1RejectById.get(recruiterId) || 0,
            l2: interviewsL2ById.get(recruiterId) || 0,
            l2_reject: interviewsL2RejectById.get(recruiterId) || 0,
            end_client: interviewsEndClientById.get(recruiterId) || 0,
            end_client_reject: interviewsEndClientRejectById.get(recruiterId) || 0
          },
          offers: {
            made: offersMadeById.get(recruiterId) || 0,
            accepted: joiningJoinedById.get(recruiterId) || 0, 
            rejected: offersRejectedById.get(recruiterId) || 0
          },
          joining: {
            joined: joiningJoinedById.get(recruiterId) || 0,
            no_show: joiningNoShowById.get(recruiterId) || 0
          }
        };
  
        recruiterPerformanceData.push(performanceData);
      }
  
      return recruiterPerformanceData;
    } catch (err) {
      console.error('Error in fetchRecruiterReport:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recruiter report');
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  return {
    isLoading,
    error,
    fetchClientReport,
    fetchIndividualReport,
    fetchRecruiterReport
  };
};
