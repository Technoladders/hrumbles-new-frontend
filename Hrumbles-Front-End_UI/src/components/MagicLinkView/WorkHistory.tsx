import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Candidate } from "@/lib/types";

interface WorkHistoryProps {
  candidateId?: string;
  candidate: Candidate | null;
  workHistory: WorkHistory[];
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>;
  shareMode: boolean;
  isVerifyingAll: boolean;
  setIsVerifyingAll: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ReturnType<typeof useToast>["toast"];
}

const COMPANY_EMPLOYEE_PROXY_URL = "https://hrumblesdevelop.vercel.app/api/company-employee-proxy";

const cleanCompanyName = (name: string): string => {
  let cleaned = name.replace(/\s*\([^)]*\)/g, "").trim();
  cleaned = cleaned.replace(/[,|.]/g, "");
  return cleaned;
};

const verifyCompany = async (
  transID: string,
  companyName: string,
  candidateId: string,
  companyId: number,
  employeeId: string,
  organization_id: string
): Promise<CompanyVerificationResponse> => {
  try {
    console.log("Starting company verification with:", { transID, companyName });

    const encryptResponse = await axios.post<{ requestData: string }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-encrypt`,
      {
        transID,
        docType: 106,
        companyName,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    const requestData = encryptResponse.data.requestData;
    console.log("Company encrypt response:", requestData);

    let verifyResponseData: string;
    try {
      const verifyResponse = await axios.post<{ responseData: string }>(
        `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-verify`,
        { requestData },
        { headers: { "Content-Type": "application/json" } }
      );
      verifyResponseData = verifyResponse.data.responseData;
      console.log("Company verify response:", verifyResponseData);
    } catch (verifyError: any) {
      if (verifyError.response?.data?.responseData) {
        verifyResponseData = verifyError.response.data.responseData;
        console.log(
          `Caught error in verify step with status ${verifyError.response?.status}, proceeding with responseData:`,
          verifyResponseData
        );
      } else {
        console.error("Verify step error:", verifyError.message);
        throw new Error("Verification request failed: " + (verifyError.message || "Unknown error"));
      }
    }

    const decryptResponse = await axios.post<CompanyVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-decrypt`,
      { responseData: verifyResponseData },
      { headers: { "Content-Type": "application/json" } }
    );
    const decryptedData = decryptResponse.data;
    console.log("Company decrypt response:", decryptedData);

    if (decryptedData.status === 1 && decryptedData.CompanyName && decryptedData.tsTransactionID) {
      const companyEntries = Object.entries(decryptedData.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error("No company names returned in response");
      }

      const insertRecords = companyEntries.map(([establishmentId, verifiedCompanyName]) => ({
        employee_id: employeeId,
        organization_id,
        company_id: companyId,
        candidate_id: candidateId,
        company_name: verifiedCompanyName,
        establishment_id: establishmentId,
        secret_token: decryptedData.secretToken,
        ts_transaction_id: decryptedData.tsTransactionID,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("verified_company_records").insert(insertRecords);

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error("Failed to save company verifications to database: " + error.message);
      }

      console.log(`Inserted ${companyEntries.length} company records into verified_company_records`);
      return decryptedData;
    } else {
      const errorMessage = decryptedData.msg || "Unknown verification error";
      console.error("Verification failed with message:", errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error("Company verification error:", error.message);
    throw new Error(error.message || "Company verification failed");
  }
};

const verifyEmployee = async (
  transID: string,
  personName: string,
  verificationYear: string,
  candidateId: string,
  companyId: number,
  establishmentId: string,
  companyName: string,
  companySecretToken: string,
  companyTsTransactionID: string,
  employeeId: string,
  organization_id: string,
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  retryCount: number = 0
): Promise<EmployeeVerificationResponse> => {
  const MAX_RETRIES = 1;

  try {
    console.log("Starting employee verification with:", {
      transID,
      personName,
      verificationYear,
      companyId,
      establishmentId,
      companyName,
    });

    if (!personName || personName.trim() === "") {
      throw new Error("Invalid employee name provided");
    }

    const encryptResponse = await axios.post<{ requestData: string }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-encrypt`,
      {
        transID,
        docType: "106",
        company_name: companyName,
        person_name: personName,
        verification_year: verificationYear,
        tsTransactionID: companyTsTransactionID,
        secretToken: companySecretToken,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    const requestData = encryptResponse.data.requestData;
    console.log("Employee encrypt response:", requestData);

    let verifyResponseData: string;
    try {
      const verifyResponse = await axios.post<{ responseData: string }>(
        `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-verify`,
        { requestData },
        { headers: { "Content-Type": "application/json" } }
      );
      verifyResponseData = verifyResponse.data.responseData;
      console.log("Employee verify response:", verifyResponseData);
    } catch (verifyError: any) {
      if (verifyError.response?.data?.responseData) {
        verifyResponseData = verifyError.response.data.responseData;
        console.log(
          `Caught error in employee verify step with status ${verifyError.response?.status}, proceeding with responseData:`,
          verifyResponseData
        );
      } else {
        console.error("Employee verify step error:", verifyError.message);
        throw new Error("Employee verification request failed: " + (verifyError.message || "Unknown error"));
      }
    }

    const decryptResponse = await axios.post<EmployeeVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-decrypt`,
      { responseData: verifyResponseData },
      { headers: { "Content-Type": "application/json" } }
    );
    const decryptedData = decryptResponse.data;
    console.log("Employee decrypt response:", decryptedData);

    if (
      decryptedData.status === 0 &&
      decryptedData.msg?.message?.toLowerCase() === "please generate new token" &&
      retryCount < MAX_RETRIES
    ) {
      console.log("Received 'please generate new token' error, retrying with new company verification...");

      const companyVerification = await verifyCompany(
        crypto.randomUUID(),
        companyName,
        candidateId,
        companyId,
        employeeId,
        organization_id
      );

      const companyEntries = Object.entries(companyVerification.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error("No company names returned during retry");
      }
      const [newEstablishmentId, newVerifiedCompanyName] = companyEntries[0];

      setWorkHistory((prev) =>
        prev.map((item) =>
          item.company_id === companyId
            ? {
                ...item,
                isVerified: true,
                verifiedCompanyName: newVerifiedCompanyName,
                establishmentId: newEstablishmentId,
                secretToken: companyVerification.secretToken,
                tsTransactionId: companyVerification.tsTransactionID,
                verificationError: null,
              }
            : item
        )
      );

      return await verifyEmployee(
        crypto.randomUUID(),
        personName,
        verificationYear,
        candidateId,
        companyId,
        newEstablishmentId,
        newVerifiedCompanyName,
        companyVerification.secretToken,
        companyVerification.tsTransactionID,
        employeeId,
        organization_id,
        setWorkHistory,
        retryCount + 1
      );
    }

    if (
      decryptedData.status === 1 &&
      decryptedData.msg?.employer_name &&
      decryptedData.msg?.establishment_id &&
      decryptedData.msg?.status === true &&
      decryptedData.msg?.status_code === 200 &&
      decryptedData.tsTransId
    ) {
      const { error } = await supabase.from("verified_employee_records").insert({
        employee_id: employeeId,
        candidate_id: candidateId,
        company_id: companyId,
        establishment_id: establishmentId,
        employee_name: personName,
        start_date: `${verificationYear}-01-01`,
        secret_token: decryptedData.tsTransId,
        ts_transaction_id: decryptedData.tsTransId,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_error: null,
        organization_id,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error("Failed to save employee verification to database: " + error.message);
      }

      console.log("Inserted successful employee verification record");
      return decryptedData;
    } else {
      const errorMessage = decryptedData.msg?.message || "Employee not found";
      console.error("Employee verification failed with message:", errorMessage);

      const { error } = await supabase.from("verified_employee_records").insert({
        employee_id: employeeId,
        candidate_id: candidateId,
        company_id: companyId,
        establishment_id: establishmentId,
        employee_name: personName,
        start_date: `${verificationYear}-01-01`,
        secret_token: decryptedData.tsTransId || null,
        ts_transaction_id: decryptedData.tsTransId || null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_error: errorMessage,
        organization_id,
      });

      if (error) {
        console.error("Supabase insert error for error record:", error);
        throw new Error("Failed to save employee verification error to database: " + error.message);
      }

      console.log("Inserted employee verification error record");
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error("Employee verification error:", error.message);

    const errorMessage = error.message || "Employee verification failed";
    const { error: dbError } = await supabase.from("verified_employee_records").insert({
      employee_id: employeeId,
      candidate_id: candidateId,
      company_id: companyId,
      establishment_id: establishmentId,
      employee_name: personName || "Unknown",
      start_date: `${verificationYear}-01-01`,
      secret_token: null,
      ts_transaction_id: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verification_error: errorMessage,
      organization_id,
    });

    if (dbError) {
      console.error("Supabase insert error for catch block:", dbError);
    }

    throw new Error(errorMessage);
  }
};

const handleVerifyCompany = async (
  company: WorkHistory,
  candidateId: string,
  employeeId: string,
  organization_id: string,
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  toast: ReturnType<typeof useToast>["toast"]
) => {
  setWorkHistory((prev) =>
    prev.map((item) =>
      item.company_id === company.company_id
        ? { ...item, isVerifying: true, verificationError: null }
        : item
    )
  );

  try {
    const transID = crypto.randomUUID();
    const cleanedCompanyName = cleanCompanyName(company.company_name);
    console.log(`Original name: ${company.company_name}, Cleaned name: ${cleanedCompanyName}`);

    const result = await verifyCompany(
      transID,
      cleanedCompanyName,
      candidateId,
      company.company_id,
      employeeId,
      organization_id
    );

    const companyEntries = Object.entries(result.CompanyName);
    if (companyEntries.length === 0) {
      throw new Error("No company names returned");
    }

    const [establishmentId, verifiedCompanyName] = companyEntries[0];
    console.log(`Verified ${companyEntries.length} companies for ${cleanedCompanyName}:`, companyEntries);

    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isVerified: true,
              verifiedCompanyName,
              establishmentId,
              secretToken: result.secretToken,
              tsTransactionId: result.tsTransactionID,
              verificationError: null,
            }
          : item
      )
    );

    toast({
      title: "Company Verification Successful",
      description: `Company "${verifiedCompanyName}" verified successfully. ${companyEntries.length} total companies recorded.`,
    });
  } catch (error: any) {
    console.error("Company verification failed:", error.message);
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isVerified: false,
              verificationError: error.message || "Company verification failed.",
            }
          : item
      )
    );

    toast({
      title: "Verification Failed",
      description: error.message || "Company verification failed. Please try again.",
      variant: "destructive",
    });
  }
};

