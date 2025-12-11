// CandidatesTable.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mail, Phone, Copy, Check, Eye, CheckCircle2, 
  AlertCircle, XCircle, HelpCircle, User 
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

// --- 1. CONFIGURATION ---

const SUCCESS_CODES_BY_TYPE: Record<string, number[]> = {
  'mobile_to_uan': [1, 1016],
  'pan_to_uan': [1, 1029],
  'latest_passbook_mobile': [1, 1022],
  'uan_full_history_gl': [1, 1013],
  'uan_full_history': [1, 1013],
  'latest_employment_uan': [1, 1014],
  'latest_employment_mobile': [1, 1014],
  'mobile': [1],
  'pan': [1],
};

const NOT_FOUND_CODES_BY_TYPE: Record<string, number[]> = {
  'mobile_to_uan': [9, 1007],
  'pan_to_uan': [9, 1030],
  'latest_passbook_mobile': [9, 1015, 1023],
  'uan_full_history_gl': [9, 1011, 1015],
  'uan_full_history': [9, 1011, 1015],
  'latest_employment_uan': [9, 1015],
  'latest_employment_mobile': [9, 1015],
  'mobile': [9],
  'pan': [9],
};

const VERIFICATION_TYPE_NAMES: Record<string, string> = {
  'mobile_to_uan': 'Mobile to UAN',
  'pan_to_uan': 'PAN to UAN',
  'uan_full_history_gl': 'Employment History',
  'uan_full_history': 'Employment History',
  'latest_employment_mobile': 'Latest Emp (Mobile)',
  'latest_employment_uan': 'Latest Emp (UAN)',
  'latest_passbook_mobile': 'EPFO Passbook'
};

const ALL_REQUIRED_TYPES = [
  'mobile_to_uan',
  'pan_to_uan',
  'uan_full_history_gl',
  'latest_employment_uan',
  'latest_passbook_mobile'
];

const STATUS_DESCRIPTIONS: Record<number, string> = {
  1016: "UAN fetched",
  1029: "UAN fetched",
  1022: "Passbook fetched",
  1013: "History fetched",
  1014: "Latest record fetched",
  1: "Verified",
  1007: "No UAN linked",
  1030: "Invalid PAN/No UAN",
  1015: "No records",
  1023: "No Passbook",
  1011: "UAN invalid",
  9: "No Record",
};

// --- 2. LOGIC HELPERS ---

const getStatusCategory = (status: number, lookupType: string) => {
  const successCodes = SUCCESS_CODES_BY_TYPE[lookupType] || [1];
  const notFoundCodes = NOT_FOUND_CODES_BY_TYPE[lookupType] || [9];
  
  if (successCodes.includes(status)) return 'success';
  if (notFoundCodes.includes(status)) return 'not_found';
  return 'error';
};

// Exported so AllCandidatesPage can use it for stats counting
export const getVerificationSummary = (candidate: any) => {
  const lookups = candidate.uanlookups || [];
  
  // Map now stores code, category, AND the lookup_value
  const statusMap: Record<string, { code: number, category: string, value: string }> = {};
  
  lookups.forEach((l: any) => {
    if (!statusMap[l.lookup_type]) {
      const { response_data: res } = l;
      let statusCode = res.status === 200 ? res.data?.code : res.status;
      statusCode = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
      statusMap[l.lookup_type] = {
        code: statusCode,
        category: getStatusCategory(statusCode, l.lookup_type),
        value: l.lookup_value || '' // Capture the input value (e.g., Mobile, PAN)
      };
    }
  });

  const verifiedList: string[] = [];
  const notFoundList: string[] = [];
  const unverifiedList: string[] = [];

  ALL_REQUIRED_TYPES.forEach(type => {
    const info = statusMap[type];
    const name = VERIFICATION_TYPE_NAMES[type] || type;

    if (!info) {
      unverifiedList.push(name);
    } else {
      const desc = STATUS_DESCRIPTIONS[info.code] || `Code ${info.code}`;
      const valueStr = info.value ? ` for (${info.value})` : '';

      if (info.category === 'success') {
        // For success, usually just the name is enough, but adding value helps context
        verifiedList.push(`${name}${valueStr}`); 
      } else if (info.category === 'not_found') {
        // For not found, seeing the value is critical (e.g., which PAN failed?)
        notFoundList.push(`${name}: ${desc}${valueStr}`);
      } else {
        notFoundList.push(`${name} (Error)${valueStr}`);
      }
    }
  });

  let badgeColor: 'green' | 'yellow' | 'red' = 'red';
  let badgeLabel = 'Yet to Verify';
  let BadgeIcon = XCircle;

  if (verifiedList.length > 0) {
    badgeColor = 'green';
    badgeLabel = 'Verified';
    BadgeIcon = CheckCircle2;
  } else if (notFoundList.length > 0) {
    badgeColor = 'yellow';
    badgeLabel = 'Partially Verified';
    BadgeIcon = AlertCircle;
  }

  return { badgeColor, badgeLabel, BadgeIcon, verifiedList, notFoundList, unverifiedList };
};

// --- COMPONENTS ---

