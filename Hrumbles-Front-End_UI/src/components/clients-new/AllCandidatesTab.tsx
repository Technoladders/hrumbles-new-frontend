// src/components/clients-new/AllCandidatesTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import supabase from '@/config/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid } from 'date-fns';
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sigma, BarChart2, Star, Tag, User, Loader2, GitMerge, UserCheck, Crown } from 'lucide-react';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Type Definitions ---
interface Candidate { id: string; name: string; created_at: string; main_status_id: string | null; sub_status_id: string | null; job_title: string | null; recruiter_name: string | null; client_name: string | null; current_salary: number | null; expected_salary: number | null; location: string | null; notice_period: string | null; overall_score: number | null; job_id: string; }
interface StatusMap { [key: string]: string; }
interface GroupedData { [statusName: string]: Candidate[]; }
interface TableRowData { type: 'header' | 'data'; statusName?: string; count?: number; candidate?: Candidate; }
interface RecruiterPerformance { name: string; hires: number; }
interface PipelineStage { stage: string; count: number; }

// --- CONSTANTS FOR CALCULATION ---
const INTERVIEW_STATUS_ID = "f72e13f8-7825-4793-85e0-e31d669f8097";
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const OFFER_ISSUED_SUB_STATUS_ID = "bcc84d3b-fb76-4912-86cc-e95448269d6b";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";
const JOINED_SUB_STATUS_ID = "c9716374-3477-4606-877a-dfa5704e7680";


// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined) => (value == null) ? 'N/A' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const formatValue = (value: any) => (value != null) ? String(value) : 'N/A';
const formatDate = (date: string) => isValid(new Date(date)) ? format(new Date(date), 'MMM d, yyyy') : date;
const getScoreBadgeClass = (score: number | null | undefined): string => { if (score == null) return 'bg-gray-100 text-gray-800'; if (score > 80) return 'bg-green-100 text-green-800'; if (score > 50) return 'bg-amber-100 text-amber-800'; return 'bg-red-100 text-red-800'; };

