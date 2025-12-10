// src/pages/jobs/ai/CandidatesTable.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Copy, Check, Eye, UserPlus, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import { toast } from 'sonner';
import moment from 'moment';

const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

// --- 1. CONFIGURATION: SUCCESS CODES ---
const SUCCESS_CODES_BY_TYPE: Record<string, number[]> = {
  'mobile_to_uan': [1, 1016],
  'pan_to_uan': [1, 1029],
  'latest_passbook_mobile': [1022],
  'uan_full_history_gl': [1013],
  'latest_employment_uan': [1014],
  'latest_employment_mobile': [1014],
  'mobile': [1],
  'pan': [1],
  'uan_full_history': [1],
};

// --- 2. CONFIGURATION: NOT FOUND / NO RECORD CODES ---
const NOT_FOUND_CODES_BY_TYPE: Record<string, number[]> = {
  'mobile_to_uan': [9, 1007],
  'pan_to_uan': [9, 1030],
  'latest_passbook_mobile': [1015, 1023],
  'uan_full_history_gl': [1011, 1015],
  'latest_employment_uan': [1015],
  'latest_employment_mobile': [1015],
  'mobile': [9],
  'pan': [9],
  'uan_full_history': [9],
};

// All possible verification types to check
const VERIFICATION_TYPES = [
  'mobile',
  'mobile_to_uan', 
  'pan',
  'pan_to_uan',
  'uan_full_history',
  'uan_full_history_gl',
  'latest_employment_mobile',
  'latest_employment_uan',
  'latest_passbook_mobile'
];

// Friendly names for verification types
const VERIFICATION_TYPE_NAMES: Record<string, string> = {
  'mobile': 'UAN Lookup (Mobile)',
  'mobile_to_uan': 'Mobile to UAN Conversion',
  'pan': 'UAN Lookup (PAN)',
  'pan_to_uan': 'PAN to UAN Conversion',
  'uan_full_history': 'Full Employment History',
  'uan_full_history_gl': 'Full Employment History ',
  'latest_employment_mobile': 'Latest Employment (Mobile)',
  'latest_employment_uan': 'Latest Employment (UAN)',
  'latest_passbook_mobile': 'EPFO Passbook'
};

// --- 3. STATUS DESCRIPTIONS (TOOLTIP TEXT) ---
// EXACT TEXT as specified - NO CHANGES
const STATUS_DESCRIPTIONS: Record<number, string> = {
  // Success Codes
  1016: "UAN fetched from mobile.",
  1029: "UAN fetched from PAN number.",
  1022: "Passbook fetched.",
  1013: "Employment history fetched.",
  1014: "Latest employment record fetched.",
  1: "Verification successful",

  // Not Found / Error Codes
  1007: "Provided mobile number doesn't have any UAN.",
  1030: "No UAN linked or invalid PAN.",
  1015: "No employment records found.",
  1023: "Passbook not available.",
  1011: "Provided UAN doesn't exist.",
  9: "No Record Found",
};

// Helper to get status category based on lookup type
const getStatusCategory = (status: number, lookupType: string) => {
  const successCodes = SUCCESS_CODES_BY_TYPE[lookupType] || [];
  const notFoundCodes = NOT_FOUND_CODES_BY_TYPE[lookupType] || [];
  
  if (successCodes.includes(status)) return 'success';
  if (notFoundCodes.includes(status)) return 'not_found';
  return 'error';
};

