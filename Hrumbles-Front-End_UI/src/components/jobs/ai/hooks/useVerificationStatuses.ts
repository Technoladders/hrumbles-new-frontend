// src/pages/jobs/ai/hooks/useVerificationStatuses.ts

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getBgvStatuses, MainStatus } from '@/services/bgvService';

export const useVerificationStatuses = () => {
  // Fetch statuses from the backend and cache them with react-query
  const { data: statuses = [], isLoading } = useQuery<MainStatus[]>({
    queryKey: ['bgvStatuses'],
    queryFn: getBgvStatuses,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Memoize the derived data to prevent re-computation
  const selectOptions = useMemo(() => {
    if (!statuses) return [];
    return statuses.map(main => ({
      label: main.name,
      options: main.subs.map(sub => ({ value: sub.id, label: sub.name })),
    }));
  }, [statuses]);

  const mainStatuses = useMemo(() => {
    if (!statuses) return [];
    return statuses.map(({ id, name }) => ({ id, name }));
  }, [statuses]);

  // Find the initial status IDs dynamically
  const initialStatus = useMemo(() => {
    const initiated = statuses.find(s => s.name === 'Initiated');
    const pendingDocs = initiated?.subs.find(s => s.name === 'Pending Candidate Documents');
    return { main_status_id: initiated?.id, sub_status_id: pendingDocs?.id };
  }, [statuses]);

  return {
    isLoading,
    selectOptions,
    mainStatuses,
    initialStatus,
  };
};