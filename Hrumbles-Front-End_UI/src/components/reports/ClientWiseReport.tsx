import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useStatusReport } from '@/hooks/useStatusReport';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { debounce } from 'lodash';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable'; // Explicitly import autoTable
import StackedBarChart from './StackedBarChart';
import { supabase } from "@/integrations/supabase/client";


// Colors for each status (vibrant purple, fuchsia, violet theme)
const COLORS = {
  Processed: '#8E2DE2', // Vibrant purple
  Interview: '#FF00FF', // Bright fuchsia
  Offered: '#BF00FF',   // Rich violet
  Joined: '#8E2DE2',    // Vibrant purple
};

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const ClientWiseReport: React.FC = () => {
  const { isLoading, error, fetchClientReport } = useStatusReport();
  const [reportData, setReportData] = useState([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
  });
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  console.log("reportdata", reportData)

  const debouncedFetch = debounce(async (from: Date, to: Date) => {
    const data = await fetchClientReport(from, to);
    setReportData(data);
    if (data.length > 0 && !selectedClient) {
      setSelectedClient(data[0].name);
    }
  }, 500);

  useEffect(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      setReportData([]);
      return;
    }
    debouncedFetch(dateRange.startDate, dateRange.endDate);
    return () => debouncedFetch.cancel();
  }, [dateRange?.startDate, dateRange?.endDate]);

  // Aggregate status counts across all clients for PieChart
  const pieChartData = reportData.reduce((acc, client) => {
    client.statusBreakdown.forEach(status => {
      const displayName = status.statusName === 'Interview' ? 'Interviewed' : status.statusName;
      const existing = acc.find(item => item.statusName === displayName);
      if (existing) {
        existing.count += status.count;
      } else {
        acc.push({ statusName: displayName, count: status.count });
      }
    });
    return acc;
  }, []).sort((a, b) => {
    const order = ['Processed', 'Interviewed', 'Offered', 'Joined'];
    return order.indexOf(a.statusName) - order.indexOf(b.statusName);
  });

  // Data for SimpleRadarChart based on selected client
  const radarChartData = selectedClient
    ? reportData
        .find(client => client.name === selectedClient)
        ?.statusBreakdown.map(status => ({
          statusName: status.statusName === 'Interview' ? 'Interviewed' : status.statusName,
          count: status.count,
        })) || []
    : [];

  // Transform reportData to match the chart's expected format
  const transformedData = reportData.map(client => ({
    name: client.name,
    Processed: client.statusBreakdown.find(s => s.statusName === 'Processed')?.count || 0,
    Interview: client.statusBreakdown.find(s => s.statusName === 'Interview')?.count || 0,
    Offered: client.statusBreakdown.find(s => s.statusName === 'Offered')?.count || 0,
    Joined: client.statusBreakdown.find(s => s.statusName === 'Joined')?.count || 0,
  }));

  // Inline styles for StackedBarChart
  const chartStyles = {
    container: {
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    bar: {
      transition: 'fill 0.3s ease',
    },
    xAxis: {
      fontSize: '13px',
      fontWeight: 500,
      fill: '#313244',
      fontFamily: 'Inter, sans-serif',
    },
    yAxis: {
      fontSize: '13px',
      fill: '#90909e',
      fontWeight: 500,
      fontFamily: 'Inter, sans-serif',
    },
    tooltip: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '8px',
      fontSize: '12px',
      color: '#1f2937',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    legend: {
      fontSize: '12px',
      fontWeight: 500,
      color: '#475569',
      paddingTop: '10px',
      fontFamily: 'Inter, sans-serif',
    },
  };

  // Custom label renderer for PieChart
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontFamily="Inter, sans-serif"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Client Name', 'Total Candidates', 'Processed', 'Interviewed', 'Offered', 'Joined'];
    const data = reportData.map(client => {
      const row = {
        'Client Name': client.name,
        'Total Candidates': client.totalCandidates,
      };
      client.statusBreakdown.forEach(status => {
        const key = status.statusName === 'Interview' ? 'Interviewed' : status.statusName;
        row[key] = status.count;
      });
      return headers.map(header => row[header] || 0);
    });

    const csv = Papa.unparse({
      fields: headers,
      data,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'client_wise_report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Client Wise Report', 14, 20);

    const headers = ['Client Name', 'Total Candidates', 'Processed', 'Interviewed', 'Offered', 'Joined'];
    const data = reportData.map(client => {
      const row = [client.name, client.totalCandidates];
      const statusCounts = {};
      client.statusBreakdown.forEach(status => {
        const key = status.statusName === 'Interview' ? 'Interviewed' : status.statusName;
        statusCounts[key] = status.count;
      });
      headers.slice(2).forEach(header => {
        row.push(statusCounts[header] || 0);
      });
      return row;
    });

    autoTable(doc, { // Use autoTable as a function with the doc instance
      head: [headers],
      body: data,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 100, 100] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save('client_wise_report.pdf');
  };


    // Send Report via Email
    const sendReport = async () => {
      try {
        // Get JWT
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          throw new Error('No authenticated user found');
        }
        const jwt = session.access_token;
    
        // Log initial state
        console.log('Starting sendReport, reportData:', reportData);
    
        // Validate reportData
        if (!reportData || !Array.isArray(reportData)) {
          throw new Error('Invalid or missing reportData');
        }
    
        // Prepare and log payload
        const payload = { reportData };
        console.log('Sending payload:', JSON.stringify(payload));
    
        const response = await fetch(
          'https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/send-client-report',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA',
              'Authorization': `Bearer ${jwt}`,
            },
            body: JSON.stringify(payload),
          }
        );
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send email');
        }
    
        console.log('Report sent successfully! Server response:', data);
      } catch (err) {
        console.error('Failed to send report:', err.message);
        throw err;
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
  if (!reportData.length) {
    return (
      <>
            <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Client Report</h2>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Client Report</h2>
        <EnhancedDateRangeSelector
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="radar">Client Radar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution by Client</CardTitle>
            </CardHeader>
            <CardContent>
              <StackedBarChart
                data={transformedData}
                colors={COLORS}
                inlineStyles={chartStyles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="count"
                    nameKey="statusName"
                    cx="50%"
                    cy="50%"
                    outerRadius={200}
                    fill="#8884d8"
                    paddingAngle={0}
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.statusName as keyof typeof COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>Client Status Radar</CardTitle>
              <Select
                value={selectedClient || ''}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {reportData.map(client => (
                    <SelectItem key={client.name} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {selectedClient && radarChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="statusName" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar
                      name="Status"
                      dataKey="count"
                      stroke={COLORS.Offered} // Vibrant violet for radar stroke
                      fill={COLORS.Offered}   // Vibrant violet for radar fill
                      fillOpacity={0.6}
                    />
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <Alert>
                  <AlertDescription>Please select a client to view the radar chart.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs> */}

      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle>Detailed Report</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportToCSV} variant="secondary" className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 rounded-lg">
              Download CSV
            </Button>
            <Button onClick={exportToPDF} variant="secondary" className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 rounded-lg">
              Download PDF
            </Button>
            <Button onClick={sendReport} variant="secondary" className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 rounded-lg">
              Send Email
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50 border-b border-indigo-100">
                  <TableHead className="sticky left-0 bg-white cursor-pointer whitespace-nowrap text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4 sticky left-0 bg-white whitespace-nowrap">Client Name</TableHead>
                  <TableHead className="cursor-pointer whitespace-nowrap text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4 sticky left-0 bg-white whitespace-nowrap">Total Candidates</TableHead>
                  {reportData[0]?.statusBreakdown.map(status => (
                    <TableHead
                      key={status.statusName}
                      className="max-w-[150px] truncate cursor-pointer whitespace-nowrap text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4 sticky left-0 bg-white whitespace-nowrap"
                      title={status.statusName === 'Interview' ? 'Interviewed' : status.statusName}
                    >
                      {status.statusName === 'Interview' ? 'Interviewed' : status.statusName}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map(client => (
                  <TableRow key={client.name}>
                    <TableCell className="sticky left-0 bg-white">{client.name}</TableCell>
                    <TableCell>{client.totalCandidates}</TableCell>
                    {client.statusBreakdown.map(status => (
                      <TableCell key={status.statusName}>{status.count}</TableCell>
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

export default ClientWiseReport;