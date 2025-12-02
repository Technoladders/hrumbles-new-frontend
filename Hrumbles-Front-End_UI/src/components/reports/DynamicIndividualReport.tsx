import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { debounce } from 'lodash';
import { useDynamicStatusReport, DynamicReportColumn } from '@/hooks/reports/useDynamicStatusReport';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const DynamicIndividualReport: React.FC = () => {
  const { isLoading, error, fetchDynamicIndividualReport } = useDynamicStatusReport();
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [columns, setColumns] = useState<DynamicReportColumn[]>([]);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
  });

  const debouncedFetch = debounce(async (from: Date, to: Date) => {
    const { data, columns } = await fetchDynamicIndividualReport(from, to);
    setColumns(columns);
    setReportData(data);
  }, 500);

  useEffect(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      setReportData([]);
      return;
    }
    debouncedFetch(dateRange.startDate, dateRange.endDate);
    return () => debouncedFetch.cancel();
  }, [dateRange?.startDate, dateRange?.endDate]);

  // CSV Preparation
  const csvData = reportData.map(emp => {
    const row: any = {
      'Employee Name': emp.name,
      'Total Activity': emp.totalCandidates,
    };
    columns.forEach(col => {
      row[col.name] = emp.counts[col.id] || 0;
    });
    return row;
  });

  // PDF Handler
  const downloadPDF = async () => {
    const table = document.querySelector('.dynamic-report-table');
    if (table) {
      const canvas = await html2canvas(table as HTMLElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('dynamic-individual-report.pdf');
    }
  };

  // Generate a distinct color if DB color is missing
  const getColumnColor = (col: DynamicReportColumn, index: number) => {
    if (col.color) return col.color;
    const hue = (index * 137.508) % 360; 
    return `hsl(${hue}, 70%, 50%)`;
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="w-full max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Individual Report</h2>
        <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {!reportData.length ? (
        <Alert>
          <AlertDescription>No data available for the selected date range.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Chart Section */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                    <Legend wrapperStyle={{ maxHeight: '100px', overflowY: 'auto' }} />
                    {columns.map((col, index) => (
                      <Bar
                        key={col.id}
                        dataKey={`counts.${col.id}`}
                        name={col.name}
                        stackId="a"
                        fill={getColumnColor(col, index)}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card> */}

          {/* Table Section */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Detailed Breakdown</CardTitle>
                <div className="flex space-x-2">
                  <Button asChild variant="secondary">
                    <CSVLink
                      data={csvData}
                      filename="individual-report.csv"
                    >
                      Download CSV
                    </CSVLink>
                  </Button>
                  <Button variant="secondary" onClick={downloadPDF}>Download PDF</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="dynamic-report-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Employee</TableHead>
                      <TableHead className="min-w-[100px] font-bold">Total</TableHead>
                      {columns.map(col => (
                        <TableHead 
                          key={col.id} 
                          className="whitespace-nowrap min-w-[120px] text-xs"
                          title={col.name}
                        >
                          <div className="flex flex-col">
                            <span>{col.name.split(' - ')[0]}</span>
                            <span className="text-gray-500 font-normal">{col.name.split(' - ')[1] || ''}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map(employee => (
                      <TableRow key={employee.name}>
                        <TableCell className="sticky left-0 bg-white font-medium">{employee.name}</TableCell>
                        <TableCell className="font-bold">{employee.totalCandidates}</TableCell>
                        {columns.map(col => (
                          <TableCell key={col.id}>
                            {employee.counts[col.id] || 0}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DynamicIndividualReport;