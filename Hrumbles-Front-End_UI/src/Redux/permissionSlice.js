import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabase from '../config/supabaseClient';

export const fetchUserPermissions = createAsyncThunk(
  'permissions/fetchUserPermissions',
  async ({ userId, roleId, departmentId, organizationId }) => {
    const { data, error } = await supabase.rpc('get_user_combined_permissions', { 
      p_user_id: userId,
      p_role_id: roleId,
      p_dept_id: departmentId,
      p_org_id: organizationId // Added this
    });
    if (error) throw error;
    return data.map(p => p.permission_key);
  }
);

const permissionSlice = createSlice({
  name: 'permissions',
  initialState: { userPermissions: [], status: 'idle' },
  extraReducers: (builder) => {
    builder.addCase(fetchUserPermissions.fulfilled, (state, action) => {
      state.userPermissions = action.payload;
    });
  },
});

export default permissionSlice.reducer;