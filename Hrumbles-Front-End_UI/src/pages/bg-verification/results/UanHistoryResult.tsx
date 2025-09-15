// src/pages/jobs/ai/results/UanHistoryResult.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Download } from 'lucide-react';
import { generateUanHistoryPdf } from '@/lib/generateUanHistoryPdf';
import { toast } from 'sonner';
import { Candidate } from '@/lib/types';

interface Job {
  'Establishment Name': string;
  Doj: string;
  DateOfExitEpf: string;
  MemberId: string;
  name?: string;
}

const formatDate = (date: string): string => {
  if (!date || date === 'NA') return 'Present';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};

interface UanHistoryResultProps {
    result: { msg: Job[] };
    meta: { inputValue: string };
    candidate: Candidate;
}

export const UanHistoryResult = ({ result, meta, candidate }: UanHistoryResultProps) => {
  const history = result.msg;
  if (!Array.isArray(history) || history.length === 0) {
    return <p className="text-gray-500">No employment history found for this UAN.</p>;
  }

  const handleDownloadPdf = () => {
    try {
      generateUanHistoryPdf(candidate, result);
      toast.success('UAN History PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating UAN History PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <Card className="bg-green-50 border-green-200 shadow-sm">
      <CardHeader className="p-4 flex-row justify-between items-center border-b border-green-200">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-800">
            <History size={18} className="text-gray-600"/>
            Employment History
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-1">
            Verified using UAN: {meta.inputValue}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="bg-white">
          <Download size={16} className="mr-2" />
          Download Report
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {history.map((job: Job, i: number) => (
          <div key={i} className="pt-2 first:pt-0">
            <p className="font-bold text-amber-700">{job['Establishment Name'] || 'N/A'}</p>
            <div className="grid grid-cols-2 gap-x-4  text-green-800 mt-1">
                <p><strong>Joined:</strong> {formatDate(job.Doj)}</p>
                <p><strong>Exited:</strong> {formatDate(job.DateOfExitEpf)}</p>
                <p className="col-span-2"><strong>Member ID:</strong> {job.MemberId || 'N/A'}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};