const VerificationBadge = ({ candidate }: { candidate: any }) => {
  const summary = getVerificationSummary(candidate);
  const { badgeColor, badgeLabel, BadgeIcon, verifiedList, notFoundList, unverifiedList } = summary;

  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    red: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold border transition-colors cursor-help ${colorClasses[badgeColor]}`}>
            <BadgeIcon className="h-3 w-3" />
            <span>{badgeLabel}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="min-w-[220px] max-w-sm bg-white border border-gray-200 shadow-xl p-3 z-50">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-1">Verification Status</h4>
            {verifiedList.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 className="h-3 w-3" /> Verified</div>
                <ul className="pl-4 text-xs text-gray-600 space-y-0.5 list-disc">{verifiedList.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
            {notFoundList.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertCircle className="h-3 w-3" /> Not Found</div>
                <ul className="pl-4 text-xs text-gray-600 space-y-0.5 list-disc">{notFoundList.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
            {unverifiedList.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500"><HelpCircle className="h-3 w-3" /> Pending / Yet to Verify</div>
                <ul className="pl-4 text-xs text-gray-500 space-y-0.5 list-disc">{unverifiedList.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// New Icon-Only Contact Cell
const HiddenContactCell = ({ email, phone }: { email?: string; phone?: string }) => {
  const [justCopied, setJustCopied] = useState<'email' | 'phone' | null>(null);

  const copyToClipboard = (value: string, field: 'email' | 'phone') => {
    navigator.clipboard.writeText(value);
    setJustCopied(field);
    toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied!`);
    setTimeout(() => setJustCopied(null), 2000);
  };

  if (!email && !phone) return <span className="text-gray-400 text-xs">-</span>;

  return (
    <div className="flex items-center gap-2">
      {email && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100">
              <Mail className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{email}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(email, 'email')}>
                {justCopied === 'email' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {phone && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100">
              <Phone className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{phone}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(phone, 'phone')}>
                {justCopied === 'phone' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

const RenderLastAction = ({ candidate }: { candidate: any }) => {
  const latest = candidate.latest_verification;
  
  if (!latest) {
    return <span className="text-xs text-gray-400 italic">No actions</span>;
  }

  const { response_data: res, lookup_type: type, lookup_value: value } = latest;
  let statusCode = res.status === 200 ? res.data?.code : res.status;
  statusCode = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
  
  const statusCat = getStatusCategory(statusCode, type);
  const typeName = VERIFICATION_TYPE_NAMES[type] || type;
  const desc = STATUS_DESCRIPTIONS[statusCode] || `Code: ${statusCode}`;
  
  // Truncate value if it's too long for the column view
  const displayValue = value ? `for ${value}` : '';

  let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
  if (statusCat === 'success') badgeColor = "bg-green-50 text-green-700 border-green-200";
  if (statusCat === 'not_found') badgeColor = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="flex flex-col gap-1 items-start">
      <Badge variant="outline" className={`${badgeColor} font-normal text-[10px] px-1.5 h-5`}>
        {typeName}
      </Badge>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
             <span className="text-[11px] text-gray-500 max-w-[160px] truncate cursor-help">
                {desc} {displayValue}
             </span>
          </TooltipTrigger>
          <TooltipContent>
             <p>{desc} {displayValue}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-purple-600 to-violet-600">
            <TableRow className="hover:bg-[#7731E8] border-none">
              <TableHead className="text-white hover:text-white font-semibold">Candidate</TableHead>
              <TableHead className="text-white hover:text-white font-semibold">Contact</TableHead>
              <TableHead className="text-white hover:text-white font-semibold">Last Check Result</TableHead>
              <TableHead className="text-white hover:text-white font-semibold">Verified By</TableHead>
              <TableHead className="text-white hover:text-white font-semibold">Added By</TableHead>
              <TableHead className="text-white hover:text-white font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {candidates.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">No candidates found matching your criteria.</TableCell>
                </TableRow>
            )}
            {candidates.map(candidate => {
              const candidateProfilePath = `/jobs/unassigned/candidate/${candidate.id}/bgv`;
              
              const addedBy = candidate.creator 
                ? `${candidate.creator.first_name} ${candidate.creator.last_name}` 
                : 'System';

              let verifiedBy = '-';
              if (candidate.latest_verification) {
                const lv = candidate.latest_verification;
                if (lv.user) {
                  verifiedBy = `${lv.user.first_name} ${lv.user.last_name}`;
                } else if (lv.verified_by) {
                  verifiedBy = 'Admin';
                }
              }

              return (
                <TableRow key={candidate.id} className="transition-all duration-200 ease-in-out hover:shadow-sm hover:-translate-y-px hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {candidate.name?.charAt(0) || <User size={14} />}
                        </div>
                        <div className="flex flex-col gap-1">
                        <Link to={candidateProfilePath} className="hover:underline text-gray-900 font-semibold text-sm">
                            {candidate.name}
                        </Link>
                        <div className="flex">
                            <VerificationBadge candidate={candidate} />
                        </div>
                        </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <HiddenContactCell email={candidate.email} phone={candidate.phone} />
                  </TableCell>

                  <TableCell>
                    <RenderLastAction candidate={candidate} />
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 font-medium">{verifiedBy}</span>
                      {candidate.latest_verification && (
                        <span className="text-[10px] text-gray-400">
                          {moment(candidate.latest_verification.created_at).fromNow()}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{addedBy}</span>
                      <span className="text-[10px] text-gray-400">{moment(candidate.created_at).format('MMM DD, YYYY')}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                       <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-500 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                                onClick={() => navigate(candidateProfilePath)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Report</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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