// --- Reusable Analytics Card Component (Updated) ---
const AnalyticsCard: React.FC<{ icon: React.ElementType; title: string; value: string | number; subMetrics?: { label: string; value: string | number }[]; }> = ({ icon: Icon, title, value, subMetrics }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
    <CardContent className="p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        {/* Render main value only if it's not empty */}
        {value && <div className="mt-2"><h3 className="text-3xl font-bold text-gray-800 truncate" title={String(value)}>{value}</h3></div>}
      </div>
      {subMetrics && subMetrics.length > 0 && (
        <div className={`mt-0 pt-2 border-t border-gray-200 flex items-start ${value ? 'justify-between' : 'justify-around'} text-center`}>
          {subMetrics.map((metric) => (
              <div key={metric.label} className="flex-1 min-w-0 px-1">
                <p className="text-xs text-gray-500">{metric.label}</p>
                <TooltipProvider>
                  <ShadTooltip>
                    <TooltipTrigger asChild>
                      <p className="text-md font-bold text-gray-800 truncate cursor-default">{metric.value}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{metric.value}</p>
                    </TooltipContent>
                  </ShadTooltip>
                </TooltipProvider>
              </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// --- Main Component ---
interface AllCandidatesTabProps {
  clientName: string;
  dateRange: { startDate: Date; endDate: Date; key: string } | null;
}

const AllCandidatesTab: React.FC<AllCandidatesTabProps> = ({ clientName, dateRange }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [recruiterOptions, setRecruiterOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !clientName) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data: jobs, error: jobsError } = await supabase.from('hr_jobs').select('id').eq('organization_id', organizationId).eq('client_owner', clientName);
        if (jobsError) throw jobsError;
        if (!jobs || jobs.length === 0) { setCandidates([]); return; }
        const jobIds = jobs.map(job => job.id);
        
        let candidatesQuery = supabase.from('hr_job_candidates').select(`
            id, name, created_at, main_status_id, sub_status_id, metadata, job_id,
            job:hr_jobs!hr_job_candidates_job_id_fkey(title),
            recruiter:created_by(first_name, last_name),
            analysis:candidate_resume_analysis!candidate_id(overall_score)
          `).eq('organization_id', organizationId).in('job_id', jobIds);
        if (dateRange?.startDate && dateRange.endDate) {
            candidatesQuery = candidatesQuery.gte('created_at', format(dateRange.startDate, 'yyyy-MM-dd')).lte('created_at', format(dateRange.endDate, 'yyyy-MM-dd'));
        }

        const [candidatesResponse, statusesResponse] = await Promise.all([
          candidatesQuery.order('created_at', { ascending: false }),
          supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId),
        ]);

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
         // --- MODIFIED FORMATTING ---
        const formattedCandidates: Candidate[] = (candidatesResponse.data as any[]).map(c => ({
          id: c.id, job_id: c.job_id, name: c.name, created_at: c.created_at, main_status_id: c.main_status_id, sub_status_id: c.sub_status_id, metadata: c.metadata,
          job_title: c.job?.title || 'N/A', 
          recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A', 
          client_name: clientName, 
          current_salary: c.metadata?.currentSalary, // From metadata
          expected_salary: c.metadata?.expectedSalary, // From metadata
          location: c.metadata?.currentLocation, // From metadata
          notice_period: c.metadata?.noticePeriod, // From metadata
          overall_score: c.analysis?.[0]?.overall_score || null, // From joined table
        }));
        setCandidates(formattedCandidates);
        const statusMap = statusesResponse.data.reduce((acc: StatusMap, status) => { acc[status.id] = status.name; return acc; }, {});
        setStatuses(statusMap);
        const uniqueRecruiters = [...new Set(formattedCandidates.map(c => c.recruiter_name).filter(r => r && r !== 'N/A'))].sort();
        setRecruiterOptions(uniqueRecruiters);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, clientName, dateRange]);

  const filteredCandidates = useMemo(() => candidates.filter(c => {
    const statusName = statuses[c.sub_status_id || ''] || 'Uncategorized';
    return (statusFilter === 'all' || statusName === statusFilter) &&
           (recruiterFilter === 'all' || c.recruiter_name === recruiterFilter) &&
           (!searchTerm || (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) || c.recruiter_name?.toLowerCase().includes(searchTerm.toLowerCase())));
  }), [candidates, searchTerm, statuses, statusFilter, recruiterFilter]);

  console.log("filteredCandidates", filteredCandidates)


    // --- UPDATED ANALYTICS LOGIC ---
  const { analytics, pipelineStages, recruiterPerformance } = useMemo(() => {
    const stageCounts: { [key: string]: number } = {}; let scoreSum = 0; let scoreCount = 0;
    const recruiterProfiles: { [key: string]: number } = {}; const recruiterConversions: { [key: string]: number } = {}; const recruiterJoins: { [key: string]: number } = {};
    let convertedCount = 0; let joinedCount = 0;
    const conversionStatuses = [INTERVIEW_STATUS_ID, OFFERED_STATUS_ID, JOINED_STATUS_ID];

    filteredCandidates.forEach(c => {
      const mainStatusName = statuses[c.main_status_id || ''] || 'Sourced';
      stageCounts[mainStatusName] = (stageCounts[mainStatusName] || 0) + 1;
      if (c.overall_score != null) { scoreSum += c.overall_score; scoreCount++; }
      if (c.recruiter_name && c.recruiter_name !== 'N/A') { 
          recruiterProfiles[c.recruiter_name] = (recruiterProfiles[c.recruiter_name] || 0) + 1;
          if (c.main_status_id && conversionStatuses.includes(c.main_status_id)) { recruiterConversions[c.recruiter_name] = (recruiterConversions[c.recruiter_name] || 0) + 1; }
          if (c.main_status_id === JOINED_STATUS_ID && c.sub_status_id === JOINED_SUB_STATUS_ID) { recruiterJoins[c.recruiter_name] = (recruiterJoins[c.recruiter_name] || 0) + 1; }
      }
      if (c.main_status_id && conversionStatuses.includes(c.main_status_id)) { convertedCount++; }
      if (c.main_status_id === JOINED_STATUS_ID && c.sub_status_id === JOINED_SUB_STATUS_ID) { joinedCount++; }
    });
    
    const getTopPerformer = (counts: { [key: string]: number }) => Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0] || 'N/A';
    
    return {
        analytics: {
            totalCandidates: filteredCandidates.length, convertedCount, joinedCount,
            conversionRate: filteredCandidates.length > 0 ? `${((convertedCount / filteredCandidates.length) * 100).toFixed(1)}%` : '0.0%',
            joinedRate: filteredCandidates.length > 0 ? `${((joinedCount / filteredCandidates.length) * 100).toFixed(1)}%` : '0.0%',
            averageScore: scoreCount > 0 ? (scoreSum / scoreCount).toFixed(0) : 'N/A',
            topProfilesRecruiter: getTopPerformer(recruiterProfiles),
            topConvertedRecruiter: getTopPerformer(recruiterConversions),
            topJoinedRecruiter: getTopPerformer(recruiterJoins),
        },
        pipelineStages: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
        recruiterPerformance: Object.entries(recruiterProfiles).map(([name, hires]) => ({ name, hires })).sort((a,b) => b.hires - a.hires)
    };
  }, [filteredCandidates, statuses]);

  const groupedBySubStatus = useMemo<GroupedData>(() => filteredCandidates.reduce((acc: GroupedData, c) => { const s = statuses[c.sub_status_id || ''] || 'Uncategorized'; if (!acc[s]) acc[s] = []; acc[s].push(c); return acc; }, {}), [filteredCandidates, statuses]);
  const tableRows = useMemo<TableRowData[]>(() => !isGrouped ? filteredCandidates.map(c => ({ type: 'data', candidate: c, statusName: statuses[c.sub_status_id || ''] || 'Uncategorized' })) : Object.entries(groupedBySubStatus).sort((a, b) => a[0].localeCompare(b[0])).flatMap(([s, g]) => [{ type: 'header', statusName: s, count: g.length }, ...expandedGroups.includes(s) ? g.map(c => ({ type: 'data', candidate: c, statusName: s })) : []]), [isGrouped, filteredCandidates, groupedBySubStatus, expandedGroups, statuses]);
  const totalPages = Math.ceil(tableRows.length / itemsPerPage); const startIndex = (currentPage - 1) * itemsPerPage; const paginatedData = tableRows.slice(startIndex, startIndex + itemsPerPage);
 const exportToCSV = () => {
    if (filteredCandidates.length === 0) {
        alert("No data to export.");
        return;
    }
    const dataForExport = filteredCandidates.map(c => ({
      'Candidate Name': c.name,
      'Status': statuses[c.sub_status_id || ''] || 'Uncategorized',
      'AI Score': formatValue(c.overall_score),
      'Job Title': formatValue(c.job_title),
      'Client': formatValue(c.client_name),
      'Recruiter': formatValue(c.recruiter_name),
      'Applied Date': formatDate(c.created_at),
      'Current Salary': c.current_salary,
      'Expected Salary': c.expected_salary,
      'Notice Period': formatValue(c.notice_period),
      'Location': formatValue(c.location),
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${clientName}_candidate_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredCandidates.length === 0) {
        alert("No data to export.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableHead = [['Name', 'Status', 'Score', 'Job', 'Recruiter', 'Applied', 'CCTC', 'ECTC', 'Notice', 'Location']];
    const tableBody = filteredCandidates.map(c => [
      c.name,
      statuses[c.sub_status_id || ''] || 'Uncategorized',
      formatValue(c.overall_score),
      formatValue(c.job_title),
      formatValue(c.recruiter_name),
      formatDate(c.created_at),
      formatCurrency(c.current_salary),
      formatCurrency(c.expected_salary),
      formatValue(c.notice_period),
      formatValue(c.location),
    ]);

    doc.text(`Candidate Report for ${clientName}`, 14, 15);
    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [123, 67, 241] }, // Purple color
      columnStyles: { 0: { cellWidth: 30 }, 3: { cellWidth: 40 } } // Give more width to Name and Job Title
    });
    doc.save(`${clientName}_candidate_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const toggleGroup = (statusName: string) => setExpandedGroups(prev => prev.includes(statusName) ? prev.filter(g => g !== statusName) : [...prev, statusName]);
  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => { setter(value); setCurrentPage(1); };

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-600"/></div>;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-6 animate-fade-in bg-gray-50 p-6 rounded-lg">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard icon={Sigma} title="Total Candidates" value={analytics.totalCandidates} subMetrics={[{ label: 'Converted', value: analytics.convertedCount }, { label: 'Joined', value: analytics.joinedCount }]} />
        <AnalyticsCard icon={GitMerge} title="Conversion Rate" value={analytics.conversionRate} subMetrics={[{ label: 'Joined Rate', value: analytics.joinedRate }]} />
        <AnalyticsCard icon={Star} title="Average AI Score" value={analytics.averageScore} />
        <AnalyticsCard 
    icon={Crown} 
    title="Top Performers" 
    value="" // This is important to trigger the special layout
    subMetrics={[
        { label: 'Profiles', value: analytics.topProfilesRecruiter },
        { label: 'Converted', value: analytics.topConvertedRecruiter },
        { label: 'Joined', value: analytics.topJoinedRecruiter }
    ]} 
/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base font-semibold">Candidate Pipeline Stage</CardTitle></CardHeader>
            <CardContent>
                {pipelineStages.length > 2 ? (
                     <ResponsiveContainer width="100%" height={280}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={pipelineStages}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="stage" tick={{ fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                            <Radar name="Candidates" dataKey="count" stroke="#6366F1" fill="#818CF8" fillOpacity={0.6} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">Not enough pipeline data for chart.</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Pofiles by Recruiter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {recruiterPerformance.length > 0 ? recruiterPerformance.slice(0, 5).map(r => (
                    <div key={r.name}>
                        <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700">{r.name}</span><span className="text-gray-500">{r.hires} profiles</span></div>
                        <Progress value={(r.hires / recruiterPerformance[0].hires) * 100} className="h-1.5" />
                    </div>
                )) : <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">No recruiter data.</div>}
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Select value={statusFilter} onValueChange={onFilterChange(setStatusFilter)}><SelectTrigger><div className="flex items-center gap-2"><Tag size={16} className="text-gray-500" /><SelectValue placeholder="Filter by Status" /></div></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{Object.values(statuses).sort().map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select>
              <Select value={recruiterFilter} onValueChange={onFilterChange(setRecruiterFilter)}><SelectTrigger><div className="flex items-center gap-2"><User size={16} className="text-gray-500" /><SelectValue placeholder="Filter by Recruiter" /></div></SelectTrigger><SelectContent><SelectItem value="all">All Recruiters</SelectItem>{recruiterOptions.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="relative flex-grow w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><Input placeholder="Search by name, job, recruiter..." className="pl-10 h-10" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></div>
            <Button variant="outline" onClick={() => setIsGrouped(!isGrouped)} className="w-full sm:w-auto">{isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />} {isGrouped ? 'Ungroup' : 'Group'}</Button>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportToCSV}><Download className="w-4 h-4 mr-2" />CSV</Button><Button variant="outline" size="sm" onClick={exportToPDF}><Download className="w-4 h-4 mr-2" />PDF</Button></div>
          </div>
          <div className="rounded-md border overflow-x-auto"><Table>
              <TableHeader><TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="w-[200px]">Candidate</TableHead><TableHead>Status</TableHead><TableHead>AI Score</TableHead><TableHead>Job Title</TableHead><TableHead>Recruiter</TableHead><TableHead>Applied</TableHead><TableHead>CCTC</TableHead><TableHead>ECTC</TableHead><TableHead>Notice</TableHead><TableHead>Location</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? paginatedData.map((row) => {
                  if (row.type === 'header') return (<TableRow key={row.statusName} className="bg-gray-100"><TableCell colSpan={10} className="font-bold"><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => toggleGroup(row.statusName!)} className="p-0 h-6 w-6">{expandedGroups.includes(row.statusName!) ? <ChevronUp /> : <ChevronDown />}</Button>{row.statusName} <Badge variant="secondary">{row.count}</Badge></div></TableCell></TableRow>);
                  const { candidate, statusName } = row;
                  return (
                    <TableRow key={candidate!.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium"><Link to={`/candidates/${candidate!.id}/${candidate!.job_id}`} className="text-purple-600 hover:underline">{candidate!.name}</Link></TableCell>
                      <TableCell>{statusName}</TableCell>
                      <TableCell><Badge className={getScoreBadgeClass(candidate!.overall_score)}>{formatValue(candidate!.overall_score)}</Badge></TableCell>
                      <TableCell><Link to={`/jobs/${candidate!.job_id}`} className="hover:underline">{formatValue(candidate!.job_title)}</Link></TableCell>
                      <TableCell>{formatValue(candidate!.recruiter_name)}</TableCell>
                      <TableCell>{formatDate(candidate!.created_at)}</TableCell>
                      <TableCell>{formatCurrency(candidate!.current_salary)}</TableCell>
                      <TableCell>{formatCurrency(candidate!.expected_salary)}</TableCell>
                      <TableCell>{formatValue(candidate!.notice_period)}</TableCell>
                      <TableCell>{formatValue(candidate!.location)}</TableCell>
                    </TableRow>
                  );
                }) : <TableRow><TableCell colSpan={10} className="h-24 text-center">No candidates found matching your criteria.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-600">Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, tableRows.length)} of {tableRows.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft/></Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight/></Button>
              </div>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCandidatesTab;