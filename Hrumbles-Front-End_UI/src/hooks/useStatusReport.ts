
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
      // Fetch recruiters from hr_jobs for jobs_assigned
      console.log('Fetching recruiters from hr_jobs...');
      const { data: recruitersData, error: recruitersError } = await supabase
        .from('hr_jobs')
        .select('assigned_to')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
  
      if (recruitersError) {
        console.error('Recruiters fetch error:', recruitersError);
        throw recruitersError;
      }
      console.log('Recruiters data:', recruitersData);
  
      const recruiters = new Map<string, string>(); // Map<recruiterId, recruiterName>
      recruitersData?.forEach(job => {
        const assignedTo = job.assigned_to as { id: string, name: string, type: string } | null;
        if (!assignedTo?.id) {
          recruiters.set('unassigned', 'Unassigned');
          return;
        }
        const ids = assignedTo.id.split(',').map(id => id.trim());
        const names = assignedTo.name.split(',').map(name => name.trim());
  
        if (ids.length !== names.length) {
          console.warn('Mismatch between ids and names for assigned_to:', assignedTo);
          return;
        }
  
        ids.forEach((id, index) => {
          recruiters.set(id, names[index]);
        });
      });
      console.log('Unique recruiters:', Array.from(recruiters.entries()));
  
      // Fetch status changes with created_by
      const { data: statusChanges, error: statusError } = await supabase
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
        .not('hr_job_candidates.created_by', 'is', null);
  
      if (statusError) {
        console.error('Status fetch error:', statusError);
        throw statusError;
      }
      console.log('All status changes:', statusChanges);
  
      // Debug: Fetch raw status changes for Processed (Internal)
      const { data: rawStatusChanges } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          candidate_id,
          main_status:job_statuses!hr_status_change_counts_main_status_id_fkey(name),
          sub_status:job_statuses!hr_status_change_counts_sub_status_id_fkey(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('main_status.name', 'Processed')
        .eq('sub_status.name', 'Processed (Internal)');
  
      console.log('Raw status changes for Processed (Internal):', rawStatusChanges);
      const totalProfilesSubmitted = rawStatusChanges?.reduce((sum, status) => sum + (status.count || 0), 0) || 0;
      console.log('Total profiles_submitted count (global):', totalProfilesSubmitted);
      const uniqueCandidatesGlobal = new Set(rawStatusChanges?.map(status => status.candidate_id)).size;
      console.log('Unique candidates with Processed (Internal) (global):', uniqueCandidatesGlobal);
  
      // Deduplicate by candidate_id for profiles_submitted
      const profilesSubmittedByRecruiter = new Map<string, number>();
      const candidateToRecruiter = new Map<string, string>(); // Map<candidate_id, recruiterName>
      statusChanges?.forEach(row => {
        const recruiterName = `${row.hr_job_candidates.hr_employees.first_name} ${row.hr_job_candidates.hr_employees.last_name}`;
        const candidateId = row.candidate_id;
        const mainStatus = row.main_status?.name?.toLowerCase() || '';
        const subStatus = row.sub_status?.name?.toLowerCase() || '';
        const updatedAt = new Date(row.updated_at || row.created_at).getTime();
  
        if (mainStatus === 'processed' && subStatus === 'processed (internal)') {
          if (!candidateToRecruiter.has(candidateId)) {
            candidateToRecruiter.set(candidateId, recruiterName);
            profilesSubmittedByRecruiter.set(recruiterName, (profilesSubmittedByRecruiter.get(recruiterName) || 0) + (row.count || 1));
          } else {
            const existingRecruiter = candidateToRecruiter.get(candidateId);
            if (existingRecruiter === recruiterName) {
              // Update count if same recruiter
              profilesSubmittedByRecruiter.set(recruiterName, (profilesSubmittedByRecruiter.get(recruiterName) || 0) + (row.count || 1));
            }
            // Ignore if different recruiter to avoid double-counting
          }
        }
      });
      console.log('Profiles submitted by recruiter:', Object.fromEntries(profilesSubmittedByRecruiter));
      console.log('Unique candidates assigned:', candidateToRecruiter.size);
  
      // Initialize Maps for other status metrics
      const internalRejectByRecruiter = new Map<string, number>();
      const internalHoldByRecruiter = new Map<string, number>();
      const sentToClientByRecruiter = new Map<string, number>();
      const clientRejectByRecruiter = new Map<string, number>();
      const clientHoldByRecruiter = new Map<string, number>();
      const clientDuplicateByRecruiter = new Map<string, number>();
      const interviewsTechnicalByRecruiter = new Map<string, number>();
      const interviewsTechnicalSelectedByRecruiter = new Map<string, number>();
      const interviewsTechnicalRejectByRecruiter = new Map<string, number>();
      const interviewsL1ByRecruiter = new Map<string, number>();
      const interviewsL1SelectedByRecruiter = new Map<string, number>();
      const interviewsL1RejectByRecruiter = new Map<string, number>();
      const interviewsL2ByRecruiter = new Map<string, number>();
      const interviewsL2RejectByRecruiter = new Map<string, number>();
      const interviewsEndClientByRecruiter = new Map<string, number>();
      const interviewsEndClientRejectByRecruiter = new Map<string, number>();
      const offersMadeByRecruiter = new Map<string, number>();
      const offersAcceptedByRecruiter = new Map<string, number>();
      const offersRejectedByRecruiter = new Map<string, number>();
      const joiningJoinedByRecruiter = new Map<string, number>();
      const joiningNoShowByRecruiter = new Map<string, number>();
  
      // Calculate counts for other statuses
      statusChanges?.forEach(row => {
        const recruiterName = `${row.hr_job_candidates.hr_employees.first_name} ${row.hr_job_candidates.hr_employees.last_name}`;
        const mainStatus = row.main_status?.name?.toLowerCase() || '';
        const subStatus = row.sub_status?.name?.toLowerCase() || '';
        const count = row.count || 1;
  
        const incrementMap = (map: Map<string, number>, key: string, value: number) => {
          map.set(key, (map.get(key) || 0) + value);
        };
  
        switch (mainStatus) {
          case 'processed':
            if (subStatus === 'internal reject') {
              incrementMap(internalRejectByRecruiter, recruiterName, count);
            }
            if (subStatus === 'candidate on hold') {
              incrementMap(internalHoldByRecruiter, recruiterName, count);
            }
            if (subStatus === 'processed (client)') {
              incrementMap(sentToClientByRecruiter, recruiterName, count);
            }
            if (subStatus === 'client reject') {
              incrementMap(clientRejectByRecruiter, recruiterName, count);
            }
            if (subStatus === 'duplicate (client)' || subStatus === 'duplicate (internal)') {
              incrementMap(clientDuplicateByRecruiter, recruiterName, count);
            }
            break;
          case 'interview':
            if (subStatus === 'technical assessment') {
              incrementMap(interviewsTechnicalByRecruiter, recruiterName, count);
            }
            if (subStatus === 'technical assessment selected') {
              incrementMap(interviewsTechnicalSelectedByRecruiter, recruiterName, count);
            }
            if (subStatus === 'technical assessment rejected') {
              incrementMap(interviewsTechnicalRejectByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l1') {
              incrementMap(interviewsL1ByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l1 selected') {
              incrementMap(interviewsL1SelectedByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l1 rejected') {
              incrementMap(interviewsL1RejectByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l2') {
              incrementMap(interviewsL2ByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l2 rejected') {
              incrementMap(interviewsL2RejectByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l3' || subStatus === 'end client round') {
              incrementMap(interviewsEndClientByRecruiter, recruiterName, count);
            }
            if (subStatus === 'l3 rejected' || subStatus === 'end client rejected') {
              incrementMap(interviewsEndClientRejectByRecruiter, recruiterName, count);
            }
            break;
          case 'offered':
            if (subStatus === 'offer issued') {
              incrementMap(offersMadeByRecruiter, recruiterName, count);
            }
            if (subStatus === 'offer on hold') {
              incrementMap(offersAcceptedByRecruiter, recruiterName, count);
            }
            if (subStatus === 'offer rejected') {
              incrementMap(offersRejectedByRecruiter, recruiterName, count);
            }
            break;
          case 'joined':
            if (subStatus === 'joined') {
              incrementMap(joiningJoinedByRecruiter, recruiterName, count);
            }
            if (subStatus === 'no show') {
              incrementMap(joiningNoShowByRecruiter, recruiterName, count);
            }
            break;
        }
      });
  
      // Log all counts for debugging
      console.log('Status counts by recruiter:', {
        profiles_submitted: Object.fromEntries(profilesSubmittedByRecruiter),
        internal_reject: Object.fromEntries(internalRejectByRecruiter),
        internal_hold: Object.fromEntries(internalHoldByRecruiter),
        sent_to_client: Object.fromEntries(sentToClientByRecruiter),
        client_reject: Object.fromEntries(clientRejectByRecruiter),
        client_hold: Object.fromEntries(clientHoldByRecruiter),
        client_duplicate: Object.fromEntries(clientDuplicateByRecruiter),
        interviews_technical: Object.fromEntries(interviewsTechnicalByRecruiter),
        interviews_technical_selected: Object.fromEntries(interviewsTechnicalSelectedByRecruiter),
        interviews_technical_reject: Object.fromEntries(interviewsTechnicalRejectByRecruiter),
        interviews_l1: Object.fromEntries(interviewsL1ByRecruiter),
        interviews_l1_selected: Object.fromEntries(interviewsL1SelectedByRecruiter),
        interviews_l1_reject: Object.fromEntries(interviewsL1RejectByRecruiter),
        interviews_l2: Object.fromEntries(interviewsL2ByRecruiter),
        interviews_l2_reject: Object.fromEntries(interviewsL2RejectByRecruiter),
        interviews_end_client: Object.fromEntries(interviewsEndClientByRecruiter),
        interviews_end_client_reject: Object.fromEntries(interviewsEndClientRejectByRecruiter),
        offers_made: Object.fromEntries(offersMadeByRecruiter),
        offers_accepted: Object.fromEntries(joiningJoinedByRecruiter),
        offers_rejected: Object.fromEntries(offersRejectedByRecruiter),
        joining_joined: Object.fromEntries(joiningJoinedByRecruiter),
        joining_no_show: Object.fromEntries(joiningNoShowByRecruiter)
      });
  
      const recruiterPerformanceData: RecruiterPerformanceData[] = [];
  
      for (const [recruiterId, recruiterName] of recruiters) {
        console.log('Processing recruiter:', { id: recruiterId, name: recruiterName });
  
        // Count jobs assigned
        const { count: jobsAssigned, error: jobsError } = await supabase
          .from('hr_jobs')
          .select('id, assigned_to', { count: 'exact' })
          .ilike('assigned_to->>id', `%${recruiterId}%`)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
  
        if (jobsError) {
          console.error(`Jobs fetch error for ${recruiterName}:`, jobsError);
          throw jobsError;
        }
        console.log(`Jobs assigned count for ${recruiterName}:`, jobsAssigned);
  
        const performanceData: RecruiterPerformanceData = {
          recruiter: recruiterName,
          jobs_assigned: jobsAssigned || 0,
          profiles_submitted: profilesSubmittedByRecruiter.get(recruiterName) || 0,
          internal_reject: internalRejectByRecruiter.get(recruiterName) || 0,
          internal_hold: internalHoldByRecruiter.get(recruiterName) || 0,
          sent_to_client: sentToClientByRecruiter.get(recruiterName) || 0,
          client_reject: clientRejectByRecruiter.get(recruiterName) || 0,
          client_hold: clientHoldByRecruiter.get(recruiterName) || 0,
          client_duplicate: clientDuplicateByRecruiter.get(recruiterName) || 0,
          interviews: {
            technical: interviewsTechnicalByRecruiter.get(recruiterName) || 0,
            technical_selected: interviewsTechnicalSelectedByRecruiter.get(recruiterName) || 0,
            technical_reject: interviewsTechnicalRejectByRecruiter.get(recruiterName) || 0,
            l1: interviewsL1ByRecruiter.get(recruiterName) || 0,
            l1_selected: interviewsL1SelectedByRecruiter.get(recruiterName) || 0,
            l1_reject: interviewsL1RejectByRecruiter.get(recruiterName) || 0,
            l2: interviewsL2ByRecruiter.get(recruiterName) || 0,
            l2_reject: interviewsL2RejectByRecruiter.get(recruiterName) || 0,
            end_client: interviewsEndClientByRecruiter.get(recruiterName) || 0,
            end_client_reject: interviewsEndClientRejectByRecruiter.get(recruiterName) || 0
          },
          offers: {
            made: offersMadeByRecruiter.get(recruiterName) || 0,
            accepted: joiningJoinedByRecruiter.get(recruiterName) || 0,
            rejected: offersRejectedByRecruiter.get(recruiterName) || 0
          },
          joining: {
            joined: joiningJoinedByRecruiter.get(recruiterName) || 0,
            no_show: joiningNoShowByRecruiter.get(recruiterName) || 0
          }
        };
  
        console.log(`Performance data for ${recruiterName}:`, performanceData);
        recruiterPerformanceData.push(performanceData);
      }
  
      console.log('Final recruiter performance data:', recruiterPerformanceData);
      const totalSubmitted = recruiterPerformanceData.reduce((sum, rec) => sum + rec.profiles_submitted, 0);
      console.log('Total profiles_submitted across recruiters:', totalSubmitted);
      if (totalSubmitted !== uniqueCandidatesGlobal) {
        console.warn(`Total profiles_submitted (${totalSubmitted}) does not match unique candidates (${uniqueCandidatesGlobal}). Check deduplication logic.`);
      }
  
      return recruiterPerformanceData;
    } catch (err) {
      console.error('Error in fetchRecruiterReport:', err);
      setError(err.message || 'Failed to fetch recruiter report');
      return [];
    } finally {
      console.log('fetchRecruiterReport completed, isLoading set to false');
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
