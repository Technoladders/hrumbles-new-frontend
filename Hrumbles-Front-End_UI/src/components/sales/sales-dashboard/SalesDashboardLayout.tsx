// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/SalesDashboardLayout.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Dashboard Components
import { DashboardHeader } from './DashboardHeader';
import { MetricsGrid } from './MetricsGrid';
import { PipelineChart } from './PipelineChart';
import { RecentContacts } from './RecentContacts';
import { TopCompanies } from './TopCompanies';
import { ActivityFeed } from './ActivityFeed';
import { TasksWidget } from './TasksWidget';
import { QuickActions } from './QuickActions';

interface SalesDashboardLayoutProps {
  userId?: string;
  organizationId?: string;
  role?: string;
}

export const SalesDashboardLayout: React.FC<SalesDashboardLayoutProps> = ({
  userId,
  organizationId,
  role
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['sales-dashboard-metrics', organizationId, dateRange],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // Fetch contacts count
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Fetch companies count
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Fetch new contacts this period
      const { count: newContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString());

      // Fetch contacts by stage
      const { data: stageData } = await supabase
        .from('contacts')
        .select('contact_stage')
        .eq('organization_id', organizationId);

      const stageCounts = (stageData || []).reduce((acc: any, contact: any) => {
        const stage = contact.contact_stage || 'Unassigned';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {});

      // Fetch enriched contacts count
      const { count: enrichedContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .not('apollo_person_id', 'is', null);

      return {
        totalContacts: totalContacts || 0,
        totalCompanies: totalCompanies || 0,
        newContacts: newContacts || 0,
        enrichedContacts: enrichedContacts || 0,
        stageCounts,
        enrichmentRate: totalContacts ? Math.round((enrichedContacts || 0) / totalContacts * 100) : 0,
      };
    },
    enabled: !!organizationId,
  });

  // Fetch recent contacts
  const { data: recentContacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['recent-contacts', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select(`
          id, name, email, job_title, photo_url, contact_stage, created_at,
          companies(id, name, logo_url)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch top companies
  const { data: topCompanies, isLoading: companiesLoading } = useQuery({
    queryKey: ['top-companies', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select(`
          id, name, logo_url, industry, stage, website,
          enrichment_organizations(estimated_num_employees, industry)
        `)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch recent activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activities', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contact_activities')
        .select(`
          id, activity_type, title, description, created_at,
          contacts(id, name, photo_url)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['sales-tasks', organizationId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contact_activities')
        .select(`
          id, title, description, due_date, priority, is_completed,
          contacts(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('activity_type', 'task')
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const isLoading = metricsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <DashboardHeader 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Metrics Row */}
        <MetricsGrid metrics={metrics} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts and Widgets Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Pipeline Chart - Takes 8 columns */}
          <div className="col-span-12 lg:col-span-8">
            <PipelineChart stageCounts={metrics?.stageCounts || {}} />
          </div>

          {/* Tasks Widget - Takes 4 columns */}
          <div className="col-span-12 lg:col-span-4">
            <TasksWidget tasks={tasks || []} isLoading={tasksLoading} />
          </div>
        </div>

        {/* Content Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Recent Contacts - Takes 8 columns */}
          <div className="col-span-12 lg:col-span-8">
            <RecentContacts contacts={recentContacts || []} isLoading={contactsLoading} />
          </div>

          {/* Activity Feed - Takes 4 columns */}
          <div className="col-span-12 lg:col-span-4">
            <ActivityFeed activities={activities || []} isLoading={activitiesLoading} />
          </div>
        </div>

        {/* Companies Row */}
        <TopCompanies companies={topCompanies || []} isLoading={companiesLoading} />
      </main>
    </div>
  );
};