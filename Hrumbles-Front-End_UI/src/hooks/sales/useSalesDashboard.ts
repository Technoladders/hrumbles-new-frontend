import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import type {
  SalesDeal,
  SalesActivity,
  PipelineOverview,
  LeadsMetrics,
  SalesPerformanceMetrics,
  TopPerformer,
  RecentActivity,
  KeyAccount,
  DashboardFilters,
  SalesTarget,
} from '@/types/sales-dashboard.types';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// Fetch all deals with filters
export const useSalesDeals = (filters?: DashboardFilters) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['salesDeals', organization_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_deals')
        .select(`
          *,
          company:companies(id, name, logo_url),
          contact:contacts(id, name, email),
          deal_owner_employee:hr_employees!sales_deals_deal_owner_fkey(id, first_name, last_name),
          created_by_employee:hr_employees!sales_deals_created_by_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

      if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) {
        query = query
          .gte('created_at', filters.dateRange.startDate.toISOString())
          .lte('created_at', filters.dateRange.endDate.toISOString());
      }

      if (filters?.teamMembers && filters.teamMembers.length > 0) {
        query = query.in('deal_owner', filters.teamMembers);
      }

      if (filters?.stages && filters.stages.length > 0) {
        query = query.in('stage', filters.stages);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by deal size if specified
      let filteredData = data as SalesDeal[];
      if (filters?.dealSizeRange) {
        filteredData = filteredData.filter(deal => {
          const value = deal.deal_value || 0;
          const min = filters.dealSizeRange?.min;
          const max = filters.dealSizeRange?.max;
          return (!min || value >= min) && (!max || value <= max);
        });
      }

      return filteredData;
    },
    enabled: !!organization_id,
  });
};

// Fetch pipeline overview
export const usePipelineOverview = (filters?: DashboardFilters) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['pipelineOverview', organization_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_deals')
        .select('stage, deal_value, status')
        .eq('organization_id', organization_id)
        .eq('status', 'Open');

      if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) {
        query = query
          .gte('created_at', filters.dateRange.startDate.toISOString())
          .lte('created_at', filters.dateRange.endDate.toISOString());
      }

      if (filters?.teamMembers && filters.teamMembers.length > 0) {
        query = query.in('deal_owner', filters.teamMembers);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by stage
      const stageMap = new Map<string, { count: number; total_value: number }>();
      
      data.forEach((deal: any) => {
        const stage = deal.stage || 'Unknown';
        const existing = stageMap.get(stage) || { count: 0, total_value: 0 };
        stageMap.set(stage, {
          count: existing.count + 1,
          total_value: existing.total_value + (deal.deal_value || 0),
        });
      });

      const overview: PipelineOverview[] = Array.from(stageMap.entries()).map(([stage, stats]) => ({
        stage: stage as any,
        count: stats.count,
        total_value: stats.total_value,
        average_deal_size: stats.count > 0 ? stats.total_value / stats.count : 0,
      }));

      return overview;
    },
    enabled: !!organization_id,
  });
};

// Fetch leads metrics
export const useLeadsMetrics = (filters?: DashboardFilters) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['leadsMetrics', organization_id, filters],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // New leads in last 30 days
      let newLeadsQuery = supabase
        .from('sales_deals')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Active opportunities
      let activeOppsQuery = supabase
        .from('sales_deals')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .eq('status', 'Open');

      // Qualified leads
      let qualifiedQuery = supabase
        .from('sales_deals')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .eq('stage', 'Qualification');

      // Won deals for conversion rate
      let wonDealsQuery = supabase
        .from('sales_deals')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .eq('status', 'Won');

      if (filters?.teamMembers && filters.teamMembers.length > 0) {
        newLeadsQuery = newLeadsQuery.in('deal_owner', filters.teamMembers);
        activeOppsQuery = activeOppsQuery.in('deal_owner', filters.teamMembers);
        qualifiedQuery = qualifiedQuery.in('deal_owner', filters.teamMembers);
        wonDealsQuery = wonDealsQuery.in('deal_owner', filters.teamMembers);
      }

      const [newLeadsResult, activeOppsResult, qualifiedResult, wonDealsResult] = await Promise.all([
        newLeadsQuery,
        activeOppsQuery,
        qualifiedQuery,
        wonDealsQuery,
      ]);

      if (newLeadsResult.error) throw newLeadsResult.error;
      if (activeOppsResult.error) throw activeOppsResult.error;
      if (qualifiedResult.error) throw qualifiedResult.error;
      if (wonDealsResult.error) throw wonDealsResult.error;

      const newLeadsCount = newLeadsResult.count || 0;
      const activeOppsCount = activeOppsResult.count || 0;
      const qualifiedCount = qualifiedResult.count || 0;
      const wonDealsCount = wonDealsResult.count || 0;

      const totalDeals = newLeadsCount + activeOppsCount;
      const conversionRate = totalDeals > 0 ? (wonDealsCount / totalDeals) * 100 : 0;

      const metrics: LeadsMetrics = {
        new_leads_count: newLeadsCount,
        active_opportunities_count: activeOppsCount,
        conversion_rate: conversionRate,
        qualified_leads_count: qualifiedCount,
      };

      return metrics;
    },
    enabled: !!organization_id,
  });
};

// Fetch sales performance metrics
export const useSalesPerformanceMetrics = (period: 'month' | 'quarter' | 'year' = 'month', filters?: DashboardFilters) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  return useQuery({
    queryKey: ['salesPerformanceMetrics', organization_id, period, filters],
    queryFn: async () => {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (period === 'month') {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
      } else if (period === 'quarter') {
        periodStart = startOfQuarter(now);
        periodEnd = endOfQuarter(now);
      } else {
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
      }

      // Fetch deals in period
      let dealsQuery = supabase
        .from('sales_deals')
        .select('*')
        .eq('organization_id', organization_id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (filters?.teamMembers && filters.teamMembers.length > 0) {
        dealsQuery = dealsQuery.in('deal_owner', filters.teamMembers);
      }

      const { data: deals, error: dealsError } = await dealsQuery;
      if (dealsError) throw dealsError;

      // Fetch targets for the period
      const { data: targets, error: targetsError } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('target_period', period)
        .gte('period_end', periodStart.toISOString())
        .lte('period_start', periodEnd.toISOString());

      if (targetsError) throw targetsError;

      const totalTarget = targets?.reduce((sum, t) => sum + (t.target_revenue || 0), 0) || 0;

      const wonDeals = deals?.filter(d => d.status === 'Won') || [];
      const lostDeals = deals?.filter(d => d.status === 'Lost') || [];
      const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
      
      const totalDealsClosedCount = wonDeals.length + lostDeals.length;
      const winRate = totalDealsClosedCount > 0 ? (wonDeals.length / totalDealsClosedCount) * 100 : 0;
      
      const averageDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
      
      // Calculate average sales cycle
      const cyclesInDays = wonDeals
        .filter(d => d.actual_close_date)
        .map(d => {
          const created = new Date(d.created_at);
          const closed = new Date(d.actual_close_date!);
          return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      const averageSalesCycle = cyclesInDays.length > 0 
        ? cyclesInDays.reduce((sum, days) => sum + days, 0) / cyclesInDays.length 
        : 0;

      const metrics: SalesPerformanceMetrics = {
        total_revenue: totalRevenue,
        target_revenue: totalTarget,
        achievement_percentage: totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0,
        won_deals: wonDeals.length,
        lost_deals: lostDeals.length,
        win_rate: winRate,
        average_deal_size: averageDealSize,
        average_sales_cycle_days: averageSalesCycle,
      };

      return metrics;
    },
    enabled: !!organization_id,
  });
};

// Fetch top performers
export const useTopPerformers = (period: 'month' | 'quarter' | 'year' = 'month', limit: number = 5) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['topPerformers', organization_id, period, limit],
    queryFn: async () => {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (period === 'month') {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
      } else if (period === 'quarter') {
        periodStart = startOfQuarter(now);
        periodEnd = endOfQuarter(now);
      } else {
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
      }

      const { data: deals, error } = await supabase
        .from('sales_deals')
        .select(`
          *,
          deal_owner_employee:hr_employees!sales_deals_deal_owner_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .eq('status', 'Won')
        .gte('actual_close_date', periodStart.toISOString())
        .lte('actual_close_date', periodEnd.toISOString());

      if (error) throw error;

      // Fetch targets
      const { data: targets } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('target_period', period)
        .gte('period_end', periodStart.toISOString())
        .lte('period_start', periodEnd.toISOString());

      const targetMap = new Map<string, number>();
      targets?.forEach(t => {
        targetMap.set(t.employee_id, t.target_revenue);
      });

      // Group by employee
      const performanceMap = new Map<string, { name: string; deals_won: number; total_revenue: number }>();
      
      deals?.forEach((deal: any) => {
        const employeeId = deal.deal_owner;
        if (!employeeId) return;
        
        const employeeName = deal.deal_owner_employee
          ? `${deal.deal_owner_employee.first_name} ${deal.deal_owner_employee.last_name}`
          : 'Unknown';
        
        const existing = performanceMap.get(employeeId) || { name: employeeName, deals_won: 0, total_revenue: 0 };
        performanceMap.set(employeeId, {
          name: employeeName,
          deals_won: existing.deals_won + 1,
          total_revenue: existing.total_revenue + (deal.deal_value || 0),
        });
      });

      const performers: TopPerformer[] = Array.from(performanceMap.entries())
        .map(([employee_id, stats]) => {
          const target = targetMap.get(employee_id) || 0;
          return {
            employee_id,
            employee_name: stats.name,
            deals_won: stats.deals_won,
            total_revenue: stats.total_revenue,
            achievement_percentage: target > 0 ? (stats.total_revenue / target) * 100 : 0,
          };
        })
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      return performers;
    },
    enabled: !!organization_id,
  });
};

