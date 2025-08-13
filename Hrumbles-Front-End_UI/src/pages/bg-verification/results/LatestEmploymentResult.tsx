import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, User, Calendar, LogOut } from 'lucide-react';

export const LatestEmploymentResult = ({ result }: { result: any }) => {
  const empData = result.data?.employment_data;
  if (!empData) return <p className="text-gray-500 text-center py-4">No employment data found.</p>;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-indigo-50 p-4">
        <CardTitle className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
          <Building size={18} />
          {empData.establishment_name || 'N/A'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3 text-gray-700">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <span className="font-medium">Name:</span> {empData.name || 'N/A'}
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <span className="font-medium">Joined:</span> {empData.date_of_joining || 'N/A'}
        </div>
        <div className="flex items-center gap-2">
          <LogOut size={16} className="text-gray-400" />
          <span className="font-medium">Exited:</span> {empData.date_of_exit || 'Present'}
        </div>
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <span className="font-medium">Member ID:</span> {empData.member_id || 'N/A'}
        </div>
      </CardContent>
    </Card>
  );
};