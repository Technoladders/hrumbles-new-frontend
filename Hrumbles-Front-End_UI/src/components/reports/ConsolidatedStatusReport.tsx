// src/components/reports/ConsolidatedStatusReport.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePickerField } from './DateRangePickerField';
import { format } from 'date-fns';
import { AlertCircle, Layers, List } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// --- Type Definitions ---
interface Candidate {
  id: string;
  name: string;
  applied_date: string;
  updated_at: string;
  main_status_id: string | null;
  sub_status_id: string | null;
  job_title: string | null;
  recruiter_name: string | null;
}

interface StatusMap { [key: string]: string; }
interface GroupedData { [statusName: string]: Candidate[]; }
type TableRowData = (Candidate & { type: 'data' }) | { type: 'groupHeader'; name: string; count: number };

// --- Chart Colors ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}`}</p>
        <p className="text-muted-foreground">{`Candidates: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// --- Main Component ---
const ConsolidatedStatusReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- UI State & Filters ---
  const [isGrouped, setIsGrouped] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [candidatesResponse, statusesResponse] = await Promise.all([
          supabase
            .from('hr_job_candidates')
            .select(
              `
              id, name, applied_date, updated_at, main_status_id, sub_status_id,
              job:hr_jobs!hr_job_candidates_job_id_fkey(title),
              recruiter:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name)
            `
            )
            .eq('organization_id', organizationId)
            .gte('updated_at', dateRange.startDate.toISOString())
            .lte('updated_at', dateRange.endDate.toISOString())
            .order('updated_at', { ascending: false }),
          supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId),
        ]);

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
        const formattedCandidates: Candidate[] = candidatesResponse.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          applied_date: c.applied_date,
          updated_at: c.updated_at,
          sub_status_id: c.sub_status_id,
          job_title: c.job?.title || 'N/A',
          recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}` : 'N/A',
        }));
        setCandidates(formattedCandidates);

        const statusMap = statusesResponse.data.reduce((acc: StatusMap, status) => {
          acc[status.id] = status.name;
          return acc;
        }, {});
        setStatuses(statusMap);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, dateRange]);

  // --- Memoized Data Transformations ---
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c =>
      Object.values(c).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [candidates, searchTerm]);

  const groupedBySubStatus = useMemo<GroupedData>(() => {
    return filteredCandidates.reduce((acc: GroupedData, candidate) => {
      const statusId = candidate.sub_status_id;
      const statusName = statusId ? statuses[statusId] || 'Unknown Status' : 'Uncategorized';
      if (!acc[statusName]) acc[statusName] = [];
      acc[statusName].push(candidate);
      return acc;
    }, {});
  }, [filteredCandidates, statuses]);

  const chartData = useMemo(() => {
    return Object.entries(groupedBySubStatus)
      .map(([name, group]) => ({ name, value: group.length }))
      .sort((a, b) => b.value - a.value);
  }, [groupedBySubStatus]);

  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) {
      return filteredCandidates.map(c => ({ ...c, type: 'data' }));
    }
    return Object.entries(groupedBySubStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([statusName, candidatesInGroup]) => [
        { type: 'groupHeader', name: statusName, count: candidatesInGroup.length },
        ...candidatesInGroup.map(c => ({ ...c, type: 'data' as const })),
      ]);
  }, [isGrouped, filteredCandidates, groupedBySubStatus]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Consolidated Candidate Status Report</CardTitle>
          <CardDescription>
            Analyze candidate distribution by status. Data reflects last updates within the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Input
              placeholder="Search anything..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Button variant="outline" onClick={() => setIsGrouped(!isGrouped)}>
              {isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />}
              {isGrouped ? 'Ungroup' : 'Group by Status'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- Charts Column --- */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Candidates per Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                  <Bar dataKey="value" name="Candidates" barSize={20}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* --- Table Column --- */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Candidate Details</CardTitle>
            <CardDescription>
              Total Candidates Found: {filteredCandidates.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[700px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-20">
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-[250px]">Candidate Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Recruiter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length > 0 ? (
                  tableRows.map((row, index) =>
                    row.type === 'groupHeader' ? (
                      <TableRow key={`header-${row.name}`} className="bg-muted hover:bg-muted">
                        <TableCell colSpan={4} className="font-semibold text-primary">
                          {row.name} <Badge variant="secondary">{row.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        <TableCell className="sticky left-0 bg-background/95 backdrop-blur-sm font-medium">{row.name}</TableCell>
                        <TableCell>{row.job_title}</TableCell>
                        <TableCell>{format(new Date(row.updated_at), 'PPP')}</TableCell>
                        <TableCell>{row.recruiter_name}</TableCell>
                      </TableRow>
                    )
                  )
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No results found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsolidatedStatusReport;