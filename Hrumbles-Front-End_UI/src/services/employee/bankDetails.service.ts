
import { supabase } from "@/integrations/supabase/client";
import { BankDetails } from "../types/employee.types";

export const bankDetailsService = {
  async getBankDetails(employeeId: string): Promise<BankDetails | null> {
    const { data, error } = await supabase
      .from('hr_employee_bank_details')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) return null;

    return {
      accountHolderName: data.account_holder_name,
      accountNumber: data.account_number,
      ifscCode: data.ifsc_code,
      bankName: data.bank_name,
      branchName: data.branch_name,
      accountType: data.account_type,
      bankPhone: data.bank_phone
    };
  },

  async createBankDetails(employeeId: string, bankDetails: BankDetails) {
    const { error } = await supabase
      .from('hr_employee_bank_details')
      .insert({
        employee_id: employeeId,
        account_holder_name: bankDetails.accountHolderName,
        account_number: bankDetails.accountNumber,
        ifsc_code: bankDetails.ifscCode,
        bank_name: bankDetails.bankName,
        branch_name: bankDetails.branchName,
        account_type: bankDetails.accountType,
        bank_phone: bankDetails.bankPhone
      });

    if (error) throw error;
  },

  async updateBankDetails(employeeId: string, bankDetails: Partial<BankDetails>) {
    const { error } = await supabase
      .from('hr_employee_bank_details')
      .update({
        account_holder_name: bankDetails.accountHolderName,
        account_number: bankDetails.accountNumber,
        ifsc_code: bankDetails.ifscCode,
        bank_name: bankDetails.bankName,
        branch_name: bankDetails.branchName,
        account_type: bankDetails.accountType,
        bank_phone: bankDetails.bankPhone
      })
      .eq('employee_id', employeeId);

    if (error) throw error;
  }
};
