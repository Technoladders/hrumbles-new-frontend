// src/pages/jobs/ai/results/LatestEmploymentResult.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react';

export const LatestEmploymentResult = ({ result }: { result: any }) => {
  const empData = result.data?.employment_data;
  if (!empData) return <p className="text-gray-500 text-center py-4">No employment data found.</p>;

  return (
    <Card className="bg-green-50 border-green-200 shadow-sm">
      <CardContent className="p-4 text-sm">
        <div className="flex items-center gap-2 text-base font-bold text-gray-800 mb-2">
            <Building size={18} className="text-gray-600"/>
            <h3>Latest Employment Record</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div><span className="font-semibold text-gray-600">Company:</span> {empData.establishment_name || 'N/A'}</div>
            <div><span className="font-semibold text-gray-600">Name:</span> {empData.name || 'N/A'}</div>
            <div><span className="font-semibold text-gray-600">Joined:</span> {empData.date_of_joining || 'N/A'}</div>
            <div><span className="font-semibold text-gray-600">Exited:</span> {empData.date_of_exit || 'Present'}</div>
            <div className="md:col-span-2"><span className="font-semibold text-gray-600">Member ID:</span> {empData.member_id || 'N/A'}</div>
        </div>
      </CardContent>
    </Card>
  );
};