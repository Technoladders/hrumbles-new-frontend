import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CalendarDays, Building2, CheckCircle2, AlertTriangle, Fingerprint } from "lucide-react";
import { format } from "date-fns";
import ExperienceComparisonView from "./ExperienceComparisonView";

interface Props {
  employee: any;
  data: any; // The latest verification record
}

const EmploymentVerificationCard: React.FC<Props> = ({ employee, data }) => {
  const experiences = employee.experiences || [];
  const history = data?.verified_history || []; // API Data
  
  // Format Date Helper
  const fmt = (d: string) => d ? format(new Date(d), 'MMM yyyy') : 'Present';

  return (
    <div className="space-y-6 mt-4">
      {/* INFO BANNER */}
      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-full">
              <Fingerprint className="h-5 w-5 text-blue-700 dark:text-blue-300" />
           </div>
           <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                 UAN: {data?.uan_used || employee.uan_number || "Not Linked"}
              </p>
              <p className="text-xs text-gray-500">
                 {data ? `Verified on ${format(new Date(data.created_at), 'dd MMM yyyy')}` : "Not verified yet"}
              </p>
           </div>
        </div>
        {data && (
           <Badge variant={data.verification_status === 'success' ? 'default' : 'destructive'}>
             {data.verification_status === 'success' ? 'Records Found' : 'No Records'}
           </Badge>
        )}
      </div>

 {data && (
  <div className="mt-8">
    <ExperienceComparisonView 
      claimedExperience={employee.experiences || []}
      verifiedHistoryJson={data.verified_history} 
    />
  </div>
)}
    </div>
  );
};

export default EmploymentVerificationCard;