const handleVerifyEmployee = async (
  company: WorkHistory,
  candidate: Candidate | null,
  candidateId: string,
  employeeId: string,
  organization_id: string,
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  toast: ReturnType<typeof useToast>["toast"]
) => {
  if (!candidateId || !candidate) return;

  setWorkHistory((prev) =>
    prev.map((item) =>
      item.company_id === company.company_id
        ? {
            ...item,
            isEmployeeVerifying: true,
            employeeVerificationError: null,
          }
        : item
    )
  );

  try {
    const transID = crypto.randomUUID();
    const personName =
      candidate.first_name && candidate.last_name
        ? `${candidate.first_name} ${candidate.last_name}`.trim()
        : candidate.name || "Unknown Employee";

    const parts = company.years.replace("to", "-").split("-").map((part) => part.trim().toLowerCase());
    let start = parts[0];

    let verificationYear: string;
    if (start.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [, , year] = start.split("/");
      verificationYear = year;
    } else if (start.match(/^\d{2}\/\d{4}$/)) {
      const [, year] = start.split("/");
      verificationYear = year;
    } else if (start.match(/^[a-z]+\s\d{4}$/)) {
      const [, year] = start.split(" ");
      verificationYear = year;
    } else if (start.match(/^[a-z]+\/\s?\d{4}$/)) {
      const [, year] = start.replace("/", "").split(/\s+/);
      verificationYear = year;
    } else if (start.match(/^\d{4}$/)) {
      verificationYear = start;
    } else {
      throw new Error("Unrecognized date format in work history");
    }

    if (!company.establishmentId || !company.secretToken || !company.tsTransactionId || !company.verifiedCompanyName) {
      throw new Error("Missing company verification details for employee verification");
    }

    const result = await verifyEmployee(
      transID,
      personName,
      verificationYear,
      candidateId,
      company.company_id,
      company.establishmentId,
      company.verifiedCompanyName,
      company.secretToken,
      company.tsTransactionId,
      employeeId,
      organization_id,
      setWorkHistory
    );

    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isEmployeeVerifying: false,
              isEmployeeVerified: true,
              employeeVerificationError: null,
            }
          : item
      )
    );

    toast({
      title: "Employee Verification Successful",
      description: `Employee "${personName}" verified for ${company.verifiedCompanyName}.`,
    });
  } catch (error: any) {
    console.error("Employee verification failed:", error.message);
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isEmployeeVerifying: false,
              isEmployeeVerified: false,
              employeeVerificationError: error.message || "Employee not found",
            }
          : item
      )
    );

    toast({
      title: "Verification Failed",
      description: `Failed to verify employee for ${company.company_name}: ${error.message || "Verification failed."}`,
      variant: "destructive",
    });
  }
};

