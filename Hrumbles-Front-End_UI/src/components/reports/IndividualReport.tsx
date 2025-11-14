import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Sankey, Layer, Rectangle, AreaChart, Area } from 'recharts';
import { useStatusReport } from '@/hooks/useStatusReport';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparisonChart } from './ComparisonChart';
import { debounce } from 'lodash';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Define color palettes for each stage
const JOINED_COLORS = [
  '#ffc658', // Vibrant Green for "Joined - Joined"
  '#ffc658', // Slightly lighter green for "Joined - No Show"
];

const JOINED_COLORS_PER = [
  '#82ca9d', // Vibrant Green for "Joined - Joined"
  '#82ca9d', // Slightly lighter green for "Joined - No Show"
];

const OFFERED_COLORS = [
  '#2563EB', // Deep Blue for "Offered - Offer Issued"
  '#3B82F6', // Lighter Blue for "Offered - Offer On Hold"
];

const INTERVIEW_COLORS = [
  '#4F46E5', // Indigo for "Interview - Technical Assessment"
  '#5B21B6', // Deep Purple for "Interview - Reschedule Interview"
  '#7C3AED', // Purple for "Interview - Technical Assessment Selected"
  '#6D28D9', // Slightly darker Purple for "Interview - Technical Assessment Rejected"
  '#8B5CF6', // Light Purple for "Interview - L1"
  '#A78BFA', // Lighter Purple for "Interview - L1 Selected"
  '#C4B5FD', // Very light Purple for "Interview - L1 Rejected"
  '#7E22CE', // Deep Purple for "Interview - L2"
  '#9D4EDD', // Purple for "Interview - L2 Selected"
  '#D8B4FE', // Light Purple for "Interview - L2 Rejected"
  '#A855F7', // Vibrant Purple for "Interview - L3"
  '#E879F9', // Pinkish Purple for "Interview - L3 Selected"
  '#F0ABFC', // Light Pinkish Purple for "Interview - L3 Rejected"
  '#D6BCFA', // Soft Purple for "Interview - End Client Round"
  '#C084FC', // Light Purple for "Interview - End Client Selected"
  '#E0B0FF', // Very light Purple for "Interview - End Client Rejected"
];

const PROCESSED_COLORS = [
  '#0D9488', // Teal for "Processed - Processed (Internal)"
  '#14B8A6', // Lighter Teal for "Processed - Processed (Client)"
  '#0F766E', // Darker Teal for "Processed - Duplicate (Internal)"
  '#5EEAD4', // Soft Cyan for "Processed - Duplicate (Client)"
  '#2DD4BF', // Bright Cyan for "Processed - Internal Reject"
  '#36CFC9', // Light Cyan for "Processed - Client Reject"
  '#15BEB2', // Muted Cyan for "Processed - Candidate on hold"
];

// Define status order and stages
const statusOrder = [
  'Processed - Processed (Internal)',
  'Processed - Processed (Client)',
  'Processed - Duplicate (Internal)',
  'Processed - Duplicate (Client)',
  'Processed - Internal Reject',
  'Processed - Client Reject',
  'Processed - Candidate on hold',
  'Interview - Technical Assessment',
  'Interview - Reschedule Interview',
  'Interview - Technical Assessment Selected',
  'Interview - Technical Assessment Rejected',
  'Interview - L1',
  'Interview - L1 Selected',
  'Interview - L1 Rejected',
  'Interview - L2',
  'Interview - L2 Selected',
  'Interview - L2 Rejected',
  'Interview - L3',
  'Interview - L3 Selected',
  'Interview - L3 Rejected',
  'Interview - End Client Round',
  'Interview - End Client Selected',
  'Interview - End Client Rejected',
  'Offered - Offer Issued',
  'Offered - Offer On Hold',
  'Joined - Joined',
  'Joined - No Show',
];

const positiveOutcomes = [
  'Joined - Joined',
  'Offered - Offer Issued',
  'Interview - End Client Selected',
  'Interview - L3 Selected',
  'Interview - L2 Selected',
  'Interview - L1 Selected',
  'Interview - Technical Assessment Selected',
];

const stages = ['Processed', 'Interview', 'Offered', 'Joined'];

