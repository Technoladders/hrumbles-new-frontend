import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkHistory, Candidate, CompanyOption } from "@/components/MagicLinkView/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkHistorySectionProps {
  workHistory: WorkHistory[];
  shareMode: boolean;
  isVerifyingAll: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (company: WorkHistory) => void;
  updateWorkHistoryItem: (companyId: number, updates: Partial<WorkHistory>) => void;
  candidate: Candidate | null;
}

export const WorkHistorySection: React.FC<WorkHistorySectionProps> = ({
  workHistory,
  shareMode,
  isVerifyingAll,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
}) => {
  if (!workHistory || workHistory.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Work History</h3>
        {!shareMode && <Button onClick={onVerifyAllCompanies} disabled={isVerifyingAll} size="sm">{isVerifyingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify All"}</Button>}
      </div>
      <div className="space-y-6">
        {workHistory.map((history) => (
          <div key={history.company_id} className="relative pl-8 pb-6">
            <div className="absolute left-0 top-0 h-full">
              <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
              {history.company_id !== workHistory[workHistory.length - 1].company_id && (
                <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">{history.years}</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {history.isVerified ? history.selectedCompanyOption?.verifiedCompanyName : history.company_name}
              </p>
              <p className="text-xs text-gray-600">{history.designation}</p>

              {/* Company Verification Status */}
              {history.isVerifying && <div className="flex items-center text-yellow-600 mt-1"><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Verifying Company...</div>}
              {history.verificationError && <p className="text-xs text-red-600 mt-1">Company Error: {history.verificationError}</p>}
              
              {/* Employee Verification Status */}
              {history.isEmployeeVerifying && <div className="flex items-center text-yellow-600 mt-1"><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Verifying Employee...</div>}
              {history.isEmployeeVerified && <p className="text-xs text-green-600 mt-1">Employee Verified <CheckCircle2 className="ml-1 inline-block h-3 w-3" /></p>}
              {history.employeeVerificationError && <p className="text-xs text-red-600 mt-1">Employee Error: {history.employeeVerificationError}</p>}

              {!shareMode && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Stage 1 Button: Verify Company */}
                  {!history.isVerified && !history.isVerifying && (
                    <Button variant="secondary" size="sm" onClick={() => onVerifySingleWorkHistory(history)} disabled={isVerifyingAll}>Verify Company</Button>
                  )}
                  
                  {/* Stage 2 Controls: Dropdowns and Verify Employee Button */}
                  {history.isVerified && !history.isEmployeeVerified && !history.isEmployeeVerifying && (
                    <>
                      {history.companyVerificationOptions && (
                        <Select value={history.selectedCompanyOption?.establishmentId || ""} onValueChange={(value) => {
                            const selected = history.companyVerificationOptions?.find(opt => opt.establishmentId === value);
                            if (selected) updateWorkHistoryItem(history.company_id, { selectedCompanyOption: selected });
                        }}>
                          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Select Company Match" /></SelectTrigger>
                          <SelectContent>
                            {history.companyVerificationOptions.map((option) => (
                              <SelectItem key={option.establishmentId} value={option.establishmentId}>{option.verifiedCompanyName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {history.availableVerificationYears && (
                        <Select value={history.selectedVerificationYear?.toString() || ''} onValueChange={(value) => updateWorkHistoryItem(history.company_id, { selectedVerificationYear: parseInt(value, 10) })}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Select Year" /></SelectTrigger>
                          <SelectContent>
                            {history.availableVerificationYears.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}

                      <Button variant="secondary" size="sm" onClick={() => onVerifySingleWorkHistory(history)} disabled={isVerifyingAll || !history.selectedCompanyOption || !history.selectedVerificationYear}>Verify Employee</Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};