// --- BADGE STATUS HELPER ---
const getBadgeStatus = (candidate: any) => {
  // Get ALL verifications, not just latest
  const allVerifications = candidate.uanlookups || [];
  
  if (allVerifications.length === 0) {
    // No verification - List ALL missing verification types
    return { 
      color: 'red' as const, 
      icon: XCircle, 
      label: 'Unverified', 
      missing: [
        'Mobile to UAN Conversion',
        'PAN to UAN Conversion',
        'Full Employment History (GL)',
        'Latest Employment (UAN)',
        'Latest Employment (Mobile)',
        'EPFO Passbook'
      ]
    };
  }

  // Check if ANY verification is a successful CORE verification
  const hasSuccessfulCoreVerification = allVerifications.some(verification => {
    const { response_data: res, lookup_type: lookupType } = verification;
    
    // Extract status and convert to number
    let statusCode = res.status === 200 ? res.data?.code : res.status;
    const status = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
    
    const statusCategory = getStatusCategory(status, lookupType);
    const isCoreVerification = ['mobile_to_uan', 'pan_to_uan', 'uan_full_history_gl', 'uan_full_history'].includes(lookupType);
    
    return statusCategory === 'success' && isCoreVerification;
  });

  // If ANY core verification succeeded, show GREEN
  if (hasSuccessfulCoreVerification) {
    return { color: 'green' as const, icon: CheckCircle2, label: 'Verified', missing: [] };
  }

  // Otherwise, check the latest verification for status
  const latestVerification = allVerifications[0];
  const { response_data: res, lookup_type: lookupType } = latestVerification;
  
  // Extract status and convert to number
  let statusCode = res.status === 200 ? res.data?.code : res.status;
  const status = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
  
  const statusCategory = getStatusCategory(status, lookupType);
  
  // Build missing items based on verification status
  const missingItems: string[] = [];
  
  if (statusCategory === 'success') {
    // Non-core verification succeeded - list what's still missing
    const missingCore: string[] = [];
    missingCore.push('Mobile to UAN Conversion');
    missingCore.push('PAN to UAN Conversion');
    missingCore.push('Full Employment History (GL)');
    
    return { color: 'yellow' as const, icon: AlertCircle, label: 'Partially Verified', missing: missingCore };
  } else if (statusCategory === 'not_found') {
    // Record not found - Show ONLY the reason, no prefix
    missingItems.push(STATUS_DESCRIPTIONS[status] || 'Not Found');
    return { color: 'yellow' as const, icon: AlertCircle, label: 'Not Found', missing: missingItems };
  } else {
    // Error or unknown status - Show ONLY the reason, no prefix
    missingItems.push(STATUS_DESCRIPTIONS[status] || 'Verification error');
    return { color: 'red' as const, icon: XCircle, label: 'Not Verified', missing: missingItems };
  }
};

// --- VERIFICATION STATUS BADGE ---
const VerificationBadge = ({ candidate }: { candidate: any }) => {
  const status = getBadgeStatus(candidate);
  const Icon = status.icon;
  
  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    red: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-help ${colorClasses[status.color]}`}>
            <Icon className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{status.label}</p>
            {status.color === 'green' && status.missing.length === 0 ? (
              <p className="text-xs text-muted-foreground">All information verified ✓</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Missing items:</p>
                <ul className="text-xs space-y-0.5 ml-2">
                  {status.missing.length > 0 ? (
                    status.missing.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))
                  ) : (
                    <li>• None (should be green badge)</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// --- HIDDEN CONTACT CELL ---
const HiddenContactCell = ({ email, phone }: { email?: string; phone?: string }) => {
  const [justCopied, setJustCopied] = useState<'email' | 'phone' | null>(null);

  const copyToClipboard = (value: string, field: 'email' | 'phone') => {
    navigator.clipboard.writeText(value);
    setJustCopied(field);
    toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied!`);
    setTimeout(() => setJustCopied(null), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {email && (
        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Mail className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-2 flex items-center gap-2"><span className="text-sm">{email}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(email, 'email')}>{justCopied === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></PopoverContent></Popover>
      )}
      {phone && (
        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Phone className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-2 flex items-center gap-2"><span className="text-sm">{phone}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(phone, 'phone')}>{justCopied === 'phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></PopoverContent></Popover>
      )}
    </div>
  );
};

// --- DETAILED VERIFICATION RESULT ---
const renderVerificationResult = (candidate: any) => {
  const allVerifications = candidate.uanlookups || [];
  
  if (allVerifications.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 w-fit">
          Not Verified
        </Badge>
        <span className="text-xs text-gray-500">No verifications performed</span>
      </div>
    );
  }

  // Get ALL successful verifications
  const successfulVerifications = allVerifications.filter(verification => {
    const { response_data: res, lookup_type: lookupType } = verification;
    let statusCode = res.status === 200 ? res.data?.code : res.status;
    const status = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
    const statusCategory = getStatusCategory(status, lookupType);
    return statusCategory === 'success';
  });

  // If there are successful verifications, show ONLY THE LATEST ONE
  if (successfulVerifications.length > 0) {
    // Get the most recent successful verification
    const latestSuccess = successfulVerifications[0];
    const { response_data: res, lookup_type: lookupType } = latestSuccess;
    let statusCode = res.status === 200 ? res.data?.code : res.status;
    const status = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
    const description = STATUS_DESCRIPTIONS[status] || `Status code: ${status}`;
    const typeName = VERIFICATION_TYPE_NAMES[lookupType] || lookupType;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge className="bg-green-100 text-green-800 border-green-300 w-fit">
          Verified ✓
        </Badge>
        <span className="text-xs text-gray-500">{typeName}: {description}</span>
      </div>
    );
  }

  // Otherwise, show the latest verification (not found or error)
  const latestVerification = allVerifications[0];
  const { response_data: res, lookup_type: lookupType } = latestVerification;
  
  let statusCode = res.status === 200 ? res.data?.code : res.status;
  const status = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
  
  const statusCategory = getStatusCategory(status, lookupType);
  const description = STATUS_DESCRIPTIONS[status] || `Status code: ${status}`;

  // Not found statuses - Tooltip shows the reason directly
  if (statusCategory === 'not_found') {
    return (
      <div className="flex flex-col gap-1">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 w-fit cursor-help">
                Not Found
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
    );
  }

  // Error/Unknown statuses
  return (
    <div className="flex flex-col gap-1">
      <Badge className="bg-red-100 text-red-800 border-red-300 w-fit">
        Not Verified
      </Badge>
      <span className="text-xs text-gray-500">{description}</span>
    </div>
  );
};

interface Props {
  candidates: any[];
  organizationId: string;
   onAssignClick: (candidateId: string, candidateName: string) => void;
}

export const CandidatesTable = ({ candidates, organizationId, onAssignClick }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader style={{ backgroundColor: '#7731E8' }}>
            <TableRow className="hover:bg-[#7731E8]" style={{ backgroundColor: '#7731E8' }}>
              <TableHead className="text-white hover:text-white">Candidate</TableHead>
              <TableHead className="text-white hover:text-white">Contact</TableHead>
              <TableHead className="text-white hover:text-white">Last Verification</TableHead>
              <TableHead className="text-white hover:text-white">Added By</TableHead>
              <TableHead className="text-white hover:text-white text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {candidates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No candidates found.</TableCell></TableRow>}
            {candidates.map(candidate => {
              const candidateProfilePath = candidate.job_id
                ? `/jobs/unassigned/candidate/${candidate.id}/bgv`
                : `/jobs/unassigned/candidate/${candidate.id}/bgv`;

              const verification = candidate.latest_verification;
              const addedBy = candidate.creator ? `${candidate.creator.first_name} ${candidate.creator.last_name}` : 'System';

              return (
                <TableRow key={candidate.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link to={candidateProfilePath} className="hover:underline">{candidate.name}</Link>
                      <VerificationBadge candidate={candidate} />
                    </div>
                  </TableCell>
                  <TableCell><HiddenContactCell email={candidate.email} phone={candidate.phone} /></TableCell>
                  <TableCell>{renderVerificationResult(candidate)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{addedBy}</span>
                      <span className="text-xs text-gray-500">{moment(candidate.created_at).fromNow()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200 w-fit">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors"
                                onClick={() => navigate(candidateProfilePath)}
                                disabled={!candidate.job_id}
                              >
                                <span className="sr-only">View Details</span>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors"
                                onClick={() => onAssignClick(candidate.id, candidate.name)}
                              >
                                <span className="sr-only">Assign to Job</span>
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign to Job</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider> */}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};