// Map each status to a color based on its stage
const STATUS_COLORS = statusOrder.reduce((acc, status, index) => {
  if (status.startsWith('Joined')) {
    acc[status] = JOINED_COLORS[index % JOINED_COLORS.length];
  } else if (status.startsWith('Offered')) {
    acc[status] = OFFERED_COLORS[index % OFFERED_COLORS.length];
  } else if (status.startsWith('Interview')) {
    const interviewIndex = statusOrder
      .filter((s) => s.startsWith('Interview'))
      .indexOf(status);
    acc[status] = INTERVIEW_COLORS[interviewIndex % INTERVIEW_COLORS.length];
  } else if (status.startsWith('Processed')) {
    const processedIndex = statusOrder
      .filter((s) => s.startsWith('Processed'))
      .indexOf(status);
    acc[status] = PROCESSED_COLORS[processedIndex % PROCESSED_COLORS.length];
  }
  return acc;
}, {} as Record<string, string>);

// Map stages to colors for Sankey diagram
const STAGE_COLORS = {
  Processed: PROCESSED_COLORS[0], // Use the first color for Processed (Teal)
  Interview: INTERVIEW_COLORS[0], // Use the first color for Interview
  Offered: OFFERED_COLORS[0],     // Use the first color for Offered
  Joined: JOINED_COLORS[0],       // Use the first color for Joined
};

