import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Download } from 'lucide-react';
import { generateUanHistoryPdf } from '@/lib/generateUanHistoryPdf';
import { toast } from 'sonner';
import { Candidate } from '@/components/MagicLinkView/types';

interface Job {
  'Establishment Name': string;
  Doj: string;
  DateOfExitEpf: string;
  MemberId: string;
  'father or Husband Name': string;
  name?: string;
  uan?: string;
}

interface UanHistoryResultProps {
  result: { msg: Job[] };
  candidate: Candidate;
  subStatusId?: string;
}

export const UanHistoryResult = ({ result, candidate, subStatusId }: UanHistoryResultProps) => {
  const history = result.msg;
  if (!Array.isArray(history) || history.length === 0) {
    return <p className="text-gray-500 text-center py-4">No history found.</p>;
  }

  const candidateName = history[0]?.name || candidate.name || 'N/A';
  const fatherName = history[0]?.['father or Husband Name'] || 'N/A';
  const uan = history[0]?.uan || candidate.uan || 'N/A';
  const isEmploymentVerification = subStatusId === 'e3c5787c-cc8f-4565-ad8e-83746a90d569';
  console.log('subStatusId:', subStatusId); // Debug log

  console.log('isEmploymentVerification:', isEmploymentVerification); // Debug log


  const formatDate = (date: string): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleDownloadPdf = () => {
    try {
      generateUanHistoryPdf(candidate, result);
      toast.success('UAN History PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate UAN History PDF');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-indigo-50 p-4 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-indigo-700">
              <User size={18} />
              {candidateName}
            </CardTitle>
            <CardDescription className="text-gray-600">
              UAN: {uan} | Father/Husband: {fatherName} | Status: {isEmploymentVerification ? 'Employment Verification' : 'N/A'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            // disabled={!isEmploymentVerification}
            title={isEmploymentVerification ? 'Download UAN History PDF' : 'Available only in Employment Verification'}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </Button>
        </CardHeader>
      </Card>
      <h3 className="text-xl font-semibold text-gray-800">{candidateName}'s Employment History</h3>
      <div className="grid gap-4">
        {history.map((job: Job, i: number) => (
          <Card key={i} className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gray-50 p-4">
              <CardTitle className="text-base font-medium text-gray-900">{job['Establishment Name'] || 'N/A'}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                <p><strong>Joined:</strong> {job.Doj ? formatDate(job.Doj) : 'N/A'}</p>
                <p><strong>Exited:</strong> {job.DateOfExitEpf === 'NA' ? 'Present' : job.DateOfExitEpf ? formatDate(job.DateOfExitEpf) : 'N/A'}</p>
                <p className="col-span-1 sm:col-span-2"><strong>Member ID:</strong> {job.MemberId || 'N/A'}</p>
                <p className="col-span-1 sm:col-span-2"><strong>Father/Husband:</strong> {job['father or Husband Name'] || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};