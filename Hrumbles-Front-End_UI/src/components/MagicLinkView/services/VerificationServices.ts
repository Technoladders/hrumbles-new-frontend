// services/verificationService.ts
import { supabase } from "@/integrations/supabase/client";
import axios from "axios";
import {
  CompanyVerificationResponse,
  EmployeeVerificationResponse,
  TruthScreenResponse,
  WorkHistory, // Assuming WorkHistory type is available globally or imported
} from "@/components/MagicLinkView/types"; // Assuming these interfaces are moved to a types file

// Define a small utility for recording API calls
interface ApiCallLog {
  candidate_id: string;
  organization_id: string;
  company_id?: number; // Optional for company logs
  employee_id?: string; // Typically user.id, maybe candidate.id for logs
  trans_id: string;
  api_type: 'company_encrypt' | 'company_verify' | 'company_decrypt' |
            'employee_encrypt' | 'employee_verify' | 'employee_decrypt' |
            'dual_uan_encrypt' | 'dual_uan_verify' | 'dual_uan_decrypt';
  endpoint_name: string; // e.g., 'employee-encrypt-step1'
  request_payload?: any; // The payload sent
  response_status_http?: number; // HTTP status of the response
  response_body_raw?: string; // Raw string body of the response
  response_body_parsed?: any; // Parsed JSON/object body
  error_message?: string;
  success: boolean;
  is_retry?: boolean;
}

async function recordApiLog(log: ApiCallLog) {
  const { error } = await supabase.from('api_call_logs').insert(log);
  if (error) {
    console.error('Failed to record API log to Supabase:', error);
  }
}

const API_BASE_URL = "/api/dual-encrypt-proxy";
const COMPANY_EMPLOYEE_PROXY_URL = "/api/company-employee-proxy";

// Helper for handling API errors - This `handleApiError` is for network/proxy errors
const handleApiError = (error: any, defaultMessage: string): string => {
  console.error("API error details:", {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
    headers: error.response?.headers,
  });
  if (error.message.includes("Network Error") || error.message.includes("timed out")) {
    return "Network error or request timed out: Unable to reach the verification service.";
  }
  if (error.response?.data?.error) {
    return typeof error.response.data.error === 'string' ? error.response.data.error : JSON.stringify(error.response.data.error);
  }
  return error.message || defaultMessage;
};

// ... (dualEncryptData, dualVerifyData, dualDecryptData, verifyDualUAN - These need similar `recordApiLog` additions)

