import React, { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Briefcase, SearchCheck, Landmark, Fingerprint } from "lucide-react";
import ProfileVerificationCard from "./ProfileVerificationCard";
import EmploymentVerificationCard from "./EmploymentVerificationCard";
import BankVerificationCard from "./BankVerificationCard"; // Import the new component
import EAadhaarVerificationCard from "./EAadhaarVerificationCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  employee: any;
  profileResult: any; // Latest hr_personal_profile_verifications
  employmentResult: any; // Latest hr_employment_verifications
  isVerifyingProfile: boolean;
  onVerifyProfile: () => void;
  refetchEmployee: () => void; // Callback to refresh parent data
}

const VerificationTab: React.FC<Props> = ({ 
  employee, 
  profileResult, 
  employmentResult, 
  isVerifyingProfile, 
  onVerifyProfile, 
  refetchEmployee
}) => {
  const [isVerifyingEmployment, setIsVerifyingEmployment] = useState(false);
  const [bankVerificationResult, setBankVerificationResult] = useState<any>(null);

  const [eaadhaarResult, setEaadhaarResult] = useState<any>(null);

  const fetchEaadhaar = async () => {
    const { data } = await supabase
      .from('hr_eaadhaar_verifications')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setEaadhaarResult(data);
};

  // Initial Fetch for Bank Verification Data
  useEffect(() => {
    fetchBankVerification();
    fetchEaadhaar();
  }, [employee.id]);

  const fetchBankVerification = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_bank_account_verifications')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setBankVerificationResult(data);
      }
    } catch (error) {
      console.error("Error fetching bank verification:", error);
    }
  };

  // LOGIC: Employment Verification
  const handleVerifyEmployment = async () => {
    if(!employee.phone) {
        toast.error("Phone number is required to fetch UAN.");
        return;
    }

    setIsVerifyingEmployment(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-employment-history', {
        body: {
          employeeId: employee.id,
          organizationId: employee.organization_id,
          userId: (await supabase.auth.getUser()).data.user?.id,
          phone: employee.phone,
          pan: employee.pan_number,
          uan: employee.uan_number
        }
      });

      if (error) throw error;
      if (data.status === 'error') throw new Error(data.message);

      toast.success(data.uan_source === 'fetched' 
        ? "UAN found & Employment history verified!" 
        : "Employment history verified successfully.");
      
      refetchEmployee(); // Reload to show new data

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Verification failed");
    } finally {
      setIsVerifyingEmployment(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Employee Verification Center
        </h2>
        <p className="text-purple-100 opacity-90 mt-1">
          Perform background checks, employment history, and bank account verification in one place.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["profile", "employment", "bank"]} className="space-y-4">
        
        {/* 1. PERSONAL PROFILE VERIFICATION */}
        <AccordionItem value="profile" className="border rounded-xl bg-white dark:bg-gray-800 px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${profileResult ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <SearchCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Personal Identity Verification</h3>
                <p className="text-xs text-gray-500">Validates Name, DOB, PAN, and Address</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-6">
            <div className="flex justify-end mb-4">
                <Button onClick={(e) => { e.stopPropagation(); onVerifyProfile(); }} disabled={isVerifyingProfile} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    {isVerifyingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Checking...</> : "Verify Identity"}
                </Button>
            </div>
            {profileResult ? (
                <ProfileVerificationCard employee={employee} data={profileResult} />
            ) : (
                <div className="text-center py-6 text-gray-400 border-t">No verification run yet.</div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 2. EMPLOYMENT HISTORY VERIFICATION */}
        <AccordionItem value="employment" className="border rounded-xl bg-white dark:bg-gray-800 px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${employmentResult ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Employment History (EPFO)</h3>
                <p className="text-xs text-gray-500">Fetches UAN & Validates Past Employers</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-6">
             <div className="flex justify-end mb-4">
                <Button onClick={(e) => { e.stopPropagation(); handleVerifyEmployment(); }} disabled={isVerifyingEmployment} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    {isVerifyingEmployment ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Verifying...</>
                    ) : (
                        employee.uan_number ? "Verify History (via UAN)" : "Fetch UAN & Verify"
                    )}
                </Button>
            </div>
            
            {employmentResult ? (
                <EmploymentVerificationCard employee={employee} data={employmentResult} />
            ) : (
                <div className="text-center py-6 text-gray-400 border-t">
                    <p>Click verify to fetch official employment records from EPFO.</p>
                </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. BANK ACCOUNT VERIFICATION */}
        <AccordionItem value="bank" className="border rounded-xl bg-white dark:bg-gray-800 px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bankVerificationResult?.verification_status === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <Landmark className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Bank Account Verification</h3>
                <p className="text-xs text-gray-500">Penny drop verification via IMPS</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-6">
            <BankVerificationCard 
                employeeId={employee.id}
                organizationId={employee.organization_id}
                bankDetails={employee.bankDetails} 
                latestVerification={bankVerificationResult}
                onRefresh={() => {
                    fetchBankVerification(); // Refresh local state
                    // refetchEmployee(); // Optional: if you want to refresh parent too
                }}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="eaadhaar" className="border rounded-xl bg-white dark:bg-gray-800 px-4 shadow-sm">
    <AccordionTrigger className="hover:no-underline py-4">
    <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${eaadhaarResult?.verification_status === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        <Fingerprint className="h-5 w-5" />
        </div>
        <div className="text-left">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">E-Aadhaar (DigiLocker)</h3>
        <p className="text-xs text-gray-500">Fetch official Aadhaar XML data via DigiLocker</p>
        </div>
    </div>
    </AccordionTrigger>
    <AccordionContent className="pt-0 pb-6">
    <EAadhaarVerificationCard 
        employee={employee}
        organizationId={employee.organization_id}
        latestVerification={eaadhaarResult}
        onRefresh={fetchEaadhaar}
    />
    </AccordionContent>
</AccordionItem>

      </Accordion>
    </div>
  );
};

export default VerificationTab;