import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Files, ChevronUp, ChevronDown, User } from 'lucide-react';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { startOfMonth, endOfMonth } from 'date-fns';
import FunnelChart from './FunnelChart';
import RecruiterPerformanceTable from './RecruiterPerformanceTable';
import { PieChartComponent } from './PieChartComponent';
import RecruiterRadarChart from './RadarChart';
import HeatmapChart from './HeatmapChart';
import { useStatusReport } from '@/hooks/useStatusReport';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

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

interface ResumeAnalysisData {
  recruiter: string;
  resumes_analyzed: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const ResumeAnalysisTable: React.FC<{ data: ResumeAnalysisData[] }> = ({ data }) => {
  const [sortColumn, setSortColumn] = useState<string>('recruiter');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortColumn as keyof ResumeAnalysisData];
    const bValue = b[sortColumn as keyof ResumeAnalysisData];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const renderSortIndicator = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
    }
    return null;
  };

  const exportToCSV = () => {
    let csv = 'Recruiter,Resumes Analyzed\n';
    data.forEach(record => {
      csv += `${record.recruiter},${record.resumes_analyzed}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'resume_analysis.csv');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Resume Analysis Report', 14, 22);

    const tableData = data.map(record => [
      record.recruiter,
      record.resumes_analyzed.toString()
    ]);

    const headers = ['Recruiter', 'Resumes Analyzed'];

    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 249] }
    });

    doc.save('resume_analysis.pdf');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Resume Analysis by Recruiter</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-1"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="flex items-center gap-1"
            >
              <Files className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('recruiter')}
              >
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Recruiter
                  {renderSortIndicator('recruiter')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('resumes_analyzed')}
              >
                <div className="flex items-center gap-1">
                  Resumes Analyzed
                  {renderSortIndicator('resumes_analyzed')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No resume analysis data available.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.recruiter}</TableCell>
                  <TableCell>{record.resumes_analyzed}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const RecruiterReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const { isLoading, error, fetchRecruiterReport } = useStatusReport();
  const [data, setData] = useState<RecruiterPerformanceData[]>([]);
  const [resumeData, setResumeData] = useState<ResumeAnalysisData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (dateRange.startDate && dateRange.endDate) {
        // Fetch recruiter performance data
        const reportData = await fetchRecruiterReport(dateRange.startDate, dateRange.endDate);
        setData(reportData);
        const totalSubmitted = reportData.reduce((sum, rec) => sum + rec.profiles_submitted, 0);
        if (totalSubmitted > 87) {
          console.warn(`Total profiles_submitted (${totalSubmitted}) exceeds expected 87 unique candidates. Check deduplication in fetchRecruiterReport.`);
        }

        // Fetch resume analysis data from resume_analysis table
        try {
          const { data: resumeAnalysisData, error: resumeAnalysisError } = await supabase
            .from('resume_analysis')
            .select(`
              created_by,
              hr_employees!created_by_fkey (
                first_name,
                last_name
              )
            `)
            .gte('updated_at', dateRange.startDate.toISOString())
            .lte('updated_at', dateRange.endDate.toISOString())
            .not('created_by', 'is', null); // Ensure created_by is not null

          if (resumeAnalysisError) {
            throw new Error(`Error fetching resume analysis data: ${resumeAnalysisError.message}`);
          }

          // Group by recruiter and count the number of resumes analyzed
          const formattedResumeData: ResumeAnalysisData[] = [];
          const groupedData = resumeAnalysisData.reduce((acc: any, record: any) => {
            const recruiterName = `${record.hr_employees.first_name} ${record.hr_employees.last_name}`;
            acc[recruiterName] = (acc[recruiterName] || 0) + 1;
            return acc;
          }, {});

          for (const [recruiter, count] of Object.entries(groupedData)) {
            formattedResumeData.push({
              recruiter,
              resumes_analyzed: count as number
            });
          }

          setResumeData(formattedResumeData);
        } catch (err) {
          console.error(err);
          setResumeData([]);
        }
      } else {
        setData([]);
        setResumeData([]);
      }
    };

    fetchData();
  }, [dateRange]);

  // Colors for charts
  const COLORS = [
    '#4f46e5', '#3b82f6', '#10b981', '#8b5cf6', '#f97316',
    '#ec4899', '#14b8a6', '#f43f5e', '#eab308', '#a855f7'
  ];

  // Generate funnel chart data
  const getFunnelData = () => {
    const totalSubmitted = data.reduce((sum, rec) => sum + rec.profiles_submitted, 0);
    const totalToClient = data.reduce((sum, rec) => sum + rec.sent_to_client, 0);
    const totalTechnical = data.reduce((sum, rec) => sum + rec.interviews.technical, 0);
    const totalTechnicalSelected = data.reduce((sum, rec) => sum + rec.interviews.technical_selected, 0);
    const totalL1 = data.reduce((sum, rec) => sum + rec.interviews.l1, 0);
    const totalL1Selected = data.reduce((sum, rec) => sum + rec.interviews.l1_selected, 0);
    const totalL2 = data.reduce((sum, rec) => sum + rec.interviews.l2, 0);
    const totalEndClient = data.reduce((sum, rec) => sum + rec.interviews.end_client, 0);
    const totalOffers = data.reduce((sum, rec) => sum + rec.offers.made, 0);
    const totalAccepted = data.reduce((sum, rec) => sum + rec.offers.accepted, 0);
    const totalJoined = data.reduce((sum, rec) => sum + rec.joining.joined, 0);

    return [
      { name: 'Profiles Submitted', value: totalSubmitted, fill: '#4f46e5' },
      { name: 'Sent to Client', value: totalToClient, fill: '#3b82f6' },
      { name: 'Technical Interview', value: totalTechnical, fill: '#10b981' },
      { name: 'Technical Selected', value: totalTechnicalSelected, fill: '#14b8a6' },
      { name: 'L1 Interview', value: totalL1, fill: '#8b5cf6' },
      { name: 'L1 Selected', value: totalL1Selected, fill: '#a855f7' },
      { name: 'L2 Interview', value: totalL2, fill: '#f97316' },
      { name: 'End Client Interview', value: totalEndClient, fill: '#ec4899' },
      { name: 'Offers Made', value: totalOffers, fill: '#eab308' },
      { name: 'Offers Accepted', value: totalAccepted, fill: '#14b8a6' },
      { name: 'Joined', value: totalJoined, fill: '#f43f5e' }
    ];
  };

  // Generate offer outcomes pie chart data
  const getOfferOutcomesData = () => {
    const totalAccepted = data.reduce((sum, rec) => sum + rec.offers.accepted, 0);
    const totalRejected = data.reduce((sum, rec) => sum + rec.offers.rejected, 0);

    return [
      { name: 'Accepted', value: totalAccepted, fill: '#10b981' },
      { name: 'Rejected', value: totalRejected, fill: '#f43f5e' }
    ];
  };

  // Generate joining outcomes pie chart data
  const getJoiningOutcomesData = () => {
    const totalJoined = data.reduce((sum, rec) => sum + rec.joining.joined, 0);
    const totalNoShow = data.reduce((sum, rec) => sum + rec.joining.no_show, 0);

    return [
      { name: 'Joined', value: totalJoined, fill: '#10b981' },
      { name: 'No Show', value: totalNoShow, fill: '#f43f5e' }
    ];
  };

  // Generate radar chart data
  const getRadarData = () => {
    const metrics = [
      'Submission-to-Client',
      'Client Acceptance',
      'Technical Conversion',
      'Technical→L1',
      'L1→L1 Selected',
      'L1→L2 Conversion',
      'L2→End Client',
      'Offer Acceptance',
      'Join Rate',
      'Funnel Efficiency'
    ];

    const radarData = metrics.map(metric => {
      const result: any = { subject: metric };

      data.forEach(recruiter => {
        let value = 0;
        switch (metric) {
          case 'Submission-to-Client':
            value = recruiter.profiles_submitted > 0
              ? (recruiter.sent_to_client / recruiter.profiles_submitted) * 100
              : 0;
            break;
          case 'Client Acceptance':
            value = recruiter.sent_to_client > 0
              ? ((recruiter.interviews.technical + recruiter.interviews.l1 + recruiter.interviews.l2 + recruiter.interviews.end_client) / recruiter.sent_to_client) * 100
              : 0;
            break;
          case 'Technical Conversion':
            value = recruiter.interviews.technical > 0
              ? (recruiter.interviews.technical_selected / recruiter.interviews.technical) * 100
              : 0;
            break;
          case 'Technical→L1':
            value = recruiter.interviews.technical_selected > 0
              ? (recruiter.interviews.l1 / recruiter.interviews.technical_selected) * 100
              : 0;
            break;
          case 'L1→L1 Selected':
            value = recruiter.interviews.l1 > 0
              ? (recruiter.interviews.l1_selected / recruiter.interviews.l1) * 100
              : 0;
            break;
          case 'L1→L2 Conversion':
            value = recruiter.interviews.l1_selected > 0
              ? (recruiter.interviews.l2 / recruiter.interviews.l1_selected) * 100
              : 0;
            break;
          case 'L2→End Client':
            value = recruiter.interviews.l2 > 0
              ? (recruiter.interviews.end_client / recruiter.interviews.l2) * 100
              : 0;
            break;
          case 'Offer Acceptance':
            value = recruiter.offers.made > 0
              ? (recruiter.offers.accepted / recruiter.offers.made) * 100
              : 0;
            break;
          case 'Join Rate':
            value = recruiter.offers.accepted > 0
              ? (recruiter.joining.joined / recruiter.offers.accepted) * 100
              : 0;
            break;
          case 'Funnel Efficiency':
            value = recruiter.profiles_submitted > 0
              ? (recruiter.joining.joined / recruiter.profiles_submitted) * 100
              : 0;
            break;
        }
        result[recruiter.recruiter] = value;
      });

      return result;
    });

    return radarData;
  };

  // Generate heatmap chart data (unchanged)
  const getHeatmapData = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

    return days.flatMap(day =>
      hours.map(hour => ({
        day,
        hour,
        value: Math.floor(Math.random() * (day === 'Saturday' || day === 'Sunday' ? 3 : 10))
      }))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recruiter Performance Report</h1>
        <EnhancedDateRangeSelector
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      <Tabs defaultValue="overview">
<TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
      <TabsTrigger
        value="overview"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Overview
      </TabsTrigger>
      <TabsTrigger
        value="funnelAnalysis"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Funnel Analysis
      </TabsTrigger>
      <TabsTrigger
        value="recruiters"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Recruiter Performance
      </TabsTrigger>
      <TabsTrigger
        value="activity"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Activity Patterns
      </TabsTrigger>
    </TabsList>

        <TabsContent value="overview">
        <div className="mx-auto">
          <div className="grid grid-cols-1 gap-8">
            <RecruiterPerformanceTable data={data} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FunnelChart data={getFunnelData()} title="Recruitment Funnel" />
              <RecruiterRadarChart
                data={getRadarData()}
                title="Recruiter Performance Comparison"
                recruiters={data.map(r => r.recruiter)}
                colors={COLORS}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PieChartComponent
                data={getOfferOutcomesData()}
                title="Offer Outcomes"
              />
              <PieChartComponent
                data={getJoiningOutcomesData()}
                title="Joining Outcomes"
              />
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="funnelAnalysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FunnelChart
              data={getFunnelData()}
              title="Recruitment Funnel"
            />
            <div className="grid grid-cols-1 gap-6">
              <PieChartComponent
                data={getOfferOutcomesData()}
                title="Offer Outcomes"
              />
              <PieChartComponent
                data={getJoiningOutcomesData()}
                title="Joining Outcomes"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recruiters">
          <RecruiterRadarChart
            data={getRadarData()}
            title="Recruiter Performance Comparison"
            recruiters={data.map(r => r.recruiter)}
            colors={COLORS}
          />
          <div className="mt-6">
            <RecruiterPerformanceTable data={data} />
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <HeatmapChart
            data={getHeatmapData()}
            title="Weekly Submission Activity Patterns"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecruiterReportPage;