// src/pages/jobs/ai/results/UanBasicResult.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Briefcase } from 'lucide-react';

export const UanBasicResult = ({ result }: { result: any }) => {
  const uanDetails = result.msg?.uan_details?.[0];
  const empDetails = result.msg?.employment_details?.[0];

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User size={16}/> UAN Details</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>UAN:</strong> {uanDetails?.uan}</p>
          <p><strong>Name:</strong> {uanDetails?.name}</p>
          <p><strong>DOB:</strong> {uanDetails?.date_of_birth}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Briefcase size={16}/> Latest Employment</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Company:</strong> {empDetails?.establishment_name}</p>
          <p><strong>Joining Date:</strong> {empDetails?.date_of_joining}</p>
          <p><strong>Member ID:</strong> {empDetails?.member_id}</p>
        </CardContent>
      </Card>
    </div>
  );
};
// 