const verifyAllCompanies = async (
  workHistory: WorkHistory[],
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  candidateId: string | undefined,
  candidate: Candidate | null,
  setIsVerifyingAll: React.Dispatch<React.SetStateAction<boolean>>,
  employeeId: string,
  organization_id: string,
  toast: ReturnType<typeof useToast>["toast"]
) => {
  if (!candidateId || !candidate) {
    toast({
      title: "Error",
      description: "Cannot verify without candidate data.",
      variant: "destructive",
    });
    return;
  }

  const unverifiedCompanies = workHistory.filter(
    (company) => !company.isVerified || !company.isEmployeeVerified
  );

  if (unverifiedCompanies.length === 0) {
    toast({
      title: "No Verifications Needed",
      description: "All companies and employees are already verified.",
    });
    return;
  }

  setIsVerifyingAll(true);

  let successCount = 0;
  let failureCount = 0;

  for (const company of unverifiedCompanies) {
    try {
      console.log(`Verifying company and employee: ${company.company_name} (ID: ${company.company_id})`);
      await handleVerifyAll(
        company,
        candidate,
        candidateId,
        employeeId,
        organization_id,
        setWorkHistory,
        toast
      );
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`Failed to verify company ${company.company_name}:`, error.message);
      failureCount++;
    }
  }

  setIsVerifyingAll(false);

  toast({
    title: "Verification Complete",
    description: `Processed ${unverifiedCompanies.length} compan${unverifiedCompanies.length > 1 ? "ies" : "y"}. ${successCount} succeeded, ${failureCount} failed.`,
    variant: failureCount > 0 ? "destructive" : "default",
  });
};

const handleVerifyAll = async (
  company: WorkHistory,
  candidate: Candidate | null,
  candidateId: string,
  employeeId: string,
  organization_id: string,
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  toast: ReturnType<typeof useToast>["toast"]
) => {
  if (!candidateId || !candidate) return;

  setWorkHistory((prev) =>
    prev.map((item) =>
      item.company_id === company.company_id
        ? {
            ...item,
            isVerifying: true,
            isEmployeeVerifying: true,
            verificationError: null,
            employeeVerificationError: null,
          }
        : item
    )
  );

  try {
    let companyVerification: CompanyVerificationResponse | null = null;
    let verifiedCompanyName = company.verifiedCompanyName || company.company_name;
    let establishmentId = company.establishmentId;
    let secretToken = company.secretToken;
    let tsTransactionId = company.tsTransactionId;

    if (!company.isVerified) {
      const transID = crypto.randomUUID();
      const cleanedCompanyName = cleanCompanyName(company.company_name);
      companyVerification = await verifyCompany(
        transID,
        cleanedCompanyName,
        candidateId,
        company.company_id,
        employeeId,
        organization_id
      );

      const companyEntries = Object.entries(companyVerification.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error("No company names returned");
      }
      [establishmentId, verifiedCompanyName] = companyEntries[0];
      secretToken = companyVerification.secretToken;
      tsTransactionId = companyVerification.tsTransactionID;

      setWorkHistory((prev) =>
        prev.map((item) =>
          item.company_id === company.company_id
            ? {
                ...item,
                isVerifying: false,
                isVerified: true,
                verifiedCompanyName,
                establishmentId,
                secretToken,
                tsTransactionId,
                verificationError: null,
              }
            : item
        )
      );

      toast({
        title: "Company Verification Successful",
        description: `Company "${verifiedCompanyName}" verified successfully.`,
      });
    }

    if (!establishmentId || !secretToken || !tsTransactionId || !verifiedCompanyName) {
      throw new Error("Missing company verification details for employee verification");
    }

    const transID = crypto.randomUUID();
    const personName =
      candidate.first_name && candidate.last_name
        ? `${candidate.first_name} ${candidate.last_name}`.trim()
        : candidate.name || "Unknown Employee";

    const parts = company.years.replace("to", "-").split("-").map((part) => part.trim().toLowerCase());
    let start = parts[0];

    let verificationYear: string;
    if (start.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [, , year] = start.split("/");
      verificationYear = year;
    } else if (start.match(/^\d{2}\/\d{4}$/)) {
      const [, year] = start.split("/");
      verificationYear = year;
    } else if (start.match(/^[a-z]+\s\d{4}$/)) {
      const [, year] = start.split(" ");
      verificationYear = year;
    } else if (start.match(/^[a-z]+\/\s?\d{4}$/)) {
      const [, year] = start.replace("/", "").split(/\s+/);
      verificationYear = year;
    } else if (start.match(/^\d{4}$/)) {
      verificationYear = start;
    } else {
      throw new Error("Unrecognized date format in work history");
    }

    const result = await verifyEmployee(
      transID,
      personName,
      verificationYear,
      candidateId,
      company.company_id,
      establishmentId,
      verifiedCompanyName,
      secretToken,
      tsTransactionId,
      employeeId,
      organization_id,
      setWorkHistory
    );

    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isEmployeeVerifying: false,
              isEmployeeVerified: true,
              employeeVerificationError: null,
            }
          : item
      )
    );

    toast({
      title: "Employee Verification Successful",
      description: `Employee "${personName}" verified for ${verifiedCompanyName}.`,
    });
  } catch (error: any) {
    console.error("Verification failed for company ID:", company.company_id, error.message);
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isEmployeeVerifying: false,
              isVerified: company.isVerified,
              isEmployeeVerified: false,
              verificationError: !company.isVerified ? error.message || "Company verification failed" : null,
              employeeVerificationError: company.isVerified ? error.message || "Employee not found" : null,
            }
          : item
      )
    );

    toast({
      title: "Verification Failed",
      description: `Failed to verify ${company.company_name}: ${error.message || "Verification failed."}`,
      variant: "destructive",
    });
    throw error;
  }
};

const WorkHistory: React.FC<WorkHistoryProps> = ({
  candidateId,
  candidate,
  workHistory,
  setWorkHistory,
  shareMode,
  isVerifyingAll,
  setIsVerifyingAll,
  toast,
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  useEffect(() => {
    if (!candidate?.id) return;

    const fetchWorkHistory = async () => {
      try {
        console.log("Fetching work history for candidate_id:", candidate.id);
        const { data: workData, error: workError } = await supabase
          .from("candidate_companies")
          .select("company_id, designation, years, companies!inner(name)")
          .eq("candidate_id", candidate.id);

        if (workError) {
          console.error("Error fetching work history:", workError.message);
          toast({
            title: "Error",
            description: "Failed to fetch work history: " + workError.message,
            variant: "destructive",
          });
          return;
        }

        console.log("Fetching verified company records for employee_id:", candidate.id);
        const { data: verifiedCompanies, error: companyError } = await supabase
          .from("verified_company_records")
          .select("company_id, company_name, establishment_id, secret_token, ts_transaction_id, verified_at")
          .eq("employee_id", candidate.id);

        if (companyError) {
          console.error("Error fetching verified companies:", companyError.message);
          toast({
            title: "Error",
            description: "Failed to fetch verified companies: " + companyError.message,
            variant: "destructive",
          });
        }

        console.log("Fetching verified employee records for employee_id:", candidate.id);
        const { data: verifiedEmployees, error: employeeError } = await supabase
          .from("verified_employee_records")
          .select(
            "company_id, employee_id, establishment_id, employee_name, start_date, secret_token, ts_transaction_id, verified_at, verification_error"
          )
          .eq("employee_id", candidate.id);

        if (employeeError) {
          console.error("Error fetching verified employees:", employeeError.message);
          toast({
            title: "Error",
            description: "Failed to fetch verified employee records: " + employeeError.message,
            variant: "destructive",
          });
        }

        if (workData) {
          const formattedWorkHistory: WorkHistory[] = workData.map((item) => {
            const companyIdNum = parseInt(item.company_id, 10);
            const verifiedCompany = verifiedCompanies
              ?.filter((v) => parseInt(v.company_id, 10) === companyIdNum)
              .sort((a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime())[0];

            const verifiedEmployee = verifiedEmployees?.find(
              (e) => parseInt(e.company_id, 10) === companyIdNum && e.employee_id === candidate.id
            );

            console.log(
              `Matching company_id: ${companyIdNum}, Verified Company:`,
              verifiedCompany,
              "Verified Employee:",
              verifiedEmployee
            );

            return {
              company_id: companyIdNum,
              company_name: item.companies?.name || "Unknown Company",
              designation: item.designation || "-",
              years: item.years || "-",
              overlapping: "N/A",
              isVerifying: false,
              isVerified: !!verifiedCompany,
              verifiedCompanyName: verifiedCompany?.company_name || undefined,
              establishmentId: verifiedCompany?.establishment_id || undefined,
              secretToken: verifiedCompany?.secret_token || undefined,
              tsTransactionId: verifiedCompany?.ts_transaction_id || undefined,
              verificationError: null,
              isEmployeeVerifying: false,
              isEmployeeVerified: !!verifiedEmployee,
              employeeVerificationError: verifiedEmployee?.verification_error || null,
            };
          });

          setWorkHistory(formattedWorkHistory);
        }
      } catch (error: any) {
        console.error("Unexpected error fetching work history:", error.message);
        toast({
          title: "Error",
          description: "Unexpected error: " + error.message,
          variant: "destructive",
        });
      }
    };

    fetchWorkHistory();
  }, [candidate?.id, setWorkHistory, toast]);

  if (workHistory.length === 0) return null;

  const sortedWorkHistory = [...workHistory].sort((a, b) => {
    const startYearA = parseInt(a.years.split("-")[0], 10) || 0;
    const startYearB = parseInt(b.years.split("-")[0], 10) || 0;
    return startYearB - startYearA;
  });

  const hasUnverifiedCompanies = sortedWorkHistory.some(
    (history) => !history.isVerified && !history.isVerifying
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Work History</h3>
        {!shareMode && hasUnverifiedCompanies && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              verifyAllCompanies(
                workHistory,
                setWorkHistory,
                candidateId,
                candidate,
                setIsVerifyingAll,
                user.id,
                organization_id,
                toast
              )
            }
            disabled={isVerifyingAll}
            className="flex items-center"
          >
            {isVerifyingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying All...
              </>
            ) : (
              "Verify All"
            )}
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {sortedWorkHistory.map((history, index) => {
          const [startYear, endYear] = history.years
            .split("-")
            .map((year) => parseInt(year.trim(), 10) || 0);
          let hasGap = false;
          let gapText = "";

          if (index < sortedWorkHistory.length - 1) {
            const nextHistory = sortedWorkHistory[index + 1];
            const nextStartYear = parseInt(nextHistory.years.split("-")[0], 10) || 0;
            const gap = endYear && nextStartYear ? endYear - nextStartYear : 0;
            if (gap > 1) {
              hasGap = true;
              gapText = `Gap of ${gap - 1} year${gap - 1 > 1 ? "s" : ""}`;
            }
          }

          return (
            <div key={index} className="relative pl-8 pb-6">
              <div className="absolute left-0 top-0 h-full">
                <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                {index < sortedWorkHistory.length - 1 && (
                  <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
                )}
              </div>
              <div>
                <p className={cn("text-xs", hasGap ? "text-red-600" : "text-gray-500")}>
                  {history.years}
                  {hasGap && <span className="ml-2">({gapText})</span>}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {history.isVerified && history.verifiedCompanyName
                    ? history.verifiedCompanyName
                    : history.company_name}
                </p>
                <p className="text-xs text-gray-600">{history.designation}</p>
                <p className="text-xs text-gray-600">Overlapping: {history.overlapping}</p>
                {history.isVerified && history.establishmentId && (
                  <p className="text-xs text-green-600">
                    Verified Establishment ID: {history.establishmentId}
                  </p>
                )}
                {history.isVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Company...</span>
                  </div>
                )}
                {history.verificationError && (
                  <p className="text-xs text-red-600 mt-1">{history.verificationError}</p>
                )}
                {history.isEmployeeVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Employee...</span>
                  </div>
                )}
                {history.isEmployeeVerified && (
                  <p className="text-xs text-green-600 mt-1">Employee Verified</p>
                )}
                {history.employeeVerificationError && (
                  <p className="text-xs text-red-600 mt-1">Employee not found</p>
                )}
                <div className="flex space-x-2 mt-2">
                  {!shareMode && !history.isVerified && !history.isVerifying && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleVerifyCompany(
                          history,
                          candidateId || "",
                          user.id,
                          organization_id,
                          setWorkHistory,
                          toast
                        )
                      }
                      disabled={isVerifyingAll}
                    >
                      Verify Company
                    </Button>
                  )}
                  {!shareMode &&
                    history.isVerified &&
                    !history.isEmployeeVerified &&
                    !history.isEmployeeVerifying && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleVerifyEmployee(
                            history,
                            candidate,
                            candidateId || "",
                            user.id,
                            organization_id,
                            setWorkHistory,
                            toast
                          )
                        }
                        disabled={isVerifyingAll}
                      >
                        Verify Employee
                      </Button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkHistory;
