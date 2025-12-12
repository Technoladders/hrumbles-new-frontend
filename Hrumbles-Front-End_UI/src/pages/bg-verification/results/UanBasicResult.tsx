// src/pages/jobs/ai/results/UanBasicResult.tsx

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Hash, Fingerprint, Copy, Check, Smartphone, CreditCard, Shield, ArrowRight, CheckCircle2, History, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Candidate } from '@/lib/types';

interface UanBasicResultProps {
  result: any;
  meta?: any;
  candidate?: Candidate;
  onNavigateToVerification?: (verificationType: string, prefillData: any) => void;
  hideNavigationButtons?: boolean; 
}

interface NormalizedUanRecord {
  uan: string;
  name: string | null;
  dob: string | null;
  gender: string | null;
  sourceLabel: string;
  sourceIcon: any;
  verifiedNumber: string | null;
}

export const UanBasicResult = ({ result, meta, onNavigateToVerification, hideNavigationButtons = false }: UanBasicResultProps) => {
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

  const handleNavigateToLatestEmployment = (uan: string) => {
    if (onNavigateToVerification) {
      onNavigateToVerification('latest_employment_uan', { uan });
    }
  };

  const handleNavigateToFullHistory = (uan: string) => {
    if (onNavigateToVerification) {
      onNavigateToVerification('uan_full_history_gl', { uan });
    }
  };

  // --- NORMALIZATION LOGIC ---
  let records: NormalizedUanRecord[] = [];

  // Extract verified number from meta or result
  const getVerifiedNumber = (item?: any, path?: string) => {
    // 1. Check Meta (Input passed from parent)
    if (meta?.mobile) return meta.mobile;
    if (meta?.pan) return meta.pan;
    if (meta?.mobile_number) return meta.mobile_number;
    if (meta?.pan_number) return meta.pan_number;
    
    // Check inputValue (Common for historical/saved results)
    if (meta?.inputValue) return meta.inputValue; 
    
    // 2. Check Item (Specific record details)
    if (item?.mobile) return item.mobile;
    if (item?.pan) return item.pan;
    if (item?.input_mobile) return item.input_mobile;
    
    // 3. Check Result Data (Global API response)
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
      name: null,
      dob: null,
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
        const isPan = record.sourceLabel.toLowerCase().includes('pan');
        
        return (
          <Card key={index} className="bg-white border border-indigo-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            {/* Header with gradient */}
{/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                {/* Left Side: Title & Icon */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
                    <Shield className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">Verification Record #{index + 1}</h3>
                    <p className="text-indigo-100 text-xs font-medium opacity-90">EPF UAN Verification</p>
                  </div>
                </div>

                {/* Right Side: Verified Number & Badge */}
                <div className="flex flex-col items-end sm:flex-row sm:items-center gap-2 ml-4">
                  
                  {/* Verified Number Display (Moved Here) */}
                  {record.verifiedNumber && (
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-md px-2.5 py-1 border border-white/10 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider hidden sm:inline-block">
                          {isPan ? 'PAN' : 'Mobile'}:
                        </span>
                        <SourceIcon size={12} className="text-indigo-200 sm:hidden" />
                        <span className="text-xs font-mono font-medium text-white tracking-wide">
                          {record.verifiedNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-3.5 w-3.5 ml-0.5 text-indigo-200 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleCopy(record.verifiedNumber!, 'verified'); }}
                          title="Copy Number"
                        >
                          {copiedVerified === record.verifiedNumber ? <Check size={10} className="text-green-300" /> : <Copy size={10} />}
                        </Button>
                    </div>
                  )}

                  {/* Via Mobile/PAN Badge */}
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 flex items-center gap-1.5 px-3 py-1 shadow-sm hover:bg-white/30 transition-colors flex-shrink-0">
                    <SourceIcon size={12} /> <span className="text-xs font-semibold">{record.sourceLabel}</span>
                  </Badge>
                </div>
              </div>
            </div>
            
            <CardContent className="p-4 sm:p-6 bg-slate-50/50">
              <div className="space-y-6">
                
                {/* --- CHANGED: Single Full-Width UAN Card (Grid Removed) --- */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-indigo-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                            <Hash className="text-indigo-600 flex-shrink-0" size={16} />
                            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">UAN Number</span>
                            <CheckCircle2 className="text-green-500 fill-green-50 flex-shrink-0" size={16} />
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wider font-mono truncate">
                                {record.uan}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                onClick={() => handleCopy(record.uan, 'uan')}
                                title="Copy UAN"
                            >
                                {copiedUan === record.uan ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Details Section */}
                {hasDetails && (
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-purple-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User size={16} className="text-purple-600" /> Personal Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {record.name && (
                        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mb-1 whitespace-nowrap">Full Name</span>
                          <div className="font-semibold text-gray-900 text-xs flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {record.name}
                          </div>
                        </div>
                      )}
                      {record.dob && (
                        <div className="bg-purple-50/50 rounded-lg p-2 border border-purple-100/50 min-w-0">
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mb-1 whitespace-nowrap">Date of Birth</span>
                          <div className="font-semibold text-gray-900 text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap">
                            <Calendar size={12} className="text-purple-500 flex-shrink-0" /> {record.dob}
                          </div>
                        </div>
                      )}
                      {record.gender && (
                        <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mb-1 whitespace-nowrap">Gender</span>
                          <div className="font-semibold text-gray-900 text-xs flex items-center gap-2 whitespace-nowrap">
                            <Fingerprint size={12} className="text-purple-500 flex-shrink-0" /> {record.gender}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Need More Details Section */}
                {!hasDetails && !hideNavigationButtons && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 sm:p-6 border border-amber-200/60 shadow-sm">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 border border-amber-200 shadow-sm">
                        <ArrowRight className="text-amber-700" size={20} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Need More Details?</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          Fetch complete employment information using the UAN above
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleNavigateToLatestEmployment(record.uan)}
                        disabled={!onNavigateToVerification}
                        className="bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-200 hover:border-amber-300 shadow-sm hover:shadow transition-all duration-200 h-auto py-3 px-3 sm:px-4"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-amber-700" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-bold text-sm truncate">Latest Employment</div>
                            <div className="text-[10px] text-amber-700 font-medium whitespace-normal leading-tight">
                              Current job details
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-amber-600 flex-shrink-0" />
                        </div>
                      </Button>

                      <Button
                        onClick={() => handleNavigateToFullHistory(record.uan)}
                        disabled={!onNavigateToVerification}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200 h-auto py-3 px-3 sm:px-4"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                            <History size={16} className="text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-bold text-sm truncate">Full History</div>
                            <div className="text-[10px] text-amber-100 font-medium whitespace-normal leading-tight">
                              Complete work timeline
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-white flex-shrink-0" />
                        </div>
                      </Button>
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