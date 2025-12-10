// src/pages/jobs/ai/results/LatestEmploymentResult.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Building, User, Calendar, IdCard, CheckCircle2 } from 'lucide-react';

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const LatestEmploymentResult = ({ result, meta }: { result: any; meta?: any }) => {
  const responseData = result?.data;
  
  if (!responseData) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-sm text-red-700">
          No data available.
        </CardContent>
      </Card>
    );
  }

  const isMobileType = !!responseData.uan_data;
  let latestEmp: any = null;
  let uan: string = meta?.inputValue || 'N/A';
  let sources: string[] | undefined;

  if (isMobileType) {
    const uanDataArray = responseData.uan_data;
    if (uanDataArray && uanDataArray.length > 0) {
      latestEmp = uanDataArray[0]?.latest_employment_data;
      uan = uanDataArray[0]?.uan || uan;
      sources = uanDataArray[0]?.sources;
    }
  } else {
    latestEmp = responseData.employment_data;
  }

  if (!latestEmp) {
    const message = responseData.message || 'No latest employment record found.';
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-sm text-red-700">
          {message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-50 border border-green-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shadow-sm border border-green-200 shrink-0">
            <Building className="text-green-700 h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Latest Employment Record</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <p className="text-xs font-medium text-green-700">Verified successfully</p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-green-200/50 w-full mb-6"></div>

        {/* Candidate Identity Section */}
        {/* UPDATED: Added flex-wrap and adjusted layout for better UAN visibility */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-1 p-1.5 bg-white rounded-full border border-green-100 shadow-sm shrink-0">
              <User size={18} className="text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                Candidate Name
              </p>
              <p className="text-base font-bold text-gray-900 break-words leading-tight">
                {latestEmp.name || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-green-100">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Verified UAN:</span>
            <code className="text-sm font-mono font-semibold text-gray-800 tracking-wide">
              {uan}
            </code>
          </div>
        </div>

        {/* Employment Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 bg-white/40 rounded-xl p-5 border border-green-100/50">
          
          {/* Current Company */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-green-800/70">
              <Building size={14} className="shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Current Company</span>
            </div>
            <p className="text-sm font-bold text-gray-800 pl-5.5 leading-snug">
              {latestEmp.establishment_name || 'N/A'}
            </p>
          </div>

          {/* Date of Joining */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-green-800/70">
              <Calendar size={14} className="shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Date of Joining</span>
            </div>
            <p className="text-sm font-bold text-green-700 pl-5.5">
              {formatDate(latestEmp.date_of_joining)}
            </p>
          </div>

          {/* Member ID */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center gap-2 text-green-800/70">
              <IdCard size={14} className="shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Member ID</span>
            </div>
            <div className="pl-5.5">
               <code className="inline-block px-2.5 py-1 bg-white border border-green-200 rounded text-xs font-mono text-gray-600 shadow-sm break-all">
                {latestEmp.member_id || 'N/A'}
              </code>
            </div>
          </div>
        </div>

        {/* Footer Source Badge */}
        {sources && sources.length > 0 && (
          <div className="mt-6 flex justify-end">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                Source: {sources.join(', ')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};