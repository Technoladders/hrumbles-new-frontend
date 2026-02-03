import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DiscoveryState {
  results: any[];
  filters: any;
  pagination: {
    page: number;
    total_entries: number;
    total_pages: number;
  };
  isDiscoveryMode: boolean;
}

const initialState: DiscoveryState = {
  results: [],
  filters: {},
  pagination: { page: 1, total_entries: 0, total_pages: 0 },
  isDiscoveryMode: false,
};

const discoverySearchSlice = createSlice({
  name: 'discoverySearch',
  initialState,
  reducers: {
    setSearchResults: (state, action: PayloadAction<any>) => {
      state.results = action.payload.people;
      state.pagination = action.payload.pagination;
      state.isDiscoveryMode = true;
    },
    setDiscoveryFilters: (state, action: PayloadAction<any>) => {
      state.filters = action.payload;
    },
    exitDiscoveryMode: (state) => {
      state.isDiscoveryMode = false;
      state.results = [];
    },
  },
});

export const { setSearchResults, setDiscoveryFilters, exitDiscoveryMode } = discoverySearchSlice.actions;
export default discoverySearchSlice.reducer;