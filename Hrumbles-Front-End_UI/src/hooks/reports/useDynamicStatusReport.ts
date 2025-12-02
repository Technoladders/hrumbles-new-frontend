import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DynamicReportColumn {
  id: string; // "MainId-SubId" or just "MainId"
  name: string; // "Applicants - New"
  color: string | null;
  mainStatus: string;
}

export const useDynamicStatusReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to fetch and organize columns based on DB display_order
  const fetchDynamicColumns = async () => {
    const { data: allStatuses, error: statusError } = await supabase
      .from('job_statuses')
      .select('id, name, type, parent_id, display_order, color')
      .order('display_order', { ascending: true });

    if (statusError) throw statusError;

    const mainStatuses = allStatuses
      .filter(s => s.type === 'main')
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const columns: DynamicReportColumn[] = [];

    mainStatuses.forEach(main => {
      const subStatuses = allStatuses
        .filter(sub => sub.type === 'sub' && sub.parent_id === main.id)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      if (subStatuses.length > 0) {
        subStatuses.forEach(sub => {
          columns.push({
            id: `${main.id}-${sub.id}`,
            name: `${main.name} - ${sub.name}`,
            color: sub.color || main.color || '#cccccc',
            mainStatus: main.name
          });
        });
      } else {
        columns.push({
          id: main.id,
          name: main.name,
          color: main.color || '#cccccc',
          mainStatus: main.name
        });
      }
    });

    return columns;
  };

  const fetchDynamicIndividualReport = async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const columns = await fetchDynamicColumns();

      const { data, error: dataError } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          candidate_id,
          main_status_id,
          sub_status_id,
          hr_job_candidates!hr_status_change_counts_candidate_id_fkey!inner(
            created_by,
            hr_employees!hr_job_candidates_created_by_fkey!inner(first_name, last_name)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('main_status_id', 'is', null)
        .not('hr_job_candidates.created_by', 'is', null);

      if (dataError) throw dataError;

      const employeeMap = new Map();

      data.forEach((row: any) => {
        const employeeName = `${row.hr_job_candidates.hr_employees.first_name} ${row.hr_job_candidates.hr_employees.last_name}`;
        const mainId = row.main_status_id;
        const subId = row.sub_status_id;
        const columnKey = subId ? `${mainId}-${subId}` : mainId;

        if (!employeeMap.has(employeeName)) {
          employeeMap.set(employeeName, { name: employeeName, totalCandidates: 0, counts: {} });
        }

        const record = employeeMap.get(employeeName);
        const count = row.count || 1;
        record.counts[columnKey] = (record.counts[columnKey] || 0) + count;
        record.totalCandidates += count;
      });

      return { data: Array.from(employeeMap.values()), columns };

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      return { data: [], columns: [] };
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW FUNCTION FOR CLIENT REPORT ---
  const fetchDynamicClientReport = async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const columns = await fetchDynamicColumns();

      // Query joining with hr_jobs to get client_owner
      const { data, error: dataError } = await supabase
        .from('hr_status_change_counts')
        .select(`
          count,
          main_status_id,
          sub_status_id,
          job_id,
          hr_jobs!inner(client_owner)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('main_status_id', 'is', null)
        .not('job_id', 'is', null);

      if (dataError) throw dataError;

      const clientMap = new Map();

      data.forEach((row: any) => {
        const clientName = row.hr_jobs?.client_owner || 'Unknown Client';
        const mainId = row.main_status_id;
        const subId = row.sub_status_id;
        const columnKey = subId ? `${mainId}-${subId}` : mainId;

        if (!clientMap.has(clientName)) {
          clientMap.set(clientName, { name: clientName, totalCandidates: 0, counts: {} });
        }

        const record = clientMap.get(clientName);
        const count = row.count || 1;
        record.counts[columnKey] = (record.counts[columnKey] || 0) + count;
        record.totalCandidates += count;
      });

      return { data: Array.from(clientMap.values()), columns };

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      return { data: [], columns: [] };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    fetchDynamicIndividualReport,
    fetchDynamicClientReport
  };
};