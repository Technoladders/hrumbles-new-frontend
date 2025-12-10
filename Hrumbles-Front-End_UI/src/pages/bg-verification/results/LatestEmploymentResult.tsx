// src/pages/jobs/ai/results/LatestEmploymentResult.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Building, User, Calendar, IdCard } from 'lucide-react';

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

  console.log("latestEmp:", latestEmp);

  return (
    <Card className="bg-green-50 border-green-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
          <Building size={20} className="text-green-700" />
          <h3>Latest Employment Record</h3>
        </div>
        {/* Candidate Name & UAN */}
        <div className="mb-4 pb-3 border-b border-green-100">
          <p className="flex items-center gap-2 text-sm">
            <User size={16} className="text-gray-600" />
            <span className="font-medium">Name:</span> {latestEmp.name || 'N/A'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Verified via UAN: <code className="bg-white px-2 py-0.5 rounded border">{uan}</code>
          </p>
        </div>
        {/* Employment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Building size={16} className="text-gray-500 mt-0.5" />
            <div>
              <span className="font-medium text-gray-600">Current Company:</span>
              <p className="font-semibold text-gray-800">{latestEmp.establishment_name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={16} className="text-gray-500 mt-0.5" />
            <div>
              <span className="font-medium text-gray-600">Date of Joining:</span>
              <p className="font-semibold text-green-700">{formatDate(latestEmp.date_of_joining)}</p>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <IdCard size={16} className="text-gray-500" />
            <div>
              <span className="font-medium text-gray-600">Member ID:</span>
              <code className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                {latestEmp.member_id || 'N/A'}
              </code>
            </div>
          </div>
        </div>
        {/* Source Badge */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-green-100">
            <span className="text-xs font-medium text-gray-600">Source:</span>
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {sources.join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};