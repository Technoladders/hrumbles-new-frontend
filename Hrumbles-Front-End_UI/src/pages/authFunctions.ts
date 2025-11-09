import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

interface User {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export const fetchUsers = async (): Promise<User[]> => {

    const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, email, first_name, last_name')
      .eq('organization_id', organization_id);
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching users:', error.message);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

export const changeUserPassword = async (userId: string, newPassword: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('change-password', {
      body: { userId, newPassword },
    });
    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to invoke edge function');
    }
    return data;
  } catch (error: any) {
    console.error('Error changing password:', error.message);
    throw new Error(error.message || 'Failed to change password');
  }
};