// Fetch upcoming activities
export const useUpcomingActivities = (daysAhead: number = 7) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  return useQuery({
    queryKey: ['upcomingActivities', organization_id, daysAhead],
    queryFn: async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('sales_activities')
        .select(`
          *,
          deal:sales_deals(id, name),
          company:companies(id, name),
          contact:contacts(id, name),
          assigned_to_employee:hr_employees!sales_activities_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .eq('completed', false)
        .gte('due_date', now.toISOString())
        .lte('due_date', futureDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as SalesActivity[];
    },
    enabled: !!organization_id,
  });
};

// Fetch recent activity feed
export const useRecentActivityFeed = (limit: number = 20) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['recentActivityFeed', organization_id, limit],
    queryFn: async () => {
      // Fetch recent deal stage changes
      const { data: stageChanges, error: stageError } = await supabase
        .from('sales_deal_stage_history')
        .select(`
          *,
          deal:sales_deals(id, name),
          changed_by_employee:hr_employees(id, first_name, last_name)
        `)
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (stageError) throw stageError;

      // Fetch recent comments
      const { data: comments, error: commentsError } = await supabase
        .from('sales_deal_comments')
        .select(`
          *,
          deal:sales_deals(id, name),
          created_by_employee:hr_employees(id, first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (commentsError) throw commentsError;

      // Fetch completed activities
      const { data: activities, error: activitiesError } = await supabase
        .from('sales_activities')
        .select(`
          *,
          deal:sales_deals(id, name),
          assigned_to_employee:hr_employees!sales_activities_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', organization_id)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (activitiesError) throw activitiesError;

      // Combine and format
      const recentActivities: RecentActivity[] = [];

      stageChanges?.forEach((change: any) => {
        recentActivities.push({
          id: change.id,
          type: 'deal_stage_changed',
          title: 'Deal Stage Changed',
          description: `${change.deal?.name} moved from ${change.from_stage || 'New'} to ${change.to_stage}`,
          timestamp: change.changed_at,
          user: {
            id: change.changed_by_employee?.id || '',
            name: change.changed_by_employee
              ? `${change.changed_by_employee.first_name} ${change.changed_by_employee.last_name}`
              : 'System',
          },
          related_entity: {
            type: 'deal',
            id: change.deal?.id,
            name: change.deal?.name,
          },
        });
      });

      comments?.forEach((comment: any) => {
        recentActivities.push({
          id: comment.id,
          type: 'comment_added',
          title: 'Comment Added',
          description: comment.comment.substring(0, 100) + (comment.comment.length > 100 ? '...' : ''),
          timestamp: comment.created_at,
          user: {
            id: comment.created_by_employee?.id || '',
            name: comment.created_by_employee
              ? `${comment.created_by_employee.first_name} ${comment.created_by_employee.last_name}`
              : 'Unknown',
          },
          related_entity: {
            type: 'deal',
            id: comment.deal?.id,
            name: comment.deal?.name,
          },
        });
      });

      activities?.forEach((activity: any) => {
        recentActivities.push({
          id: activity.id,
          type: 'activity_completed',
          title: `${activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)} Completed`,
          description: activity.subject,
          timestamp: activity.completed_at || activity.updated_at,
          user: {
            id: activity.assigned_to_employee?.id || '',
            name: activity.assigned_to_employee
              ? `${activity.assigned_to_employee.first_name} ${activity.assigned_to_employee.last_name}`
              : 'Unknown',
          },
          related_entity: activity.deal
            ? {
                type: 'deal',
                id: activity.deal.id,
                name: activity.deal.name,
              }
            : undefined,
        });
      });

      // Sort by timestamp and limit
      recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return recentActivities.slice(0, limit);
    },
    enabled: !!organization_id,
  });
};

// Fetch key accounts
export const useKeyAccounts = (limit: number = 10) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['keyAccounts', organization_id, limit],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from('sales_deals')
        .select(`
          *,
          company:companies(id, name, logo_url, account_owner)
        `)
        .eq('organization_id', organization_id)
        .not('company_id', 'is', null);

      if (error) throw error;

      // Group by company
      const companyMap = new Map<number, {
        company_name: string;
        logo_url?: string;
        total_deal_value: number;
        active_deals_count: number;
        won_deals_count: number;
        last_activity_date?: string;
        account_owner?: string;
      }>();

      deals?.forEach((deal: any) => {
        if (!deal.company_id) return;
        
        const existing = companyMap.get(deal.company_id) || {
          company_name: deal.company?.name || 'Unknown',
          logo_url: deal.company?.logo_url,
          total_deal_value: 0,
          active_deals_count: 0,
          won_deals_count: 0,
          account_owner: deal.company?.account_owner,
        };

        existing.total_deal_value += deal.deal_value || 0;
        if (deal.status === 'Open') existing.active_deals_count += 1;
        if (deal.status === 'Won') existing.won_deals_count += 1;
        
        if (!existing.last_activity_date || new Date(deal.updated_at) > new Date(existing.last_activity_date)) {
          existing.last_activity_date = deal.updated_at;
        }

        companyMap.set(deal.company_id, existing);
      });

      const accounts: KeyAccount[] = Array.from(companyMap.entries())
        .map(([company_id, stats]) => ({
          company_id,
          ...stats,
        }))
        .sort((a, b) => b.total_deal_value - a.total_deal_value)
        .slice(0, limit);

      return accounts;
    },
    enabled: !!organization_id,
  });
};

// Create a new deal
export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  return useMutation({
    mutationFn: async (dealData: Partial<SalesDeal>) => {
      const { data, error } = await supabase
        .from('sales_deals')
        .insert({
          ...dealData,
          organization_id,
          created_by: currentUser?.id,
          updated_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesDeals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineOverview'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivityFeed'] });
    },
  });
};

// Update a deal
export const useUpdateDeal = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: any) => state.auth.user);

  return useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: string; updates: Partial<SalesDeal> }) => {
      const { data, error } = await supabase
        .from('sales_deals')
        .update({
          ...updates,
          updated_by: currentUser?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesDeals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineOverview'] });
      queryClient.invalidateQueries({ queryKey: ['salesPerformanceMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivityFeed'] });
    },
  });
};