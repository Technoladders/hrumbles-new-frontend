// src/pages/jobs/ai/utils/bgvUtils.ts

/**
 * Checks if a verification result object represents a final, successful verification.
 * This function understands the different success codes from different providers.
 *
 * @param resultData The 'response_data' object from the 'uanlookups' table.
 * @param verificationType The type of verification (e.g., 'mobile_to_uan').
 * @returns `true` if the verification was successful, otherwise `false`.
 */
export const isVerificationSuccessful = (resultData: any, verificationType: string): boolean => {
  if (!resultData) return false;

  // --- Gridlines Success Check ---
  // Successful Gridlines lookups have a `data.code` of '1014' or other success codes.
  if (verificationType === 'latest_employment_mobile') {
    // We check for string '1014' as API might return it as a string.
    return resultData.data?.code == '1014';
  }

    // --- THIS IS THE KEY ADDITION ---
  if (verificationType === 'latest_passbook_mobile') {
    return resultData.data?.code == '1022'; // Passbook success code
  }

if (verificationType === 'latest_employment_uan') {
    // We check for string '1014' as API might return it as a string.
    return resultData.data?.code == '1014';
  }

    if (verificationType === 'uan_full_history_gl') {
    // Code 1013 means history was found. 1011/1015 means a definitive negative result was found.
    // All are considered a "successful" lookup.
    return ['1013', '1011', '1015'].includes(resultData.data?.code);
  }
  // --- TruthScreen Success Check ---
  // Successful TruthScreen lookups have a top-level `status` of 1 or 0.
  if (['mobile_to_uan', 'pan_to_uan', 'uan_full_history', 'mobile', 'pan'].includes(verificationType)) {
    return resultData.status === 1 || resultData.status === 0;
  }

  // Default to false if the type is unknown
  return false;
};