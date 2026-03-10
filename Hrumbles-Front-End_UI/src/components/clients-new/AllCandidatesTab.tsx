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
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sigma, BarChart2, Star, Tag, User, Loader2, GitMerge, UserCheck, Crown, Calendar, Clock, MessageSquare } from 'lucide-react';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Type Definitions ---
interface Candidate { id: string; name: string; created_at: string; main_status_id: string | null; sub_status_id: string | null; job_title: string | null; recruiter_name: string | null; client_name: string | null; current_salary: number | null; expected_salary: number | null; location: string | null; notice_period: string | null; overall_score: number | null; job_id: string; metadata: any; interview_date?: string | null; interview_time?: string | null; interview_feedback?: string | null; }interface StatusMap {[key: string]: string; }
interface GroupedData { [statusName: string]: Candidate[]; }
interface TableRowData { type: 'header' | 'data'; statusName?: string; count?: number; candidate?: Candidate; }
interface RecruiterPerformance { name: string; hires: number; }
interface PipelineStage { stage: string; count: number; }

// --- CONSTANTS FOR CALCULATION ---
const STATUS_CONFIG = {
  default: {
    INTERVIEW_MAIN_STATUS_ID: "f72e13f8-7825-4793-85e0-e31d669f8097",
    INTERVIEW_SCHEDULED_SUB_STATUS_IDS:["4ab0c42a-4748-4808-8f29-e57cb401bde5", "a8eed1eb-f903-4bbf-a91b-e347a0f7c43f", "1de35d8a-c07f-4c1d-b185-12379f559286", "0cc92be8-c8f1-47c6-a38d-3ca04eca6bb8", "48e060dc-5884-47e5-85dd-d717d4debe40"],
    INTERVIEW_RESCHEDULED_SUB_STATUS_IDS:["00601f51-90ec-4d75-8ced-3225fed31643", "9ef38a36-cffa-4286-9826-bc7d736a04ce", "2c38a0fb-8b56-47bf-8c7e-e4bd19b68fdf", "d2aef2b3-89b4-4845-84f0-777b6adf9018", "e569facd-7fd0-48b9-86cd-30062c80260b"],
    INTERVIEW_OUTCOME_SUB_STATUS_IDS:["1930ab52-4bb4-46a2-a9d1-887629954868", "e5615fa5-f60c-4312-9f6b-4ed543541520", "258741d9-cdb1-44fe-8ae9-ed5e9eed9e27", "0111b1b9-23c9-4be1-8ad4-322ccad6ccf0", "11281dd5-5f33-4d5c-831d-2488a5d3c96e", "31346b5c-1ff4-4842-aab4-645b36b6197a", "1ce3a781-09c7-4b3f-9a58-e4c6cd02721a", "4694aeff-567b-4007-928e-b3fefe558daf", "5b59c8cb-9a6a-43b8-a3cd-8f867c0b30a2", "368aa85f-dd4a-45b5-9266-48898704839b"],
    JOINED_STATUS_ID: "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e",
    OFFERED_STATUS_ID: "9d48d0f9-8312-4f60-aaa4-bafdce067417",
    JOINED_SUB_STATUS_ID: "c9716374-3477-4606-877a-dfa5704e7680",
  },
  demo: { // organization_id: 53989f03-bdc9-439a-901c-45b274eff506
    INTERVIEW_MAIN_STATUS_ID: "6f5a6a77-ab6a-46ca-b659-fd207b22ae0d",
    INTERVIEW_SCHEDULED_SUB_STATUS_IDS:["84e97908-3a51-4ccd-82c3-ec2ebcc17757", "97e76257-b0c8-4935-8bae-2ef4097d776f", "531a2ca1-551f-43f4-9eb4-cb293f4f7517", "74cba87d-b193-44d0-9ac6-9c378ef971b2", "4a13bb3c-cf3b-45d4-9d80-f9d9c3d4d7d1"],
    INTERVIEW_RESCHEDULED_SUB_STATUS_IDS:["72711a0d-5060-4eb9-8a68-6558e73d013d", "708424a6-5d24-4905-a275-f3d3e0519914", "59e371e3-455c-4cf1-912e-aab38872ebad", "7f468dd7-30af-4632-97b9-7668cbd847e0", "c5f48189-07ed-49a8-985b-0a98b46ca831"],
    INTERVIEW_OUTCOME_SUB_STATUS_IDS:["fc3acdf6-48f7-4a9f-98fa-bd29d72ed118", "ebb88495-1a66-48d4-afe9-d45cabeecac3", "a8f533cf-5e68-4a86-96eb-c519a48aef1f", "385af9cb-4ae6-49b7-b5a8-45b653ca0c78", "3cca7b15-6b26-470b-b086-406d401c8c28", "743fd5ed-2ebf-45b3-8703-d0114b3607ae", "d9798bab-c375-4748-937a-abb739c5c82a", "fdd2c99c-29a6-4fad-8a58-ad9c3d30d7c5", "5aabfefe-e426-4bf1-b037-0eca402a1a4b", "3f797fc6-caef-48fd-9aa0-3d1fba010168"],
    JOINED_STATUS_ID: "5ab8833c-c409-46b8-a6b0-dbf23591827b",
    OFFERED_STATUS_ID: "0557a2c9-6c27-46d5-908c-a826b82a6c47",
    JOINED_SUB_STATUS_ID: "247ef818-9fbe-41ee-a755-a446d620ebb6",
  },
  ample: { // organization_id: e032d8c5-2168-4083-9919-c2e09719550a
    INTERVIEW_MAIN_STATUS_ID: "da3fbfcb-f06b-4ed5-bea7-fd3cc83574ec",
    INTERVIEW_SCHEDULED_SUB_STATUS_IDS:["3f6d2b70-1bef-458f-9159-1fccbff6a7da", "af109127-7551-4a8b-9f8d-540677031e6c", "265e8b74-f119-48a9-8287-12681e2ca85a", "c99881c4-5187-4671-ace5-bc7f843a8e3d", "e4c869bf-6d02-44e7-9104-d5e71a7dbe02"],
    INTERVIEW_RESCHEDULED_SUB_STATUS_IDS:["55f56dd7-4a92-4b51-be2b-6d2f9bc6827d", "d8a786cb-45d7-45f5-9792-36a791ffab4a", "a20be41a-8f16-4a3d-bc74-4022187aaf01", "73ac9fb4-7589-48d6-834f-499a49cda2df", "ea8b2079-55a3-4104-910b-b73734533791"],
    INTERVIEW_OUTCOME_SUB_STATUS_IDS:["7206549a-2614-4e43-a607-c1fe62f19a98", "e2fe5bb5-e5dd-43a7-910d-60d898544a8d", "60e64b4b-59bf-42c8-a2fe-6c9845002dc7", "6eccd385-d4a6-48b9-a2cd-81ad6c681469", "07b22796-dd81-4bc5-930d-3e3442a5294f", "803dbde0-1757-423d-b68f-56aaaf7149ab", "40a98037-ce72-402c-b0da-ca578902fd10", "40e3139a-d220-4c7d-8743-1edc21dd7c2d", "e352c699-13de-4765-8e83-1df563b6f488", "e1104e37-7dcd-44fd-af27-b7f574a8bd90"],
    JOINED_STATUS_ID: "c86f65ab-b122-476c-8d5b-f6ff1ca8147b",
    OFFERED_STATUS_ID: "bf2f3bf1-c1a0-417c-9c26-53083b5888ce",
    JOINED_SUB_STATUS_ID: "d1537afc-0b75-454d-ba37-dd2bd4acaf2d",
  }
};
const DEMO_ORGANIZATION_ID = '53989f03-bdc9-439a-901c-45b274eff506';
const AMPLE_ORGANIZATION_ID = 'e032d8c5-2168-4083-9919-c2e09719550a';

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined) => (value == null) ? 'N/A' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const formatValue = (value: any) => (value != null && value !== '') ? String(value) : 'N/A';
const formatDate = (date: string) => isValid(new Date(date)) ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
const getScoreBadgeClass = (score: number | null | undefined): string => { if (score == null) return 'bg-gray-100 text-gray-800'; if (score > 80) return 'bg-green-100 text-green-800'; if (score > 50) return 'bg-amber-100 text-amber-800'; return 'bg-red-100 text-red-800'; };
const formatTime = (time?: string | null) => {
  if (!time || typeof time !== 'string') return '';
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
    return format(date, 'h:mm a'); 
  } catch {
    return time; 
  }
};