// Example for dualEncryptData - apply this pattern for all
export const dualEncryptData = async (
  transID: string,
  uan: string,
  employer_name: string,
  candidateId: string, // Add candidateId for logging
  organizationId: string
): Promise<string> => {
  try {
    const requestPayload = { transID, docType: "464", uan, employer_name };
    const response = await axios.post<TruthScreenResponse>(
      `${API_BASE_URL}?endpoint=dual-encrypt`,
      requestPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    // Assuming your proxy now sends { responseData: "..." } consistently
    const responseData = response.data.responseData;

    await recordApiLog({
      candidate_id: candidateId,
      organization_id: organizationId,
      trans_id: transID,
      api_type: 'dual_uan_encrypt',
      endpoint_name: 'dual-encrypt',
      request_payload: requestPayload,
      response_status_http: response.status,
      response_body_raw: JSON.stringify(response.data), // Raw response from proxy
      response_body_parsed: response.data, // Parsed response from proxy
      success: true, // Assuming 200 from proxy means it got a responseData string
    });

    if (!responseData) {
      throw new Error("Missing requestData in encryption response.");
    }
    return responseData;
  } catch (error: any) {
    const errorMessage = handleApiError(error, "Failed to encrypt dual employment data");
    await recordApiLog({
      candidate_id: candidateId,
      organization_id: organizationId,
      trans_id: transID,
      api_type: 'dual_uan_encrypt',
      endpoint_name: 'dual-encrypt',
      request_payload: { transID, docType: "464", uan, employer_name },
      response_status_http: error.response?.status || 0,
      response_body_raw: error.response?.data ? JSON.stringify(error.response.data) : undefined,
      error_message: errorMessage,
      success: false,
    });
    throw new Error(errorMessage);
  }
};
// Apply similar log recording for dualVerifyData and dualDecryptData
export const verifyDualUAN = async (
  transID: string,
  uan: string,
  employer_name: string,
  candidateId: string,
  organization_id: string
): Promise<TruthScreenResponse> => {
  if (!/^\d{12}$/.test(uan)) {
    throw new Error("UAN must be a 12-digit number");
  }
  if (!employer_name) {
    throw new Error("Employer name is required for dual employment check");
  }

  try {
    const requestData = await dualEncryptData(transID, uan, employer_name);
    const responseData = await dualVerifyData(requestData);
    const decryptedData = await dualDecryptData(responseData);

    const { error } = await supabase.from("hr_dual_uan_verifications").insert({
      candidate_id: candidateId,
      uan,
      trans_id: decryptedData.transId || transID,
      ts_trans_id: decryptedData.tsTransId,
      status: decryptedData.status,
      msg: decryptedData.msg,
      created_at: new Date().toISOString(),
      organization_id,
    });

    if (error) {
      throw new Error("Failed to save dual UAN verification to database: " + error.message);
    }
    return decryptedData;
  } catch (error: any) {
    const errorMessage = error.message || "Dual UAN verification failed";
    await supabase.from("hr_dual_uan_verifications").insert({
      candidate_id: candidateId,
      uan,
      trans_id: transID,
      ts_trans_id: null,
      status: 0,
      msg: [],
      created_at: new Date().toISOString(),
      organization_id,
      verification_error: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

const cleanCompanyName = (name: string): string => {
  let cleaned = name.replace(/\s*\([^)]*\)/g, "").trim();
  cleaned = cleaned.replace(/[,|.]/g, "");
  return cleaned;
};


export const verifyCompany = async (
  transID: string,
  companyName: string,
  candidateId: string,
  companyId: number,
  userId: string,
  organizationId: string
): Promise<CompanyVerificationResponse> => {
  let requestDataForLog: string | null = null;
  let responseDataForLog: string | null = null;
  let decryptedData: CompanyVerificationResponse | null = null;
  let finalApiCallLogStatus = false; // Overall success for the api_call_logs table
  let finalErrorMessage: string | null = null;
  let httpStatusOnFailure: number = 0; // Capture HTTP status on error

  try {
    // Step 1: Encrypt
    const encryptPayload = { transID, docType: 106, companyName };
    const encryptAxiosResponse = await axios.post<any>( // Use `any` because proxy might send raw string
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-encrypt`,
      encryptPayload,
      { headers: { "Content-Type": "application/json" } }
    );
    // Proxy should return { responseData: "string" } or just "string"
    requestDataForLog = encryptAxiosResponse.data?.responseData || encryptAxiosResponse.data;
    if (!requestDataForLog) throw new Error("Missing requestData from company encryption.");

    await recordApiLog({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
      trans_id: transID, api_type: 'company_encrypt', endpoint_name: 'employee-encrypt-step1',
      request_payload: encryptPayload, response_status_http: encryptAxiosResponse.status,
      response_body_raw: JSON.stringify(encryptAxiosResponse.data), response_body_parsed: encryptAxiosResponse.data, success: true
    });


    // Step 2: Verify (Proxy relays whatever backend sent, even 400 or string)
    const verifyPayload = { requestData: requestDataForLog }; // Use the string from encrypt
    const verifyAxiosResponse = await axios.post<any>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-verify`,
      verifyPayload,
      { headers: { "Content-Type": "application/json" } }
    );
    // Proxy should return { responseData: "string" } or just "string" for verify step
    responseDataForLog = verifyAxiosResponse.data?.responseData || verifyAxiosResponse.data;
    if (!responseDataForLog) {
        // This means proxy got something unexpected or empty.
        // It's a critical error for verification flow.
        throw new Error("Missing responseData from company verification (proxy did not return expected data).");
    }

    await recordApiLog({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
      trans_id: transID, api_type: 'company_verify', endpoint_name: 'employee-verify-step1',
      request_payload: verifyPayload, response_status_http: verifyAxiosResponse.status,
      response_body_raw: JSON.stringify(verifyAxiosResponse.data), response_body_parsed: verifyAxiosResponse.data, success: true
    });

    // Step 3: Decrypt - THIS MUST ALWAYS BE CALLED TO GET THE REAL MESSAGE
    const decryptPayload = { responseData: responseDataForLog };
    const decryptAxiosResponse = await axios.post<CompanyVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-decrypt`,
      decryptPayload,
      { headers: { "Content-Type": "application/json" } }
    );
    decryptedData = decryptAxiosResponse.data; // This is the final parsed JSON from TruthScreen
    finalApiCallLogStatus = true; // Decryption step was successful from proxy's perspective

    await recordApiLog({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
      trans_id: transID, api_type: 'company_decrypt', endpoint_name: 'employee-decrypt-step1',
      request_payload: decryptPayload, response_status_http: decryptAxiosResponse.status,
      response_body_raw: JSON.stringify(decryptAxiosResponse.data), response_body_parsed: decryptAxiosResponse.data, success: true
    });

    // Now check the *decrypted TruthScreen status*
    if (decryptedData.status === 1 && decryptedData.CompanyName && decryptedData.tsTransactionID) {
      // Successful verification based on TruthScreen's internal logic
      const companyEntries = Object.entries(decryptedData.CompanyName);
      if (companyEntries.length === 0) {
        errorMessage = 'Company verification successful, but no company names returned after decryption (TruthScreen empty result).';
        // This is a "logical failure" even though API worked.
        // Still store success for the `verified_company_records` if you want to remember that you tried.
      }
      // Store successful verification records
      const insertRecords = companyEntries.map(([establishmentId, verifiedCompanyName]) => ({
        employee_id: userId, organization_id: organizationId, company_id: companyId, candidate_id: candidateId,
        company_name: verifiedCompanyName, establishment_id: establishmentId,
        secret_token: decryptedData.secretToken, ts_transaction_id: decryptedData.tsTransactionID,
        verified_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }));
      const { error: dbError } = await supabase.from('verified_company_records').insert(insertRecords);
      if (dbError) {
        console.error('Supabase insert error for verified_company_records:', dbError);
      }
      return decryptedData; // Return the successful decrypted data
    } else {
      // TruthScreen returned a status of 0 or missing expected fields in decrypted data
      errorMessage = decryptedData.msg || "Company verification failed after decryption (TruthScreen status 0).";
      throw new Error(errorMessage); // Throw to be caught by outer try-catch
    }

  } catch (error: any) {
    // This catches network errors, proxy timeouts, or errors thrown from decrypt step
    finalErrorMessage = handleApiError(error, "Company verification failed unexpectedly.");
    httpStatusOnFailure = error.response?.status || 0; // Capture actual HTTP status if available

    // Log the overall outcome to `company_verification_logs` even if it failed early
    await supabase.from('company_verification_logs').insert({
      candidate_id: candidateId, organization_id: organizationId, trans_id: transID,
      company_name_input: companyName,
      truthscreen_request_data: requestDataForLog, // What was sent to verify step
      truthscreen_response_raw: responseDataForLog, // Raw string from verify step response
      decrypted_response_data: decryptedData || (error.response?.data || {}), // Decrypted or raw error data
      secret_token: decryptedData?.secretToken || null,
      ts_transaction_id: decryptedData?.tsTransactionID || null,
      status_code_http: httpStatusOnFailure,
      truthscreen_status: decryptedData?.status || null,
      error_message: finalErrorMessage,
      status: 'failed',
      created_at: new Date().toISOString(),
    });

    throw new Error(finalErrorMessage); // Re-throw the error for the calling hook to display
  }
};





export const verifyEmployee = async (
  transID: string,
  personName: string,
  verificationYear: string,
  candidateId: string,
  companyId: number,
  establishmentId: string,
  companyName: string,
  companySecretToken: string,
  companyTsTransactionID: string,
  userId: string,
  organizationId: string,
  retryCount: number = 0
): Promise<EmployeeVerificationResponse> => {
  let requestDataForLog: string | null = null;
  let responseDataForLog: string | null = null;
  let decryptedData: EmployeeVerificationResponse | null = null;
  let finalErrorMessage: string | null = null;
  let consumedApiCredit = false;
  let tsEmployeeStatus: number | null = null;

  try {
    if (!personName || !establishmentId || !companySecretToken || !companyTsTransactionID) {
      throw new Error("Missing required details for employee verification.");
    }

    // Step 1: Encrypt via Proxy
    const encryptPayload = {
      transID, docType: "106", company_name: companyName, person_name: personName,
      verification_year: verificationYear, tsTransactionID: companyTsTransactionID, secretToken: companySecretToken,
    };
    const encryptAxiosResponse = await axios.post<{ responseData: string }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-encrypt`,
      encryptPayload
    );
    requestDataForLog = encryptAxiosResponse.data.responseData;
    if (!requestDataForLog) throw new Error("Missing requestData from employee encryption.");

    await recordApiLog({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
      trans_id: transID, api_type: 'employee_encrypt', endpoint_name: 'employee-encrypt',
      request_payload: encryptPayload, response_status_http: encryptAxiosResponse.status,
      response_body_parsed: encryptAxiosResponse.data, success: true
    });

    // Step 2: Verify via Proxy - IMPORTANT: Use `validateStatus`
    const verifyPayload = { requestData: requestDataForLog };
    const verifyAxiosResponse = await axios.post<{ responseData?: string; error?: any }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-verify`,
      verifyPayload,
      { validateStatus: () => true }
    );
    
    responseDataForLog = verifyAxiosResponse.data?.responseData;
    if (!responseDataForLog) {
      const errorMessage = verifyAxiosResponse.data?.error?.message || `Employee verification failed with status ${verifyAxiosResponse.status}. No responseData received from proxy.`;
      throw new Error(errorMessage);
    }
    
    await recordApiLog({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
      trans_id: transID, api_type: 'employee_verify', endpoint_name: 'employee-verify',
      request_payload: verifyPayload, response_status_http: verifyAxiosResponse.status,
      response_body_parsed: verifyAxiosResponse.data, success: true
    });

    // Step 3: Decrypt via Proxy
    const decryptPayload = { responseData: responseDataForLog };
    const decryptAxiosResponse = await axios.post<EmployeeVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-decrypt`,
      decryptPayload
    );
    decryptedData = decryptAxiosResponse.data;
    tsEmployeeStatus = decryptedData.status;

    await recordApiLog({
        candidate_id: candidateId, organization_id: organizationId, company_id: companyId, employee_id: userId,
        trans_id: transID, api_type: 'employee_decrypt', endpoint_name: 'employee-decrypt',
        request_payload: decryptPayload, response_status_http: decryptAxiosResponse.status,
        response_body_parsed: decryptAxiosResponse.data, success: true
    });

    if (decryptedData.status === 0 && decryptedData.msg?.message?.toLowerCase().includes('please generate new token')) {
      throw new Error('RETRY_COMPANY_VERIFICATION');
    }

    if (decryptedData.status === 1 && decryptedData.msg?.status === true) {
      consumedApiCredit = true;
      finalErrorMessage = null; // Success
      return decryptedData;
    } else {
      consumedApiCredit = true;
      finalErrorMessage = decryptedData.msg?.message || 'Employee not found or verification failed.';
      throw new Error(finalErrorMessage);
    }

  } catch (error: any) {
    if (error.message === 'RETRY_COMPANY_VERIFICATION') {
        throw error;
    }
    finalErrorMessage = handleApiError(error, 'Employee verification failed unexpectedly.');
    throw new Error(finalErrorMessage);
  } finally {
    // Always log the final outcome
    await supabase.from('employee_verification_logs').insert({
      candidate_id: candidateId, organization_id: organizationId, company_id: companyId,
      establishment_id: establishmentId, trans_id: transID, ts_transaction_id: decryptedData?.tsTransId || null,
      employee_name_input: personName, verification_year_input: verificationYear,
      truthscreen_request_data: requestDataForLog,
      truthscreen_response_raw: responseDataForLog,
      decrypted_result_data: decryptedData || { error: finalErrorMessage },
      truthscreen_status: tsEmployeeStatus,
      is_employee_found: tsEmployeeStatus === 1,
      consumed_api_credit: consumedApiCredit,
      error_message: finalErrorMessage,
      retry_count: retryCount,
      last_attempt_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }
};

// 