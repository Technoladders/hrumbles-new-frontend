// src/redux/organizationSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  subdomain: null, // This will store 'technoladder', 'deloite', etc.
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  // You could also store the full organization details here later
  // details: null, 
};

export const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    // This action will be dispatched once when the app loads on a subdomain
    setOrganization: (state, action) => {
      state.subdomain = action.payload;
      state.status = 'succeeded';
    },
    // Optional: action to clear the organization
    clearOrganization: (state) => {
      state.subdomain = null;
      state.status = 'idle';
    },
  },
});

// Export the action creators
export const { setOrganization, clearOrganization } = organizationSlice.actions;

// Export the reducer to be added to the store
export default organizationSlice.reducer;