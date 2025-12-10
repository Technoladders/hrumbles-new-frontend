// src/pages/jobs/ai/results/UanBasicResult.tsx

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Hash, Fingerprint, Copy, Check, Smartphone, CreditCard, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Candidate } from '@/lib/types';

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
  verifiedNumber: string | null; // The mobile/PAN that was verified
}

export const UanBasicResult = ({ result, meta }: UanBasicResultProps) => {
  const [copiedUan, setCopiedUan] = useState<string | null>(null);
  const [copiedVerified, setCopiedVerified] = useState<string | null>(null);

  const handleCopy = (text: string, type: 'uan' | 'verified') => {
    navigator.clipboard.writeText(text);
    if (type === 'uan') {
      setCopiedUan(text);
      toast.success("UAN copied to clipboard");
      setTimeout(() => setCopiedUan(null), 2000);
    } else {
      setCopiedVerified(text);
      toast.success("Number copied to clipboard");
      setTimeout(() => setCopiedVerified(null), 2000);
    }
  };

  // --- NORMALIZATION LOGIC ---
  let records: NormalizedUanRecord[] = [];

  // Extract verified number from meta or result
  const getVerifiedNumber = (item?: any, path?: string) => {
    // Try to get from meta first
    if (meta?.mobile_number) return meta.mobile_number;
    if (meta?.pan_number) return meta.pan_number;
    if (meta?.mobile) return meta.mobile;
    if (meta?.pan) return meta.pan;
    
    // Try from result data
    if (item?.mobile) return item.mobile;
    if (item?.pan) return item.pan;
    if (result?.data?.mobile) return result.data.mobile;
    if (result?.data?.pan) return result.data.pan;
    
    return null;
  };

  // 1. Check for TruthScreen Data Structure
  if (result?.msg?.uan_details && Array.isArray(result.msg.uan_details)) {
    records = result.msg.uan_details.map((item: any) => ({
      uan: item.uan,
      name: item.name,
      dob: item.date_of_birth,
      gender: item.gender,
      sourceLabel: `Via ${item.source || 'Mobile'}`,
      sourceIcon: item.source?.toLowerCase().includes('pan') ? CreditCard : Smartphone,
      verifiedNumber: getVerifiedNumber(item, result.path)
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
      sourceIcon: GlobalIcon,
      verifiedNumber: getVerifiedNumber(null, path)
    }));
  }

  if (records.length === 0) {
    return (
      <Card className="bg-gray-50 border-gray-200 border-dashed">
        <CardContent className="p-4 text-gray-500 text-sm flex items-center gap-2 justify-center">
           <Shield className="text-gray-400" size={16} />
           No UAN records found in this verification result.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record, index) => {
        const SourceIcon = record.sourceIcon;
        const hasDetails = record.name || record.dob;
        const isPan = record.sourceLabel.includes('PAN');

        return (
          <Card key={index} className="bg-white border border-indigo-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                    <Shield className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">Verification Record #{index + 1}</h3>
                    <p className="text-indigo-100 text-xs font-medium opacity-90">EPF UAN Verification</p>
                  </div>
                </div>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 flex items-center gap-1.5 px-3 py-1 shadow-sm hover:bg-white/30 transition-colors">
                  <SourceIcon size={12} /> <span className="text-xs font-semibold">{record.sourceLabel}</span>
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-6 bg-slate-50/50">
              {/* Profile Section */}
              <div className="space-y-6">
                
                {/* UAN Number - Primary Display */}
                <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="text-indigo-600" size={16} />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">UAN Number</span>
                        <CheckCircle2 className="text-green-500 fill-green-50" size={16} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-gray-900 tracking-wider font-mono">
                          {record.uan}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          onClick={() => handleCopy(record.uan, 'uan')}
                          title="Copy UAN"
                        >
                          {copiedUan === record.uan ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verified Number Display */}
                {record.verifiedNumber && (
                  <div className="bg-white rounded-xl p-5 border border-green-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <SourceIcon className="text-green-600" size={16} />
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Verified {isPan ? 'PAN' : 'Mobile Number'}
                          </span>
                          <CheckCircle2 className="text-green-600 fill-green-50" size={16} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-gray-800 tracking-wider font-mono">
                            {record.verifiedNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            onClick={() => handleCopy(record.verifiedNumber!, 'verified')}
                            title={`Copy ${isPan ? 'PAN' : 'Mobile Number'}`}
                          >
                            {copiedVerified === record.verifiedNumber ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Details Section (if available) */}
                {hasDetails && (
                  <div className="bg-white rounded-xl p-5 border border-purple-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User size={16} className="text-purple-600" /> Personal Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {record.name && (
                        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Full Name</span>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {record.name}
                          </div>
                        </div>
                      )}
                      {record.dob && (
                        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Date of Birth</span>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar size={14} className="text-purple-500" /> {record.dob}
                          </div>
                        </div>
                      )}
                      {record.gender && (
                        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Gender</span>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Fingerprint size={14} className="text-purple-500" /> {record.gender}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Need More Details - CTA Section */}
                {!hasDetails && (
                  <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 border border-amber-200">
                        <ArrowRight className="text-amber-700" size={20} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Need More Details?</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          To fetch complete employment details, use <span className="font-bold text-amber-950">Full Employment History</span> with this UAN.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};