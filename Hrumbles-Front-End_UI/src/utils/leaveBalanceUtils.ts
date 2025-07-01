
import { supabase } from '@/integrations/supabase/client';

export const updateLeaveBalance = async (
  employeeId: string, 
  leaveTypeId: string, 
  workingDays: number, 
  isDeduction: boolean = true
) => {
  console.log(`Updating leave balance for employee ${employeeId}, leave type ${leaveTypeId}, working days ${workingDays}, isDeduction: ${isDeduction}`);
  
  const currentYear = new Date().getFullYear();
  
  // Get the current leave balance
  const { data: balanceData, error: balanceError } = await supabase
    .from('employee_leave_balances')
    .select('id, remaining_days, used_days')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', currentYear)
    .single();
  
  if (balanceError) {
    console.error('Error fetching leave balance:', balanceError);
    throw balanceError;
  }
  
  console.log('Current balance data:', balanceData);
  
  // Calculate new values based on whether we're deducting or adding days back
  const newRemainingDays = isDeduction 
    ? balanceData.remaining_days - workingDays 
    : balanceData.remaining_days + workingDays;
  
  const newUsedDays = isDeduction 
    ? balanceData.used_days + workingDays 
    : balanceData.used_days - workingDays;
  
  console.log(`New balance: remaining=${newRemainingDays}, used=${newUsedDays}`);
  
  // Update the leave balance
  const { error: updateError } = await supabase
    .from('employee_leave_balances')
    .update({
      remaining_days: newRemainingDays,
      used_days: newUsedDays
    })
    .eq('id', balanceData.id);
  
  if (updateError) {
    console.error('Error updating leave balance:', updateError);
    throw updateError;
  }
  
  console.log('Leave balance updated successfully');
  
  // Return the updated values for confirmation
  return {
    remainingDays: newRemainingDays,
    usedDays: newUsedDays
  };
};
