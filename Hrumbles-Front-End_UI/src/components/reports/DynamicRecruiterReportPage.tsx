import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDynamicRecruiterReport, DynamicRecruiterPerformanceData } from '@/hooks/useDynamicRecruiterReport';
import DynamicRecruiterPerformanceTable from './DynamicRecruiterPerformanceTable';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const DynamicRecruiterReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });
  const [data, setData] = useState<DynamicRecruiterPerformanceData[]>([]);
  const { isLoading, error, fetchReportData } = useDynamicRecruiterReport();

  useEffect(() => {
    const loadData = async () => {
      if (dateRange.startDate && dateRange.endDate) {
        const reportData = await fetchReportData(dateRange.startDate, dateRange.endDate);
        setData(reportData);
      }
    };
    loadData();
  }, [dateRange, fetchReportData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Recruiter Performance Report</h2>
        <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner size={36} /></div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-4 rounded-md">Error: {error}</div>
      ) : (
        <DynamicRecruiterPerformanceTable data={data} />
      )}
    </div>
  );
};

export default DynamicRecruiterReportPage;