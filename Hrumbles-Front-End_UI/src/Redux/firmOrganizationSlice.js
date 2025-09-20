import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../integrations/supabase/client'; // Adjust this path if necessary

export const fetchFirmOrganizationDetails = createAsyncThunk(
  'firmOrganization/fetchDetails',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization ID provided.');
    }
    try {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  details: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const firmOrganizationSlice = createSlice({
  name: 'firmOrganization',
  initialState,
  reducers: {
    clearFirmOrganization: (state) => {
      state.details = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFirmOrganizationDetails.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFirmOrganizationDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.details = action.payload;
      })
      .addCase(fetchFirmOrganizationDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearFirmOrganization } = firmOrganizationSlice.actions;
export default firmOrganizationSlice.reducer;