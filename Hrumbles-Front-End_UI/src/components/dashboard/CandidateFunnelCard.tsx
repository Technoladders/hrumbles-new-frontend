import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedFunnelChart } from './AdvancedFunnelChart';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Define a color palette for the chart
const FUNNEL_COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca',
  '#10b981', '#34d399', '#6ee7b7',
];

const CandidateFunnelCard = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Using the same 'dynamicFunnelCounts' query from your dashboard
  const { data: funnelCounts, isLoading } = useQuery({
    queryKey: ['dynamicFunnelCounts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dynamic_funnel_counts', { org_id: organizationId });
      if (error) throw error;
      // Sort data from highest to lowest value for funnel shape
      return (data || []).sort((a, b) => b.candidate_count - a.candidate_count);
    },
    enabled: !!organizationId,
  });

  // Transform data into the format required by the AdvancedFunnelChart
  const chartData = useMemo(() => {
    if (!funnelCounts) return [];
    return funnelCounts.map((stage, index) => ({
      name: stage.stage_name,
      value: Number(stage.candidate_count),
      color: stage.stage_color || FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    }));
  }, [funnelCounts]);

  if (isLoading) {
    return (
      <Card className="shadow-md border-none bg-white h-full flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </Card>
    );
  }

  return (
    <AdvancedFunnelChart
      data={chartData}
      title="Candidate Submission Funnel"
      description="Percentage of candidates in each stage"
    />
  );
};

export default CandidateFunnelCard;