// Define failure color for performance chart
const FAILURE_COLOR = '#F87171'; // Muted red for failure rate

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const IndividualReport: React.FC = () => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(statusOrder);
  const { isLoading, error, fetchIndividualReport } = useStatusReport();
  const [reportData, setReportData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
  });

  const debouncedFetch = debounce(async (from: Date, to: Date) => {
    const data = await fetchIndividualReport(from, to);
    const sortedData = data.map((item: any) => ({
      ...item,
      statusBreakdown: statusOrder.map(statusName => ({
        statusName,
        count: item.statusBreakdown.find((s: any) => s.statusName === statusName)?.count || 0,
      })),
      dailyData: item.dailyData.map((day: any) => ({
        ...day,
        ...Object.fromEntries(
          Object.entries(day).filter(([key]) => key === 'date' || statusOrder.includes(key))
        ),
      })),
    }));
    setReportData(sortedData);
  }, 500);

  useEffect(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      setReportData([]);
      return;
    }
    debouncedFetch(dateRange.startDate, dateRange.endDate);
    return () => debouncedFetch.cancel();
  }, [dateRange?.startDate, dateRange?.endDate]);

  const handleStatusChange = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleEmployeeChange = (employee: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employee)
        ? prev.filter(e => e !== employee)
        : [...prev, employee]
    );
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployees(employeeItems.map(employee => employee.id));
  };

  const handleDeselectAllEmployees = () => {
    setSelectedEmployees([]);
  };

  const handleSelectAllStatuses = () => {
    setSelectedStatuses(statusOrder);
  };

  const handleDeselectAllStatuses = () => {
    setSelectedStatuses([]);
  };

  const getSubStatus = (status: string) => {
    const parts = status.split(' - ');
    return parts.length > 1 ? parts[1] : status;
  };

  const filteredReportData = reportData
    .filter(employee => selectedEmployees.length === 0 || selectedEmployees.includes(employee.name))
    .map(employee => ({
      ...employee,
      statusBreakdown: employee.statusBreakdown.filter((s: any) => selectedStatuses.includes(s.statusName)),
      dailyData: employee.dailyData.map((day: any) => ({
        ...day,
        ...Object.fromEntries(
          Object.entries(day).filter(([key]) => key === 'date' || selectedStatuses.includes(key))
        ),
      })),
    }));

  const comparisonData = () => {
    const selectedEmployee1 = selectedEmployees[0];
    const selectedEmployee2 = selectedEmployees[1];

    if (!selectedEmployee1 || !selectedEmployee2) {
      return filteredReportData[0]?.dailyData || [];
    }

    const employee1Data = filteredReportData.find(emp => emp.name === selectedEmployee1)?.dailyData || [];
    const employee2Data = filteredReportData.find(emp => emp.name === selectedEmployee2)?.dailyData || [];

    if (!employee1Data.length && !employee2Data.length) {
      return [];
    }

    const allDates = [...new Set([
      ...employee1Data.map((d: any) => d.date),
      ...employee2Data.map((d: any) => d.date),
    ])].sort();

    const mergedData = allDates.map(date => {
      const emp1Day = employee1Data.find((d: any) => d.date === date) || {};
      const emp2Day = employee2Data.find((d: any) => d.date === date) || {};
      const dataPoint: any = { date };

      const emp1Total = selectedStatuses.reduce((sum, status) => sum + (emp1Day[status] || 0), 0);
      const emp2Total = selectedStatuses.reduce((sum, status) => sum + (emp2Day[status] || 0), 0);

      dataPoint[selectedEmployee1] = emp1Total;
      dataPoint[selectedEmployee2] = emp2Total;

      return dataPoint;
    });

    return mergedData;
  };

  // Calculate Success Rate Data for Performance Chart
  const performanceData = filteredReportData.map(employee => {
    const positiveCount = employee.statusBreakdown
      .filter((s: any) => positiveOutcomes.includes(s.statusName))
      .reduce((sum: number, s: any) => sum + s.count, 0);
    const total = employee.totalCandidates || 1; // Avoid division by zero
    const successRate = (positiveCount / total) * 100;
    const failureRate = 100 - successRate;
    return {
      name: employee.name,
      successRate: Number(successRate.toFixed(2)),
      failureRate: Number(failureRate.toFixed(2)),
      totalCandidates: employee.totalCandidates,
    };
  });

  // Prepare Sankey Data
  const sankeyData = () => {
    // Aggregate counts for each stage
    const stageCounts: { [key: string]: number } = {
      Processed: 0,
      Interview: 0,
      Offered: 0,
      Joined: 0,
    };

    filteredReportData.forEach(employee => {
      employee.statusBreakdown.forEach((s: any) => {
        if (s.statusName.includes('Processed')) {
          stageCounts.Processed += s.count;
        } else if (s.statusName.includes('Interview')) {
          stageCounts.Interview += s.count;
        } else if (s.statusName.includes('Offered')) {
          stageCounts.Offered += s.count;
        } else if (s.statusName.includes('Joined')) {
          stageCounts.Joined += s.count;
        }
      });
    });

    // Create nodes
    const nodes = stages.map((stage, index) => ({
      name: stage,
    }));

    // Create links (assuming a linear flow: Processed -> Interview -> Offered -> Joined)
    const links = [
      { source: 0, target: 1, value: Math.min(stageCounts.Processed, stageCounts.Interview) },
      { source: 1, target: 2, value: Math.min(stageCounts.Interview, stageCounts.Offered) },
      { source: 2, target: 3, value: Math.min(stageCounts.Offered, stageCounts.Joined) },
    ].filter(link => link.value > 0); // Remove links with zero value

    return { nodes, links };
  };

  // Prepare CSV data
  const csvData = filteredReportData.map(employee => ({
    'Employee Name': employee.name,
    'Total Candidates': employee.totalCandidates,
    ...Object.fromEntries(
      employee.statusBreakdown.map((status: any) => [getSubStatus(status.statusName), status.count])
    ),
  }));

  // PDF Download Handler
  const downloadPDF = async () => {
    const table = document.querySelector('.report-table');
    if (table) {
      const canvas = await html2canvas(table as HTMLElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('individual-report.pdf');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!filteredReportData.length && selectedEmployees.length > 0) {
    return (
      <Alert>
        <AlertDescription>No data available for the selected employees or statuses.</AlertDescription>
      </Alert>
    );
  }
  if (!reportData.length) {
    return (
      <>
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Individual Report</h2>
        <EnhancedDateRangeSelector
          value={dateRange}
          onChange={setDateRange}
        />
      </div>
      <Alert>
        <AlertDescription>No data available for the selected date range.</AlertDescription>
      </Alert>
      </>
    );
  }

  const employeeItems = reportData.map(employee => ({
    id: employee.name,
    name: employee.name,
  }));

  // Custom Node for Sankey Diagram
  const CustomNode = ({ x, y, width, height, index, payload }: any) => {
    const stage = payload.name;
    return (
      <Layer>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={STAGE_COLORS[stage] || '#CCCCCC'}
          fillOpacity={0.4}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#333"
          fontSize="12"
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Individual Report</h2>
        <EnhancedDateRangeSelector
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Label className="block text-sm font-medium text-gray-700">Filter Employees</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="mt-1 w-full">
                  {selectedEmployees.length === 0
                    ? 'All Employees'
                    : selectedEmployees.length === employeeItems.length
                    ? 'All Employees'
                    : `${selectedEmployees.length} Employees Selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex space-x-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllEmployees}
                      className="flex-1"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllEmployees}
                      className="flex-1"
                    >
                      Deselect All
                    </Button>
                  </div>
                  {employeeItems.map(employee => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={employee.id}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleEmployeeChange(employee.id)}
                      />
                      <Label htmlFor={employee.id} className="text-sm">
                        {employee.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full sm:w-48">
            <Label className="block text-sm font-medium text-gray-700">Filter Statuses</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="mt-1 w-full">
                  {selectedStatuses.length === statusOrder.length
                    ? 'All Statuses'
                    : `${selectedStatuses.length} Statuses Selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex space-x-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllStatuses}
                      className="flex-1"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllStatuses}
                      className="flex-1"
                    >
                      Deselect All
                    </Button>
                  </div>
                  {statusOrder.map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={() => handleStatusChange(status)}
                      />
                      <Label htmlFor={status} className="text-sm">
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div> */}

      {/* <div className="w-full overflow-x-auto">
        <Tabs defaultValue="overview" className="w-full min-w-[320px]">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="flow">Flow</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution by Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={400} minWidth={300}>
                    <BarChart
                      data={filteredReportData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      <XAxis
                        dataKey="name"
                        angle={0}
                        style={{ fontSize: '12px', fill: '#666' }}
                      />
                      <YAxis style={{ fontSize: '12px', fill: '#666' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '10px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: '#333' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        layout="vertical"
                        wrapperStyle={{ fontSize: '12px', color: '#333', maxWidth: '200px', overflowY: 'auto', maxHeight: '300px' }}
                      />
                      {selectedStatuses.map((status) => (
                        <Bar
                          key={status}
                          dataKey={`statusBreakdown[${filteredReportData[0]?.statusBreakdown.findIndex((s: any) => s.statusName === status)}].count`}
                          name={status}
                          fill={STATUS_COLORS[status] || '#CCCCCC'}
                          stackId="a"
                          radius={[5, 5, 0, 0]}
                          style={{ transition: 'all 0.3s ease-in-out' }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Employee Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEmployees.length < 2 ? (
                  <Alert>
                    <AlertDescription>Please select at least two employees to compare.</AlertDescription>
                  </Alert>
                ) : comparisonData().length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No data available for the selected employees and statuses. Try selecting more statuses or adjusting the date range.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="w-full">
                    <ComparisonChart
                      data={comparisonData()}
                      type="employee"
                      items={employeeItems}
                      selectedFirst={selectedEmployees[0]}
                      selectedSecond={selectedEmployees[1]}
                      onFirstChange={(value: string) => {
                        const newSelected = [...selectedEmployees];
                        newSelected[0] = value;
                        setSelectedEmployees(newSelected);
                      }}
                      onSecondChange={(value: string) => {
                        const newSelected = [...selectedEmployees];
                        newSelected[1] = value;
                        setSelectedEmployees(newSelected);
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flow">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Flow by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={500} minWidth={300}>
                    <Sankey
                      data={sankeyData()}
                      node={<CustomNode />}
                      nodeWidth={15}
                      nodePadding={50}
                      link={{ stroke: '#666', strokeOpacity: '0.4' }}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '10px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value} candidates`, 'Flow']}
                      />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Employee Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={400} minWidth={300}>
                    <AreaChart
                      data={performanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      <XAxis
                        dataKey="name"
                        angle={0}
                        style={{ fontSize: '12px', fill: '#666' }}
                      />
                      <YAxis
                        label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                        style={{ fontSize: '12px', fill: '#666' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '10px',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: '#333' }}
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        layout="vertical"
                        wrapperStyle={{ fontSize: '12px', color: '#333' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="successRate"
                        name="Success Rate"
                        stroke={JOINED_COLORS_PER[0]}
                        fill={JOINED_COLORS_PER[0]}
                        fillOpacity={0.7}
                        stackId="a"
                        style={{ transition: 'all 0.3s ease-in-out' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="failureRate"
                        name="Failure Rate"
                        stroke={FAILURE_COLOR}
                        fill={FAILURE_COLOR}
                        fillOpacity={0.7}
                        stackId="a"
                        style={{ transition: 'all 0.3s ease-in-out' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div> */}

      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Detailed Report</CardTitle>
            <div className="flex space-x-2">
              <Button asChild>
                <CSVLink
                  data={csvData}
                  filename="individual-report.csv"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium"
                >
                  Download CSV
                </CSVLink>
              </Button>
              <Button onClick={downloadPDF}>Download PDF</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <Table className="report-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white whitespace-nowrap">Employee Name</TableHead>
                  <TableHead className="whitespace-nowrap">Total Candidates</TableHead>
                  {selectedStatuses.map(status => (
                    <TableHead
                      key={status}
                      className="max-w-[120px] sm:max-w-[180px] whitespace-nowrap truncate text-xs sm:text-sm py-1 sm:py-2"
                      title={status}
                    >
                      {getSubStatus(status)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReportData.map(employee => (
                  <TableRow key={employee.name}>
                    <TableCell className="sticky left-0 bg-white whitespace-nowrap">{employee.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{employee.totalCandidates}</TableCell>
                    {employee.statusBreakdown.map((status: any) => (
                      <TableCell key={status.statusName} className="whitespace-nowrap">{status.count}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndividualReport;