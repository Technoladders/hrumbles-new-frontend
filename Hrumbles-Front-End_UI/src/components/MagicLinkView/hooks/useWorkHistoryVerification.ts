import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Candidate, WorkHistory, CompanyOption } from "@/components/MagicLinkView/types";

// Helper function to clean company names before sending to API
const cleanCompanyName = (name: string): string => {
  return name.replace(/\s*\([^)]*\)/g, "").replace(/[,|.]/g, "").trim();
};

// Helper function to create a list of years from the resume string
const parseYearsToRange = (yearsString: string): number[] => {
  if (!yearsString) return [];
  const parts = yearsString.split(/[\s-]+/).map(s => s.toLowerCase().trim());
  let startYear: number | undefined;
  let endYear: number | undefined;

  const extractYear = (part: string): number | undefined => {
    const yearMatch = part.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : undefined;
  };

  if (parts.length > 0) startYear = extractYear(parts[0]);
  if (parts.includes("present") || parts.includes("current")) {
    endYear = new Date().getFullYear();
  } else if (parts.length > 1) {
    endYear = extractYear(parts[parts.length - 1]);
  }

  if (!startYear) return [];
  const years: number[] = [];
  for (let y = startYear; y <= (endYear || new Date().getFullYear()); y++) {
    years.push(y);
  }
  return years.sort((a, b) => b - a); // Sort descending
};


