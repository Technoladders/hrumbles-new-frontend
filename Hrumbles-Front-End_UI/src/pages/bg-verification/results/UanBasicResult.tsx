// src/pages/jobs/ai/results/UanBasicResult.tsx

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Hash, Fingerprint, Copy, Check, Smartphone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface UanBasicResultProps {
  result: any;
  meta?: any;
  candidate?: Candidate;
}

interface NormalizedUanRecord {
  uan: string;
  name: string | null;
  dob: string | null;
  gender: string | null;
  sourceLabel: string; // 'Via Mobile', 'Via PAN', etc.
  sourceIcon: any;
}

export const UanBasicResult = ({ result }: UanBasicResultProps) => {
  const [copiedUan, setCopiedUan] = useState<string | null>(null);

  const handleCopy = (uan: string) => {
    navigator.clipboard.writeText(uan);
    setCopiedUan(uan);
    toast.success("UAN copied to clipboard");
    setTimeout(() => setCopiedUan(null), 2000);
  };

  // --- NORMALIZATION LOGIC ---
  let records: NormalizedUanRecord[] = [];

  // 1. Check for TruthScreen Data Structure
  if (result?.msg?.uan_details && Array.isArray(result.msg.uan_details)) {
    records = result.msg.uan_details.map((item: any) => ({
      uan: item.uan,
      name: item.name,
      dob: item.date_of_birth,
      gender: item.gender,
      sourceLabel: `Via ${item.source || 'Mobile'}`,
      sourceIcon: item.source?.toLowerCase().includes('pan') ? CreditCard : Smartphone
    }));
  } 
  // 2. Check for Gridlines Data Structure
  else if (result?.data?.uan_list && Array.isArray(result.data.uan_list)) {
    const uanList = result.data.uan_list;
    const message = result.data.message?.toLowerCase() || '';
    const path = result.path?.toLowerCase() || '';

    // Determine Source based on Path or Message
    let globalSourceLabel = 'Via Mobile';
    let GlobalIcon = Smartphone;

    if (path.includes('fetch-by-pan') || message.includes('fetched from pan')) {
      globalSourceLabel = 'Via PAN';
      GlobalIcon = CreditCard;
    } else if (path.includes('fetch-uan') || message.includes('fetched from mobile')) {
      globalSourceLabel = 'Via Mobile';
      GlobalIcon = Smartphone;
    }

    records = uanList.map((uan: string) => ({
      uan: uan,
      name: null, // Gridlines basic lookup doesn't return name
      dob: null,  // Gridlines basic lookup doesn't return DOB
      gender: null,
      sourceLabel: globalSourceLabel,
      sourceIcon: GlobalIcon
    }));
  }

  if (records.length === 0) {
    return (
      <Card className="bg-gray-50 border-gray-200 border-dashed">
        <CardContent className="p-4 text-gray-500 text-sm flex items-center gap-2">
           No UAN records found in this verification result.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record, index) => {
        const SourceIcon = record.sourceIcon;
        const hasDetails = record.name || record.dob;

        return (
          <Card key={index} className="bg-white border-indigo-100 shadow-sm overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="bg-indigo-50/40 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                <Hash size={12} /> Record #{index + 1}
              </span>
              <Badge variant="outline" className="text-[10px] bg-white text-gray-600 border-indigo-200 flex items-center gap-1 shadow-sm">
                 <SourceIcon size={10} /> {record.sourceLabel}
              </Badge>
            </div>
            
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* UAN Section */}
                <div className="flex-1">
                  <span className="text-xs text-gray-500 mb-0.5 block">UAN Number</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-800 tracking-wide font-mono">
                      {record.uan}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleCopy(record.uan)}
                      title="Copy UAN"
                    >
                      {copiedUan === record.uan ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>

                {/* Details Section (Only renders if data exists) */}
                {hasDetails && (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
                    {record.name && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 block">Name</span>
                        <div className="font-medium text-gray-800 flex items-center gap-1.5">
                          <User size={12} className="text-indigo-400" /> {record.name}
                        </div>
                      </div>
                    )}
                    {record.dob && (
                      <div>
                        <span className="text-xs text-gray-500 block">DOB</span>
                        <div className="font-medium text-gray-800 flex items-center gap-1.5">
                          <Calendar size={12} className="text-indigo-400" /> {record.dob}
                        </div>
                      </div>
                    )}
                    {record.gender && (
                      <div>
                        <span className="text-xs text-gray-500 block">Gender</span>
                        <div className="font-medium text-gray-800 flex items-center gap-1.5">
                          <Fingerprint size={12} className="text-indigo-400" /> {record.gender}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Helper text for Gridlines/Empty Details */}
              {!hasDetails && (
                <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
                    <p className="text-[11px] text-gray-500 italic flex items-center gap-1">
                        * To fetch full details Use <strong>Full Employment History</strong> with this UAN to verify details.
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};