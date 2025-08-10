// src/pages/jobs/ai/VerificationResultDisplay.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Briefcase, XCircle, AlertTriangle } from 'lucide-react';
import { LatestEmploymentResult } from './results/LatestEmploymentResult';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { LatestPassbookResult } from './results/LatestPassbookResult';

interface Props {
  resultData: any;
  verificationType: string;
}

// This helper function is for displaying TruthScreen's UAN lookup result
const renderUanBasic = (data: any) => {
  const uanDetails = data.msg?.uan_details?.[0];
  const empDetails = data.msg?.employment_details?.[0];
  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User size={16}/> UAN Details</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>UAN:</strong> {uanDetails?.uan}</p>
          <p><strong>Name:</strong> {uanDetails?.name}</p>
          <p><strong>DOB:</strong> {uanDetails?.date_of_birth}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase size={16}/> Latest Employment</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Company:</strong> {empDetails?.establishment_name}</p>
          <p><strong>Joining Date:</strong> {empDetails?.date_of_joining}</p>
          <p><strong>Member ID:</strong> {empDetails?.member_id}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// This helper function is for displaying TruthScreen's full employment history
const renderUanHistory = (data: any) => {
  const history = data.msg;
  if (!Array.isArray(history) || history.length === 0) return <p>No history data found.</p>;
  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-base font-semibold text-gray-800">{history[0]?.name}'s Employment History</h3>
      {history.map((job: any, i: number) => (
        <Card key={i} className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-indigo-700">{job['Establishment Name']}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
            <div><span className="font-medium text-gray-500">Joined:</span> {job.Doj}</div>
            <div><span className="font-medium text-gray-500">Exited:</span> {job.DateOfExitEpf === 'NA' ? 'Present' : job.DateOfExitEpf}</div>
            <div className="col-span-2"><span className="font-medium text-gray-500">Member ID:</span> {job.MemberId}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// --- THIS IS THE REFACTORED AND CORRECTED COMPONENT ---
export const VerificationResultDisplay = ({ resultData, verificationType }: Props) => {
  if (!resultData) return null;

  // 1. First, check if the verification was successful using our central utility.
  if (isVerificationSuccessful(resultData, verificationType) || resultData.data?.code == '1022') {
    // If successful, render the correct display based on the type.
    switch (verificationType) {
      case 'mobile_to_uan':
      case 'pan_to_uan':
        return renderUanBasic(resultData);
      case 'uan_full_history':
        return renderUanHistory(resultData);
      case 'latest_employment_mobile':
      case 'latest_employment_uan': // <-- ADD THIS CASE
        return <LatestEmploymentResult result={resultData} />;
      case 'latest_passbook_mobile':
        return <LatestPassbookResult result={resultData} />;
      default:
        // Fallback for an unknown successful type
        return <pre className="text-xs">{JSON.stringify(resultData.msg || resultData.data, null, 2)}</pre>;
    }
  }

  // 2. If not successful, handle the various non-success states.
  
  // Handle "Not Found" for both Gridlines (code 1015) and TruthScreen (status 9)
  if (resultData.data?.code === '1015' || resultData.data?.code === '1023' || resultData.status === 9) {
    return <div className="..."><XCircle size={16}/> {resultData.msg || resultData.data.message}</div>;
  }
  
  // Handle any other message (likely a "pending" or temporary error state)
  return <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 p-3 bg-yellow-50 rounded-md"><AlertTriangle size={16}/> {resultData.message || 'Verification in progress...'}</div>;
};