export const useWorkHistoryVerification = (
  candidate: Candidate | null,
  organizationId: string
) => {
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const { toast } = useToast();

  const updateWorkHistoryItem = useCallback((companyId: number, updates: Partial<WorkHistory>) => {
    setWorkHistory((prev) => prev.map((item) => (item.company_id === companyId ? { ...item, ...updates } : item)));
  }, []);

  // Effect to load initial state and subscribe to real-time updates
  useEffect(() => {
    if (!candidate?.id || !organizationId) return;

    // Load initial data from DB
    const fetchInitialState = async () => {
      // 1. Get the base work history from candidate_companies
      const { data: workData, error: workError } = await supabase
        .from("candidate_companies")
        .select("company_id, designation, years, companies!inner(name)")
        .eq("candidate_id", candidate.id);

      if (workError) {
        toast({ title: "Error", description: "Failed to fetch work history.", variant: "destructive" });
        return;
      }

      // 2. Get all previous verification logs for this candidate
      const { data: logs, error: logError } = await supabase
        .from("employee_verification_logs")
        .select("*")
        .eq("candidate_id", candidate.id)
        .eq("organization_id", organizationId);

      if (logError) console.warn("Could not fetch verification logs.", logError);

      // 3. Combine the data to build the initial state
      const initialHistory: WorkHistory[] = workData.map((item, index) => {
        const companyId = item.company_id || index;
        const latestLog = logs?.filter(l => l.company_id === companyId).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const availableYears = parseYearsToRange(item.years || '');
        
        return {
          company_id: companyId,
          company_name: item.companies?.name || "Unknown Company",
          designation: item.designation || "-",
          years: item.years || "-",
          isVerifying: false,
          isVerified: false, // This is just for company lookup, not the final employee verification
          isEmployeeVerifying: false,
          isEmployeeVerified: latestLog?.is_employee_found === true,
          employeeVerificationError: latestLog?.is_employee_found === false ? latestLog.error_message : null,
          availableVerificationYears: availableYears,
          selectedVerificationYear: availableYears[0] || new Date().getFullYear(),
        };
      });
      setWorkHistory(initialHistory);
    };

    fetchInitialState();

    // Setup Realtime subscription for updates
    const channel = supabase.channel(`work-history-verification:${candidate.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'employee_verification_logs',
        filter: `candidate_id=eq.${candidate.id}`
      }, (payload) => {
        const newLog = payload.new as any;
        toast({ title: 'Work History Updated', description: `Verification for ${newLog.company_name} has been updated.`, variant: 'success' });
        updateWorkHistoryItem(newLog.company_id, {
          isEmployeeVerifying: false,
          isEmployeeVerified: newLog.is_employee_found,
          employeeVerificationError: !newLog.is_employee_found ? newLog.error_message : null,
        });
      }).subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [candidate?.id, organizationId, toast, updateWorkHistoryItem]);

  // Main function to handle both Company and Employee verification stages
  const handleVerifySingleWorkHistory = async (company: WorkHistory) => {
    if (!candidate) return;

    // STAGE 1: Verify Company (if we don't have options yet)
    if (!company.companyVerificationOptions) {
    updateWorkHistoryItem(company.company_id, { isVerifying: true, verificationError: null });
    try {
        const companyNameToVerify = cleanCompanyName(company.company_name);
        console.log("Attempting to verify company:", companyNameToVerify); // <-- ADD THIS LOG

        const { data: companyResult, error } = await supabase.functions.invoke('work-history-verification', {
            body: { stage: 'company', payload: { companyName: companyNameToVerify } }
        });

        console.log("Received from Edge Function:", companyResult); // <-- ADD THIS LOG

        if (error) throw error;
        if (companyResult.status !== 1) throw new Error(companyResult.msg || 'Company not found or invalid response.');
        
        const options: CompanyOption[] = Object.entries(companyResult.CompanyName).map(([estId, compName]) => ({
            establishmentId: estId,
            verifiedCompanyName: compName as string,
            secretToken: companyResult.secretToken,
            tsTransactionId: companyResult.tsTransactionID,
        }));

        updateWorkHistoryItem(company.company_id, {
            isVerifying: false, isVerified: true,
            companyVerificationOptions: options,
            selectedCompanyOption: options[0], // Auto-select the first option
        });
        toast({ title: "Company Found", description: "Select a match and year, then click 'Verify Employee'." });
      } catch (err: any) {
        updateWorkHistoryItem(company.company_id, { isVerifying: false, verificationError: err.message });
        toast({ title: 'Company Verification Failed', description: err.message, variant: 'destructive' });
      }
    } 
    // STAGE 2: Verify Employee (if we have a selected option)
    else {
      if (!company.selectedCompanyOption || !company.selectedVerificationYear) {
        toast({ title: 'Missing Selection', description: 'Please select a company match and a verification year.', variant: 'warning' });
        return;
      }
      updateWorkHistoryItem(company.company_id, { isEmployeeVerifying: true, employeeVerificationError: null });
      try {
        const payload = {
          candidateId: candidate.id,
          organizationId,
          companyId: company.company_id,
          company_name: company.selectedCompanyOption.verifiedCompanyName,
          person_name: candidate.name,
          verification_year: company.selectedVerificationYear,
          establishmentId: company.selectedCompanyOption.establishmentId,
          tsTransactionID: company.selectedCompanyOption.tsTransactionId,
          secretToken: company.selectedCompanyOption.secretToken,
        };

        const { data: employeeResult, error } = await supabase.functions.invoke('work-history-verification', {
          body: { stage: 'employee', payload }
        });
        if (error) throw error;

        if (employeeResult.status === 'completed') {
          updateWorkHistoryItem(company.company_id, { isEmployeeVerifying: false, isEmployeeVerified: employeeResult.data.status === 1 });
          toast({ title: 'Employee Verification Complete!', variant: 'success' });
        } else if (employeeResult.status === 'pending') {
          updateWorkHistoryItem(company.company_id, { isEmployeeVerifying: true }); // Keep spinner active
          toast({ title: 'Verification in Progress', description: 'The result will appear automatically when ready.' });
        }
      } catch (err: any) {
        updateWorkHistoryItem(company.company_id, { isEmployeeVerifying: false, employeeVerificationError: err.message });
        toast({ title: 'Employee Verification Failed', description: err.message, variant: 'destructive' });
      }
    }
  };
  
  const verifyAllCompanies = async () => {
    setIsVerifyingAll(true);
    for (const company of workHistory) {
      if (!company.isEmployeeVerified) {
        await handleVerifySingleWorkHistory(company);
      }
    }
    setIsVerifyingAll(false);
  };

  return { workHistory, setWorkHistory, isVerifyingAll, verifyAllCompanies, handleVerifySingleWorkHistory, updateWorkHistoryItem };
};