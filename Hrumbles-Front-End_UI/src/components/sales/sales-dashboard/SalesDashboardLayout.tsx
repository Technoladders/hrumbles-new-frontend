// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/SalesDashboardLayout.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Bell, 
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Users,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  CheckSquare,
  StickyNote,
  Target,
  Award,
  Zap
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

// Dashboard Components
import { MetricCard } from './MetricCard';
import { ActivityChart } from './ActivityChart';
import { PerformanceChart } from './PerformanceChart';
import { TeamLeaderboard } from './TeamLeaderboard';
import { UpcomingTasks } from './UpcomingTasks';
import { RecentActivities } from './RecentActivities';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ConversionFunnel } from './ConversionFunnel';
import { MiniSparkline } from './MiniSparkline';
import { EmployeeSelector } from './EmployeeSelector';

// Styles
import './dashboard.css';

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'all';

export const SalesDashboardLayout: React.FC = () => {
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);
  
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  console.log("userrole", userRole)

console.log("Full user from Redux:", user);
console.log("Full userRole from Redux:", userRole);
console.log("userRole?.name:", userRole?.name);

const isAdmin = useMemo(() => {
  if (typeof userRole !== 'string') return false;

  const role = userRole
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');   // handles spaces if they ever appear

  console.log('Normalized role string:', role);
  console.log('isAdmin:', role === 'organization_superadmin');

  return role === 'organization_superadmin';
}, [userRole]);

  // Get date range filter
  const getDateFilter = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return format(now, 'yyyy-MM-dd');
      case 'week':
        return format(startOfWeek(now), 'yyyy-MM-dd');
      case 'month':
        return format(startOfMonth(now), 'yyyy-MM-dd');
      case 'quarter':
        return format(startOfQuarter(now), 'yyyy-MM-dd');
      default:
        return null;
    }
  }, [dateRange]);

  // =====================
  // DATA QUERIES
  // =====================

  // Fetch team members (for admin view)
