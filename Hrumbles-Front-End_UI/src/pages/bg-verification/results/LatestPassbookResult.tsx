// src/pages/jobs/ai/results/LatestPassbookResult.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Calendar, Briefcase, IndianRupee } from 'lucide-react';

export const LatestPassbookResult = ({ result }: { result: any }) => {
  const passbook = result.data?.passbook_data;
  if (!passbook) return <p className="text-sm text-gray-500">No passbook data found in the response.</p>;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User size={16}/> {passbook.name}</CardTitle>
          <CardDescription>DOB: {passbook.date_of_birth} | Gender: {passbook.gender}</CardDescription>
        </CardHeader>
      </Card>

      <h3 className="text-base font-semibold text-gray-800">Employer Passbook Details</h3>
      {passbook.employers?.map((employer: any, i: number) => (
        <Card key={i} className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-indigo-700">{employer.establishment_name}</CardTitle>
            <CardDescription>Member ID: {employer.member_id} | Service: {employer.service_period}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">Employee Share</p>
              <p className="font-semibold">{formatCurrency(employer.total_employee_share)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">Employer Share</p>
              <p className="font-semibold">{formatCurrency(employer.total_employer_share)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">Pension Share</p>
              <p className="font-semibold">{formatCurrency(employer.total_pension_share)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
// 