// src/pages/jobs/ai/results/LatestEmploymentResult.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, User, Calendar, LogOut, Info } from 'lucide-react';

export const LatestEmploymentResult = ({ result }: { result: any }) => {
  const empData = result.data?.employment_data;
  if (!empData) return <p className="text-sm text-gray-500">No employment data found in the response.</p>;

  return (
    <div className="animate-fade-in">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-base text-indigo-700 flex items-center gap-2">
            <Building size={16}/> {empData.establishment_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center gap-3">
            <User size={14} className="text-gray-400" />
            <span className="font-medium">Name:</span>
            <span>{empData.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-gray-400" />
            <span className="font-medium">Joined:</span>
            <span>{empData.date_of_joining}</span>
          </div>
          <div className="flex items-center gap-3">
            <LogOut size={14} className="text-gray-400" />
            <span className="font-medium">Exited:</span>
            <span>{empData.date_of_exit || 'Present'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Info size={14} className="text-gray-400" />
            <span className="font-medium">Member ID:</span>
            <span>{empData.member_id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
// 