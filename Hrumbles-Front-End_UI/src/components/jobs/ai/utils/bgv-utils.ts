// src/lib/bgv-utils.ts

/**
 * Human-readable labels for different lookup types
 */
export const LOOKUP_TYPE_LABELS: Record<string, string> = {
  'mobile_to_uan': 'Mobile Number',
  'mobile': 'Mobile Number',
  'pan_to_uan': 'PAN Number',
  'pan': 'PAN Number',
  'uan_full_history': 'UAN',
  'uan_full_history_gl': 'UAN',
  'latest_employment_uan': 'UAN',
  'latest_employment_mobile': 'Mobile Number',
  'latest_passbook_mobile': 'Mobile Number',
};

/**
 * Get the human-readable label for a lookup type
 * @param lookupType - The verification lookup type (e.g., 'mobile_to_uan', 'latest_employment_uan')
 * @returns The human-readable label (e.g., "Mobile Number", "UAN", "PAN Number")
 * @example
 * getLookupTypeLabel('mobile_to_uan') // Returns: "Mobile Number"
 * getLookupTypeLabel('uan_full_history_gl') // Returns: "UAN"
 */
export const getLookupTypeLabel = (lookupType: string): string => {
  return LOOKUP_TYPE_LABELS[lookupType] || 'Value';
};