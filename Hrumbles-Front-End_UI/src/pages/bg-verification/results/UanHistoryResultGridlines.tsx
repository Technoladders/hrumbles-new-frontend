// src/pages/jobs/ai/results/UanHistoryResultGridlines.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Download, User, Users, Calendar, Building2, Hash } from 'lucide-react';
import { generateUanHistoryPdfGridlines } from '@/lib/generateUanHistoryPdfGridlines';
import { toast } from 'sonner';
import { Candidate } from '@/lib/types';

interface GridlinesJob {
  establishment_name: string;
  date_of_joining: string;
  date_of_exit?: string; // Optional
  member_id: string;
  name?: string;
  guardian_name?: string;
}

const formatDate = (date?: string): string => {
  if (!date || date === 'NA') return 'Present';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};

interface UanHistoryResultGridlinesProps {
    result: any; // The full response from Gridlines
    meta: { inputValue: string };
    candidate: Candidate;
}

export const UanHistoryResultGridlines = ({ result, meta, candidate }: UanHistoryResultGridlinesProps) => {
  const history = result?.data?.employment_data;

  if (!Array.isArray(history) || history.length === 0) {
    const message = result?.data?.message || 'No employment history found for this UAN.';
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-sm text-red-700">
          {message}
        </CardContent>
      </Card>
    );
  }

  const candidateName = history[0]?.name || 'N/A';
  const guardianName = history[0]?.guardian_name || 'N/A';
  
  const handleDownloadPdf = () => {
    try {
      generateUanHistoryPdfGridlines(candidate, result, meta);
      toast.success('UAN History PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating UAN History PDF from Gridlines:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <Card className="bg-green-50 border border-green-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shadow-sm border border-green-200 shrink-0">
              <History className="text-green-700 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Employment History</h3>
              <p className="text-xs text-green-700 font-medium mt-1">
                Verified via UAN: <span className="font-mono text-gray-600 bg-white/50 px-1 rounded border border-green-100">{meta.inputValue}</span>
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPdf} 
            className="bg-white border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 shadow-sm shrink-0"
          >
            <Download size={16} className="mr-2" />
            Download Report
          </Button>
        </div>

        <div className="h-px bg-green-200/50 w-full mb-6"></div>

        {/* Candidate Identity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Name Box */}
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-green-100/50">
                <div className="mt-0.5 p-1.5 bg-white rounded-full border border-green-100 shadow-sm shrink-0">
                    <User size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Candidate Name</p>
                    <p className="text-sm font-bold text-gray-900 break-words leading-tight">{candidateName}</p>
                </div>
            </div>

            {/* Guardian Box */}
            {guardianName !== 'N/A' && (
                <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-green-100/50">
                    <div className="mt-0.5 p-1.5 bg-white rounded-full border border-green-100 shadow-sm shrink-0">
                        <Users size={16} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Guardian Name</p>
                        <p className="text-sm font-bold text-gray-900 break-words leading-tight">{guardianName}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Timeline / History List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Previous Experience</span>
             <div className="h-px bg-green-200 flex-1"></div>
          </div>

          {history.map((job: GridlinesJob, i: number) => (
            <div 
                key={i} 
                className="bg-white/50 border border-green-100 rounded-xl p-4 hover:bg-white hover:border-green-200 transition-colors shadow-sm"
            >
              {/* Company Name */}
              <div className="flex items-start gap-2.5 mb-3">
                 <Building2 size={18} className="text-amber-600 mt-0.5 shrink-0" />
                 <p className="text-sm font-bold text-gray-800 leading-snug">
                    {job.establishment_name || 'N/A'}
                 </p>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 pl-7">
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <div className="flex gap-1 text-gray-700">
                        <span className="font-semibold text-green-700">{formatDate(job.date_of_joining)}</span>
                        <span className="text-gray-400">to</span>
                        <span className={`font-semibold ${job.date_of_exit ? 'text-gray-700' : 'text-green-600'}`}>
                            {formatDate(job.date_of_exit)}
                        </span>
                    </div>
                  </div>

                  {/* Member ID */}
                  <div className="flex items-center gap-2 text-xs">
                     <Hash size={14} className="text-gray-400 shrink-0" />
                     <span className="font-medium text-gray-500">Member ID:</span>
                     <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-100 text-black-900 break-all">
                        {job.member_id || 'N/A'}
                     </code>
                  </div>
              </div>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
};