const { data: teamMembers } = useQuery({
  // It is good practice to add the filter to the queryKey so it caches separately
  queryKey: ['team-members', organizationId, 'sales-marketing'], 
  queryFn: async () => {
    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        profile_picture_url, 
        role_id, 
        hr_roles(name), 
        hr_departments!inner(name)
      `) // <--- Note the !inner here
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      // Filter by the nested relationship column
      .eq('hr_departments.name', 'Sales & Marketing'); 

    if (error) throw error;
    return data;
  },
  enabled: !!organizationId && isAdmin
});

  // Fetch activities with filters
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
    queryKey: ['dashboard-activities', organizationId, dateRange, selectedEmployee],
    queryFn: async () => {
      let query = supabase
        .from('contact_activities')
        .select(`
          *,
          contact:contact_id(id, name, email, photo_url, company_id, companies(name)),
          creator:created_by(id, first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organizationId)
        .neq('type', 'stage_change')
        .order('created_at', { ascending: false });

      // Date filter
      if (getDateFilter) {
        query = query.gte('created_at', getDateFilter);
      }

      // Employee filter (for admin) or current user (for employee)
      if (!isAdmin) {
        query = query.eq('created_by', user?.id);
      } else if (selectedEmployee) {
        query = query.eq('created_by', selectedEmployee);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Fetch tasks (upcoming & overdue)
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks', organizationId, selectedEmployee],
    queryFn: async () => {
      let query = supabase
        .from('contact_activities')
        .select(`
          *,
          contact:contact_id(id, name, email, photo_url),
          creator:created_by(id, first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organizationId)
        .eq('type', 'task')
        .eq('is_completed', false)
        .order('due_date', { ascending: true });

      if (!isAdmin) {
        query = query.or(`created_by.eq.${user?.id},assigned_to.eq.${user?.id}`);
      } else if (selectedEmployee) {
        query = query.or(`created_by.eq.${selectedEmployee},assigned_to.eq.${selectedEmployee}`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Fetch contacts count
  const { data: contactsStats } = useQuery({
    queryKey: ['dashboard-contacts', organizationId, dateRange],
    queryFn: async () => {
      // Total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // New contacts this period
      let newContactsQuery = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      if (getDateFilter) {
        newContactsQuery = newContactsQuery.gte('created_at', getDateFilter);
      }
      const { count: newContacts } = await newContactsQuery;

      // Enriched contacts
      const { count: enrichedContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .not('apollo_person_id', 'is', null);

      // Contacts by stage
      const { data: stageData } = await supabase
        .from('contacts')
        .select('stage')
        .eq('organization_id', organizationId);

      const stageCounts = stageData?.reduce((acc: any, c: any) => {
        const stage = c.stage || 'lead';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        total: totalContacts || 0,
        new: newContacts || 0,
        enriched: enrichedContacts || 0,
        stageCounts
      };
    },
    enabled: !!organizationId
  });

  // Fetch companies count
  const { data: companiesStats } = useQuery({
    queryKey: ['dashboard-companies', organizationId],
    queryFn: async () => {
      const { count } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      return count || 0;
    },
    enabled: !!organizationId
  });

  // =====================
  // COMPUTED METRICS
  // =====================

  const metrics = useMemo(() => {
    if (!activities) return null;

    const activityCounts = activities.reduce((acc: any, a: any) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    const completedTasks = activities.filter((a: any) => a.type === 'task' && a.is_completed).length;
    const totalTasks = activities.filter((a: any) => a.type === 'task').length;

    // Group by employee for leaderboard
    const byEmployee = activities.reduce((acc: any, a: any) => {
      const empId = a.created_by;
      if (!acc[empId]) {
        acc[empId] = {
          id: empId,
          name: a.creator ? `${a.creator.first_name} ${a.creator.last_name}` : 'Unknown',
          avatar: a.creator?.profile_picture_url,
          activities: 0,
          calls: 0,
          emails: 0,
          meetings: 0,
          tasks: 0,
          notes: 0
        };
      }
      acc[empId].activities++;
      acc[empId][a.type + 's'] = (acc[empId][a.type + 's'] || 0) + 1;
      return acc;
    }, {});

    // Daily activity trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });


    const dailyTrend = last7Days.map(date => {
      const dayActivities = activities.filter((a: any) => 
        format(new Date(a.created_at), 'yyyy-MM-dd') === date
      );
      return {
        date,
        label: format(parseISO(date), 'EEE'),
        total: dayActivities.length,
        calls: dayActivities.filter((a: any) => a.type === 'call').length,
        emails: dayActivities.filter((a: any) => a.type === 'email').length,
        meetings: dayActivities.filter((a: any) => a.type === 'meeting').length,
      };
    });

    // Activity by type for pie/donut chart
   const activityByType = Object.entries(activityCounts)
      // FILTER HERE: Exclude 'task' and 'note'
      .filter(([type]) => type !== 'task' && type !== 'note') 
      .map(([type, count]) => ({
        type,
        count: count as number,
        color: getActivityColor(type)
      }));

    return {
      total: activities.length,
      calls: activityCounts.call || 0,
      emails: activityCounts.email || 0,
      meetings: activityCounts.meeting || 0,
      tasks: activityCounts.task || 0,
      notes: activityCounts.note || 0,
      completedTasks,
      totalTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      byEmployee: Object.values(byEmployee).sort((a: any, b: any) => b.activities - a.activities),
      dailyTrend,
      activityByType
    };
  }, [activities]);
    console.log("metrics", metrics)

  // Pending tasks
  const pendingTasks = useMemo(() => {
    if (!tasks) return { overdue: [], today: [], upcoming: [] };
    
    const now = new Date();
    return {
      overdue: tasks.filter((t: any) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))),
      today: tasks.filter((t: any) => t.due_date && isToday(parseISO(t.due_date))),
      upcoming: tasks.filter((t: any) => t.due_date && !isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
    };
  }, [tasks]);

  // =====================
  // LOADING STATE
  // =====================

  if (activitiesLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-8 h-80 rounded-xl" />
          <Skeleton className="col-span-4 h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Sales Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isAdmin ? 'Team Performance Overview' : 'Your Performance Overview'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 h-9 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                <SelectTrigger className="w-36 h-9 bg-gray-50 border-gray-200">
                  <Calendar size={14} className="mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {/* Employee Selector (Admin only) */}
              {isAdmin && teamMembers && (
                <EmployeeSelector
                  employees={teamMembers}
                  selectedEmployee={selectedEmployee}
                  onSelect={setSelectedEmployee}
                />
              )}

              {/* Refresh */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={() => refetchActivities()}
              >
                <RefreshCw size={14} className="mr-2" />
                Refresh
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
                <Bell size={18} className="text-gray-600" />
                {pendingTasks.overdue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {pendingTasks.overdue.length}
                  </span>
                )}
              </Button>

              {/* User Avatar */}
              <Avatar className="h-9 w-9 border-2 border-blue-100">
                <AvatarImage src={user?.profile_picture_url} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Activities"
            value={metrics?.total || 0}
            icon={<Zap className="text-blue-600" size={20} />}
            trend={12}
            trendLabel="vs last period"
            color="blue"
            sparklineData={metrics?.dailyTrend.map(d => d.total) || []}
          />
          <MetricCard
            title="Calls Made"
            value={metrics?.calls || 0}
            icon={<Phone className="text-amber-600" size={20} />}
            trend={8}
            color="amber"
            sparklineData={metrics?.dailyTrend.map(d => d.calls) || []}
          />
          <MetricCard
            title="Emails Sent"
            value={metrics?.emails || 0}
            icon={<Mail className="text-indigo-600" size={20} />}
            trend={-3}
            color="indigo"
            sparklineData={metrics?.dailyTrend.map(d => d.emails) || []}
          />
          <MetricCard
            title="Meetings"
            value={metrics?.meetings || 0}
            icon={<Calendar className="text-green-600" size={20} />}
            trend={15}
            color="green"
            sparklineData={metrics?.dailyTrend.map(d => d.meetings) || []}
          />
          <MetricCard
            title="Tasks Completed"
            value={`${metrics?.taskCompletionRate || 0}%`}
            icon={<CheckSquare className="text-emerald-600" size={20} />}
            subtitle={`${metrics?.completedTasks || 0}/${metrics?.totalTasks || 0} tasks`}
            color="emerald"
          />
          <MetricCard
            title="Total Contacts"
            value={contactsStats?.total || 0}
            icon={<Users className="text-violet-600" size={20} />}
            subtitle={`+${contactsStats?.new || 0} new`}
            color="violet"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Activity Trend Chart */}
          <div className="col-span-12 lg:col-span-8">
            <ActivityChart 
              data={metrics?.dailyTrend || []}
              title="Activity Trend"
            />
          </div>

          {/* Activity Breakdown */}
          <div className="col-span-12 lg:col-span-4">
            <PerformanceChart 
              data={metrics?.activityByType || []}
              title="Activity Breakdown"
            />
          </div>

          {/* Tasks Section */}
          <div className="col-span-12 lg:col-span-4">
            <UpcomingTasks 
              overdue={pendingTasks.overdue}
              today={pendingTasks.today}
              upcoming={pendingTasks.upcoming}
            />
          </div>

          {/* Recent Activities */}
          <div className="col-span-12 lg:col-span-4">
            <RecentActivities 
              activities={activities?.slice(0, 10) || []}
            />
          </div>

          {/* Conversion Funnel or Team Leaderboard */}
          <div className="col-span-12 lg:col-span-4">
            {isAdmin ? (
              <TeamLeaderboard 
                data={metrics?.byEmployee || []}
              />
            ) : (
              <ConversionFunnel 
                stageCounts={contactsStats?.stageCounts || {}}
              />
            )}
          </div>

          {/* Activity Heatmap (Full Width) */}
          {isAdmin && (
            <div className="col-span-12">
              <ActivityHeatmap 
                activities={activities || []}
                teamMembers={teamMembers || []}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for activity colors
function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    call: '#F59E0B',
    email: '#6366F1',
    meeting: '#10B981',
    task: '#8B5CF6',
    note: '#EC4899'
  };
  return colors[type] || '#6B7280';
}

export default SalesDashboardLayout;