// --- Reusable Analytics Card Component ---
const AnalyticsCard: React.FC<{ icon: React.ElementType; title: string; value: string | number; subMetrics?: { label: string; value: string | number }[]; }> = ({ icon: Icon, title, value, subMetrics }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
    <CardContent className="p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
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
  
  // Dynamic State initialization for statuses
  const[dynamicStatusIds, setDynamicStatusIds] = useState(STATUS_CONFIG.default);
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const[searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const[recruiterOptions, setRecruiterOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const[expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // --- STATUS CELL COMPONENT ---
  const StatusCell: React.FC<{ candidate: Candidate; statusName: string }> = ({ candidate, statusName }) => {
    const isScheduled = candidate.main_status_id === dynamicStatusIds.INTERVIEW_MAIN_STATUS_ID && candidate.sub_status_id && (dynamicStatusIds.INTERVIEW_SCHEDULED_SUB_STATUS_IDS.includes(candidate.sub_status_id));
    const isRescheduled = candidate.main_status_id === dynamicStatusIds.INTERVIEW_MAIN_STATUS_ID && candidate.sub_status_id && dynamicStatusIds.INTERVIEW_RESCHEDULED_SUB_STATUS_IDS.includes(candidate.sub_status_id);
    const isOutcome = candidate.main_status_id === dynamicStatusIds.INTERVIEW_MAIN_STATUS_ID && candidate.sub_status_id && dynamicStatusIds.INTERVIEW_OUTCOME_SUB_STATUS_IDS.includes(candidate.sub_status_id);

    let displayStatusName = statusName;
    if (isScheduled) {
      displayStatusName = `${statusName} Scheduled`;
    }

    return (
      <div className="flex flex-col">
        <p className="font-medium">{displayStatusName}</p>
        
        {(isScheduled || isRescheduled) && candidate.interview_date && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 whitespace-nowrap">
            <span>{formatDate(candidate.interview_date)}</span>
            {candidate.interview_time && (
              <>
                <span className="text-gray-300">|</span>
                <span>{formatTime(candidate.interview_time)}</span>
              </>
            )}
          </div>
        )}

        {isOutcome && candidate.interview_feedback && (
          <TooltipProvider>
            <ShadTooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-gray-500 mt-1 flex items-start gap-1.5 cursor-help">
                  <MessageSquare size={12} className="flex-shrink-0 mt-0.5" />
                  <p className="truncate">
                    {candidate.interview_feedback.length > 10 ? `${candidate.interview_feedback.slice(0, 10)}...` : candidate.interview_feedback}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{candidate.interview_feedback}</p>
              </TooltipContent>
            </ShadTooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !clientName) return;
      setIsLoading(true); setError(null);
      try {
        const { data: jobs, error: jobsError } = await supabase.from('hr_jobs').select('id').eq('organization_id', organizationId).eq('client_details->>clientName', clientName);
        if (jobsError) throw jobsError;
        if (!jobs || jobs.length === 0) { setCandidates([]); return; }
        const jobIds = jobs.map(job => job.id);
        
        let candidatesQuery = supabase.from('hr_job_candidates').select(`
          id, name, created_at, main_status_id, sub_status_id, metadata, job_id,
          interview_date, interview_time, interview_feedback,
          job:hr_jobs!hr_job_candidates_job_id_fkey(title),
          recruiter:created_by(first_name, last_name),
          analysis:candidate_resume_analysis!candidate_id(overall_score)
        `).eq('organization_id', organizationId).in('job_id', jobIds);

        if (dateRange?.startDate && dateRange.endDate) {
            candidatesQuery = candidatesQuery.gte('created_at', format(dateRange.startDate, 'yyyy-MM-dd')).lte('created_at', format(dateRange.endDate, 'yyyy-MM-dd'));
        }

        // Changed select to fetch type column to help map dynamic ID names uniquely
        const [candidatesResponse, statusesResponse] = await Promise.all([
          candidatesQuery.order('created_at', { ascending: false }),
          supabase.from('job_statuses').select('id, name, type').eq('organization_id', organizationId),
        ]);

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
        const statusesData = statusesResponse.data ||[];
        const statusMap = statusesData.reduce((acc: any, status: any) => { acc[status.id] = status.name; return acc; }, {});
        setStatuses(statusMap);

        // --- DYNAMIC STATUS ID RESOLUTION --- 
        // This makes sure it works seamlessly for *any* newly added organization moving forward!
        const findId = (name: string, type?: string) => statusesData.find((s: any) => s.name === name && (type ? s.type === type : true))?.id;
        const interviewMain = findId('Interview', 'main');
        
        if (interviewMain) {
            setDynamicStatusIds({
                INTERVIEW_MAIN_STATUS_ID: interviewMain,
                INTERVIEW_SCHEDULED_SUB_STATUS_IDS:["Technical Assessment", "L1", "L2", "L3", "End Client Round"].map(n => findId(n, 'sub')).filter(Boolean) as string[],
                INTERVIEW_RESCHEDULED_SUB_STATUS_IDS:["Reschedule Technical Assessment", "Reschedule L1", "Reschedule L2", "Reschedule L3", "Reschedule End Client Round"].map(n => findId(n, 'sub')).filter(Boolean) as string[],
                INTERVIEW_OUTCOME_SUB_STATUS_IDS:["Technical Assessment Selected", "Technical Assessment Rejected", "L1 Selected", "L1 Rejected", "L2 Selected", "L2 Rejected", "L3 Selected", "L3 Rejected", "End Client Selected", "End Client Rejected"].map(n => findId(n, 'sub')).filter(Boolean) as string[],
                JOINED_STATUS_ID: findId('Joined', 'main') || STATUS_CONFIG.default.JOINED_STATUS_ID,
                OFFERED_STATUS_ID: findId('Offered', 'main') || STATUS_CONFIG.default.OFFERED_STATUS_ID,
                JOINED_SUB_STATUS_ID: findId('Joined', 'sub') || STATUS_CONFIG.default.JOINED_SUB_STATUS_ID,
            });
        } else {
             // Fallback for statically declared IDs
             if (organizationId === DEMO_ORGANIZATION_ID) setDynamicStatusIds(STATUS_CONFIG.demo);
             else if (organizationId === AMPLE_ORGANIZATION_ID) setDynamicStatusIds(STATUS_CONFIG.ample);
             else setDynamicStatusIds(STATUS_CONFIG.default);
        }

        const formattedCandidates: Candidate[] = (candidatesResponse.data as any[]).map(c => ({
          id: c.id, job_id: c.job_id, name: c.name, created_at: c.created_at, main_status_id: c.main_status_id, sub_status_id: c.sub_status_id, metadata: c.metadata,
          job_title: c.job?.title || 'N/A', 
          recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A', 
          client_name: clientName, 
          current_salary: c.metadata?.currentSalary,
          expected_salary: c.metadata?.expectedSalary,
          location: c.metadata?.currentLocation,
          notice_period: c.metadata?.noticePeriod,
          overall_score: c.analysis?.[0]?.overall_score || null,
          interview_date: c.interview_date,
          interview_time: c.interview_time,
          interview_feedback: c.interview_feedback,
        }));

        setCandidates(formattedCandidates);
        
        const uniqueRecruiters =[...new Set(formattedCandidates.map(c => c.recruiter_name).filter(r => r && r !== 'N/A'))].sort();
        setRecruiterOptions(uniqueRecruiters);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  },[organizationId, clientName, dateRange]);

  const filteredCandidates = useMemo(() => candidates.filter(c => {
    const statusName = statuses[c.sub_status_id || ''] || 'Uncategorized';
    return (statusFilter === 'all' || statusName === statusFilter) &&
           (recruiterFilter === 'all' || c.recruiter_name === recruiterFilter) &&
           (!searchTerm || (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) || c.recruiter_name?.toLowerCase().includes(searchTerm.toLowerCase())));
  }),[candidates, searchTerm, statuses, statusFilter, recruiterFilter]);

  // --- UPDATED ANALYTICS LOGIC ---
  const { analytics, pipelineStages, recruiterPerformance } = useMemo(() => {
    const stageCounts: { [key: string]: number } = {}; let scoreSum = 0; let scoreCount = 0;
    const recruiterProfiles: { [key: string]: number } = {}; const recruiterConversions: { [key: string]: number } = {}; const recruiterJoins: { [key: string]: number } = {};
    let convertedCount = 0; let joinedCount = 0;
    const conversionStatuses =[dynamicStatusIds.INTERVIEW_MAIN_STATUS_ID, dynamicStatusIds.OFFERED_STATUS_ID, dynamicStatusIds.JOINED_STATUS_ID];

    filteredCandidates.forEach(c => {
      const mainStatusName = statuses[c.main_status_id || ''] || 'Sourced';
      stageCounts[mainStatusName] = (stageCounts[mainStatusName] || 0) + 1;
      if (c.overall_score != null) { scoreSum += c.overall_score; scoreCount++; }
      if (c.recruiter_name && c.recruiter_name !== 'N/A') { 
          recruiterProfiles[c.recruiter_name] = (recruiterProfiles[c.recruiter_name] || 0) + 1;
          if (c.main_status_id && conversionStatuses.includes(c.main_status_id)) { recruiterConversions[c.recruiter_name] = (recruiterConversions[c.recruiter_name] || 0) + 1; }
          if (c.main_status_id === dynamicStatusIds.JOINED_STATUS_ID && c.sub_status_id === dynamicStatusIds.JOINED_SUB_STATUS_ID) { recruiterJoins[c.recruiter_name] = (recruiterJoins[c.recruiter_name] || 0) + 1; }
      }
      if (c.main_status_id && conversionStatuses.includes(c.main_status_id)) { convertedCount++; }
      if (c.main_status_id === dynamicStatusIds.JOINED_STATUS_ID && c.sub_status_id === dynamicStatusIds.JOINED_SUB_STATUS_ID) { joinedCount++; }
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
  }, [filteredCandidates, statuses, dynamicStatusIds]);

  const groupedBySubStatus = useMemo<GroupedData>(() => filteredCandidates.reduce((acc: GroupedData, c) => { const s = statuses[c.sub_status_id || ''] || 'Uncategorized'; if (!acc[s]) acc[s] = []; acc[s].push(c); return acc; }, {}), [filteredCandidates, statuses]);
  const tableRows = useMemo<TableRowData[]>(() => !isGrouped ? filteredCandidates.map(c => ({ type: 'data', candidate: c, statusName: statuses[c.sub_status_id || ''] || 'Uncategorized' })) : Object.entries(groupedBySubStatus).sort((a, b) => a[0].localeCompare(b[0])).flatMap(([s, g]) =>[{ type: 'header', statusName: s, count: g.length }, ...expandedGroups.includes(s) ? g.map(c => ({ type: 'data', candidate: c, statusName: s })) : []]),[isGrouped, filteredCandidates, groupedBySubStatus, expandedGroups, statuses]);
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
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); 
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
      headStyles: { fillColor:[123, 67, 241] }, 
      columnStyles: { 0: { cellWidth: 30 }, 3: { cellWidth: 40 } } 
    });
    doc.save(`${clientName}_candidate_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const toggleGroup = (statusName: string) => setExpandedGroups(prev => prev.includes(statusName) ? prev.filter(g => g !== statusName) :[...prev, statusName]);
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
            value="" 
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
            <CardHeader><CardTitle className="text-base font-semibold">Profiles by Recruiter</CardTitle></CardHeader>
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
         <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Status Filter */}
  <div className="flex-shrink-0 order-2 w-full sm:w-[150px]">
    <Select value={statusFilter} onValueChange={onFilterChange(setStatusFilter)}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-gray-500" />
          <SelectValue placeholder="Filter by Status" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {Object.values(statuses).sort().map(s => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Recruiter Filter */}
  <div className="flex-shrink-0 order-3 w-full sm:w-[150px]">
    <Select value={recruiterFilter} onValueChange={onFilterChange(setRecruiterFilter)}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          <SelectValue placeholder="Filter by Recruiter" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Recruiters</SelectItem>
        {recruiterOptions.map(r => (
          <SelectItem key={r} value={r}>{r}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Search Bar */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input 
      placeholder="Search by name, job, recruiter..." 
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm" 
      value={searchTerm} 
      onChange={(e) => { 
        setSearchTerm(e.target.value); 
        setCurrentPage(1); 
      }} 
    />
  </div>

  {/* Group Button */}
  <Button 
    variant="outline" 
    onClick={() => setIsGrouped(!isGrouped)} 
    className="flex-shrink-0 order-4 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
  >
    {isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />} 
    {isGrouped ? 'Ungroup' : 'Group'}
  </Button>

  {/* Export Buttons */}
  <div className="flex gap-2 flex-shrink-0 order-5">
    <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      CSV
    </Button>
    <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      PDF
    </Button>
  </div>
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
                      <TableCell className="font-medium"><Link to={`/jobs/candidateprofile/${candidate!.id}/${candidate!.job_id}`} className="text-purple-600 hover:underline">{candidate!.name}</Link></TableCell>
                      <TableCell>
                        <StatusCell candidate={candidate!} statusName={statusName!} />
                      </TableCell>
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
