import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, Briefcase, CalendarDays, Building2 } from "lucide-react";
import { format, differenceInMonths, parseISO, isValid } from "date-fns";

// --- TYPES ---

interface ClaimedExperience {
  id: string;
  company: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  employment_type: string;
}

interface VerifiedExperience {
  establishment_name: string;
  date_of_joining: string;
  date_of_exit?: string | null; // API might return "N/A" or null
  member_id: string;
}

interface ComparisonResult {
  type: 'MATCHED' | 'CLAIMED_ONLY' | 'VERIFIED_ONLY';
  claimed?: ClaimedExperience;
  verified?: VerifiedExperience;
  status: {
    label: string;
    color: string; // Tailwind class
    icon: React.ElementType;
    description: string;
  };
  dateDiscrepancy?: string;
}

// --- UTILITY FUNCTIONS ---

const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(pvt|ltd|limited|private|public|inc|corp|solutions|technologies|india)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const calculateSimilarity = (s1: string, s2: string): number => {
  const n1 = normalizeString(s1);
  const n2 = normalizeString(s2);
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  return 0.0; // Simplified for this example. For production, use Levenshtein distance.
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr || dateStr === 'Present' || dateStr.toLowerCase() === 'n/a') return 'Present';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "MMM yyyy") : dateStr;
  } catch {
    return dateStr;
  }
};

// --- COMPARISON LOGIC ---

const analyzeExperience = (
  claimedList: ClaimedExperience[],
  verifiedList: VerifiedExperience[]
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];
  const usedVerifiedIndices = new Set<number>();

  // 1. Loop through Claimed Experience to find matches
  claimedList.forEach((claimed) => {
    let bestMatchIndex = -1;
    let bestMatchScore = 0;

    verifiedList.forEach((verified, idx) => {
      if (usedVerifiedIndices.has(idx)) return;
      const score = calculateSimilarity(claimed.company, verified.establishment_name);
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatchIndex = idx;
      }
    });

    // Threshold for matching (0.5 allows for "Aquity Solution" vs "AQUITY SOLUTIONS INDIA...")
    if (bestMatchIndex !== -1 && bestMatchScore > 0.5) {
      usedVerifiedIndices.add(bestMatchIndex);
      const verified = verifiedList[bestMatchIndex];
      
      // Analyze Date Discrepancy
      const cStart = parseISO(claimed.start_date);
      const vStart = parseISO(verified.date_of_joining);
      
      let dateStatus = "Dates Align";
      let dateColor = "bg-green-100 text-green-700 border-green-200";
      let DateIcon = CheckCircle2;
      let discrepancyText = "";

      if (isValid(cStart) && isValid(vStart)) {
        const diffStart = Math.abs(differenceInMonths(cStart, vStart));
        
        // Check End Dates
        // Handle "Present" or null vs API "N/A"
        let cEnd = claimed.end_date ? parseISO(claimed.end_date) : new Date();
        let vEnd = (verified.date_of_exit && verified.date_of_exit !== 'N/A') 
          ? parseISO(verified.date_of_exit) 
          : new Date();

        const diffEnd = Math.abs(differenceInMonths(cEnd, vEnd));
        const totalGap = diffStart + diffEnd;

        if (totalGap === 0) {
            // Perfect
        } else if (totalGap <= 2) {
            dateStatus = "Minor Date Variance";
            dateColor = "bg-blue-50 text-blue-700 border-blue-200";
            DateIcon = CheckCircle2;
            discrepancyText = `Variance of ~${totalGap} months total.`;
        } else {
            dateStatus = "Date Mismatch";
            dateColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
            DateIcon = AlertTriangle;
            discrepancyText = `Significant variance: Starts differ by ${diffStart} mos, Ends by ${diffEnd} mos.`;
        }
      }

      results.push({
        type: 'MATCHED',
        claimed,
        verified,
        status: {
          label: dateStatus,
          color: dateColor,
          icon: DateIcon,
          description: `Company matched. ${discrepancyText}`
        },
        dateDiscrepancy: discrepancyText
      });

    } else {
      // No match found in verified list
      results.push({
        type: 'CLAIMED_ONLY',
        claimed,
        status: {
          label: 'Unverified',
          color: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertCircle,
          description: 'This experience is claimed by the employee but does not appear in the EPFO records.'
        }
      });
    }
  });

  // 2. Find Verified items that were NOT claimed (Undeclared Experience)
  verifiedList.forEach((verified, idx) => {
    if (!usedVerifiedIndices.has(idx)) {
      results.push({
        type: 'VERIFIED_ONLY',
        verified,
        status: {
          label: 'Undeclared Experience',
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: HelpCircle,
          description: 'Found in government records but not mentioned in employee profile.'
        }
      });
    }
  });

  return results;
};


// --- COMPONENT ---

interface ExperienceComparisonViewProps {
  claimedExperience: any[]; // Raw Supabase Data
  verifiedHistoryJson: string | any[]; // JSON String or Array from Gridlines
}

const ExperienceComparisonView: React.FC<ExperienceComparisonViewProps> = ({ 
  claimedExperience, 
  verifiedHistoryJson 
}) => {
  
  // Parse Data
  const comparisonData = useMemo(() => {
    let verifiedList: VerifiedExperience[] = [];
    
    // Handle JSON parsing safely
    try {
      if (typeof verifiedHistoryJson === 'string') {
        verifiedList = JSON.parse(verifiedHistoryJson);
      } else if (Array.isArray(verifiedHistoryJson)) {
        verifiedList = verifiedHistoryJson;
      }
    } catch (e) {
      console.error("Failed to parse verified history", e);
    }

    const claimedList: ClaimedExperience[] = claimedExperience.map(exp => ({
      id: exp.id,
      company: exp.company,
      job_title: exp.job_title,
      start_date: exp.start_date,
      end_date: exp.end_date,
      employment_type: exp.employment_type
    }));

    return analyzeExperience(claimedList, verifiedList);
  }, [claimedExperience, verifiedHistoryJson]);

  return (
    <Card className="border-none shadow-md bg-white dark:bg-gray-800">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-b">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                    Experience Cross-Check
                </CardTitle>
                <CardDescription>
                    Comparing HRMS profile data against EPFO Service History
                </CardDescription>
            </div>
            <div className="flex gap-2 text-xs font-medium">
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md border border-green-200">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md border border-orange-200">
                    <HelpCircle className="h-3 w-3" /> Undeclared
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-md border border-red-200">
                    <AlertCircle className="h-3 w-3" /> Missing
                </span>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead className="w-[30%] pl-6">Profile Claim (HRMS)</TableHead>
              <TableHead className="w-[30%]">Government Record (EPFO)</TableHead>
              <TableHead className="w-[15%]">Discrepancy Check</TableHead>
              <TableHead className="w-[25%]">Analysis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No experience data available to compare.
                    </TableCell>
                </TableRow>
            ) : (
                comparisonData.map((item, index) => {
                    const StatusIcon = item.status.icon;

                    // Row Background Logic
                    let rowClass = "";
                    if (item.type === 'MATCHED') rowClass = "hover:bg-green-50/30 dark:hover:bg-green-900/10";
                    if (item.type === 'VERIFIED_ONLY') rowClass = "bg-orange-50/40 hover:bg-orange-50/60 dark:bg-orange-900/10";
                    if (item.type === 'CLAIMED_ONLY') rowClass = "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/10";

                    return (
                        <TableRow key={index} className={rowClass}>
                            {/* 1. CLAIMED COLUMN */}
                            <TableCell className="pl-6 align-top">
                                {item.claimed ? (
                                    <div className="space-y-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            {item.claimed.company}
                                        </div>
                                        <div className="text-xs text-purple-600 font-medium">{item.claimed.job_title}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3" />
                                            {formatDate(item.claimed.start_date)} - {formatDate(item.claimed.end_date)}
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] h-5">{item.claimed.employment_type}</Badge>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic flex items-center gap-1 mt-2">
                                        <AlertTriangle className="h-3 w-3" /> Not mentioned in profile
                                    </span>
                                )}
                            </TableCell>

                            {/* 2. VERIFIED COLUMN */}
                            <TableCell className="align-top">
                                {item.verified ? (
                                    <div className="space-y-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                            {item.verified.establishment_name}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">ID: {item.verified.member_id}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium bg-gray-100 dark:bg-gray-800 w-fit px-2 py-0.5 rounded">
                                            <CalendarDays className="h-3 w-3" />
                                            {formatDate(item.verified.date_of_joining)} - {formatDate(item.verified.date_of_exit)}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic flex items-center gap-1 mt-2">
                                        <AlertCircle className="h-3 w-3" /> No matching record found
                                    </span>
                                )}
                            </TableCell>

                            {/* 3. STATUS BADGE */}
                            <TableCell className="align-top">
                                <Badge className={`${item.status.color} hover:${item.status.color} flex w-fit gap-1 items-center px-2 py-1`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {item.status.label}
                                </Badge>
                            </TableCell>

                            {/* 4. ANALYSIS TEXT */}
                            <TableCell className="align-top">
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                                    {item.status.description}
                                </p>
                                {item.dateDiscrepancy && (
                                    <p className="text-xs text-orange-600 mt-1 font-medium">
                                        {item.dateDiscrepancy}
                                    </p>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExperienceComparisonView;