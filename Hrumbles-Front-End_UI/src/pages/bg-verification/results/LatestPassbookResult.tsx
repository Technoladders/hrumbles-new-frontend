import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Download } from 'lucide-react';
import { generatePassbookPdf } from '@/lib/generatePassbookPdf';
import { toast } from 'sonner';
import { Candidate } from '@/components/MagicLinkView/types';

interface PassbookEntry {
  year: string;
  month: string;
  description: string;
  employee_share: string;
  employer_share: string;
  pension_share: string;
  status: string;
  date_of_approval: string;
}

interface Employer {
  establishment_name: string;
  member_id: string;
  service_period: string;
  date_of_joining: string;
  total_employee_share: number;
  total_employer_share: number;
  total_pension_share: number;
  passbook_entries: PassbookEntry[];
}

interface PassbookData {
  name: string;
  date_of_birth: string;
  gender: string;
  uan: string;
  employers: Employer[];
}

interface PassbookResult {
  data?: {
    passbook_data: PassbookData;
  };
}

interface LatestPassbookResultProps {
  result: PassbookResult;
  candidate: Candidate;
  meta: { inputValue: string };
  subStatusId?: string;
}

export const LatestPassbookResult = ({ result, meta, candidate, subStatusId }: LatestPassbookResultProps) => {
  const passbook = result.data?.passbook_data;

  if (!passbook || !passbook.employers || passbook.employers.length === 0) {
    return <p className="text-gray-500 text-center py-4">No passbook data found.</p>;
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount; // Handle comma-separated strings
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
  };

  const handleDownloadPdf = () => {
    try {
      console.log('Result object passed to PDF:', result); // Debug log
      if (!result.data || !result.data.passbook_data || !result.data.passbook_data.name) {
        throw new Error('Invalid passbook data: Missing name or data structure');
      }
      generatePassbookPdf(candidate, result);
      toast.success('Passbook PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate passbook PDF: ${error.message}`);
    }
  };

return (
    <div className="space-y-4">
       <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 flex-row justify-between items-center p-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
              <User size={18} /> {passbook.name || 'N/A'}
            </CardTitle>
            <CardDescription>UAN: {passbook.uan || 'N/A'} | DOB: {passbook.date_of_birth || 'N/A'}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download size={16} className="mr-2" /> Download Passbook
          </Button>
        </CardHeader>
      </Card>

      <h3 className="text-xl font-semibold text-gray-800">Employer Passbook Details</h3>
      <div className="space-y-4">
        {passbook.employers.map((employer: Employer, i: number) => (
          <Card key={i} className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 p-4">
              <CardTitle className="text-base font-semibold text-gray-900">{employer.establishment_name || 'N/A'}</CardTitle>
              <CardDescription>Member ID: {employer.member_id || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <p className="text-xs text-gray-500">Employee Share</p>
                  <p className="font-semibold">{formatCurrency(employer.total_employee_share || 0)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <p className="text-xs text-gray-500">Employer Share</p>
                  <p className="font-semibold">{formatCurrency(employer.total_employer_share || 0)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <p className="text-xs text-gray-500">Pension Share</p>
                  <p className="font-semibold">{formatCurrency(employer.total_pension_share || 0)}</p>
                </div>
              </div>
              <h4 className="text-md font-semibold text-gray-700 mt-4">Transaction History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Year</th>
                      <th className="px-4 py-2">Month</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Emp. Share</th>
                      <th className="px-4 py-2">Emp. Share</th> {/* Typo: Should be "Employer Share" */}
                      <th className="px-4 py-2">Pension Share</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Approval Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employer.passbook_entries.map((entry, j) => (
                      <tr key={j} className="border-t">
                        <td className="px-4 py-2">{entry.year}</td>
                        <td className="px-4 py-2">{entry.month}</td>
                        <td className="px-4 py-2">{entry.description}</td>
                        <td className="px-4 py-2">{formatCurrency(entry.employee_share)}</td>
                        <td className="px-4 py-2">{formatCurrency(entry.employer_share)}</td>
                        <td className="px-4 py-2">{formatCurrency(entry.pension_share)}</td>
                        <td className="px-4 py-2">{entry.status}</td>
                        <td className="px-4 py-2">{entry.date_of_approval ? formatDate(entry.date_of_approval) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Helper function to format date
  function formatDate(date: string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
};