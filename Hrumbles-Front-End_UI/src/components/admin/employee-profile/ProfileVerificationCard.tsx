import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MapPin, CreditCard, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  employee: any;
  data: any; // The verification record
}

const ProfileVerificationCard: React.FC<Props> = ({ employee, data }) => {
  if (!data) return null;

  const vInfo = {
    name: data.verified_full_name,
    dob: data.verified_dob,
    gender: data.verified_gender,
    pan: data.verified_documents?.pan?.[0]?.value || 'N/A',
    addresses: data.verified_addresses || []
  };

  const isMatch = (v1: string, v2: string) => (v1 || '').toLowerCase().trim() === (v2 || '').toLowerCase().trim();
  const formatDate = (d: string) => d ? format(new Date(d), 'dd MMM yyyy') : 'N/A';

  const comparisons = [
    { label: "Full Name", sys: `${employee.first_name} ${employee.last_name}`, ver: vInfo.name, icon: User },
    { label: "Date of Birth", sys: formatDate(employee.date_of_birth), ver: formatDate(vInfo.dob), icon: Calendar },
    { label: "Gender", sys: employee.gender, ver: vInfo.gender, icon: User },
    { label: "PAN", sys: employee.pan_number, ver: vInfo.pan, icon: CreditCard },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
      {/* Comparison Table */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-3"><CardTitle className="text-sm">Identity Match</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs uppercase">
              <tr><th className="px-4 py-2 text-left">Field</th><th className="px-4 py-2 text-left">System</th><th className="px-4 py-2 text-left">Verified</th><th className="px-4 py-2">Match</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {comparisons.map((c, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 flex items-center gap-2 text-gray-600"><c.icon className="h-3 w-3" /> {c.label}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{c.sys || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.ver || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {isMatch(c.sys, c.ver) ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto"/> : <XCircle className="h-4 w-4 text-red-500 mx-auto"/>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Addresses */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-3 flex flex-row justify-between">
            <CardTitle className="text-sm">Verified Addresses</CardTitle>
            <Badge variant="outline">{vInfo.addresses.length} Found</Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
          {vInfo.addresses.map((addr: any, i: number) => (
            <div key={i} className="text-sm border p-3 rounded bg-gray-50/50">
               <p className="text-gray-700 dark:text-gray-300">{addr.detailed_address || addr.address}</p>
               <div className="flex gap-2 mt-2">
                 <Badge variant="secondary" className="text-[10px]">{addr.state}</Badge>
                 <Badge variant="secondary" className="text-[10px]">{addr.pincode}</Badge>
                 <span className="text-xs text-gray-400 ml-auto">{addr.date_of_reporting}</span>
               </div>
            </div>
          ))}
          {vInfo.addresses.length === 0 && <p className="text-gray-400 text-center italic">No records found</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileVerificationCard;