import { createSlice } from '@reduxjs/toolkit';

const intelligenceSearchSlice = createSlice({
  name: 'intelligenceSearch',
  initialState: {
    isDiscoveryMode: false, // true = searching API, false = viewing CRM
  filters: {
    q_keywords: '', // Used for Name/Keyword search
    person_titles: [],
    person_locations: [],
    person_seniorities: [],
    organization_ids: [],
    organization_names: [], // Helper for UI, maps to q_organization_domains_list or similar in API if needed
    organization_locations: [],
    organization_num_employees_ranges: [],
    revenue_range: { min: null, max: null },
    q_organization_domains_list: [],
    contact_email_status: [],
    currently_using_any_of_technology_uids: [],
    // Job Posting Filters
    q_organization_job_titles: [], 
    organization_job_locations: [],
    organization_num_jobs_range: { min: null, max: null },
  },
    crmSearchTerm: '', // Local search
    results: [], // API results buffer
    totalEntries: 0,
    currentPage: 1,
    perPage: 25, // Table page size
  },
  reducers: {
    setDiscoveryMode: (state, action) => {
      state.isDiscoveryMode = action.payload;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    updateDiscoveryFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // Reset to page 1 on filter change
      state.isDiscoveryMode = true;
    },
    setSavedSearchTerm: (state, action) => {
      state.savedSearchTerm = action.payload;
    },
   setPage: (state, action) => { state.currentPage = action.payload; },
    setPerPage: (state, action) => { state.perPage = action.payload; },
    resetFilters: (state) => {
      state.discoveryFilters = { q_keywords: '', person_titles: [], person_locations: [], organization_names: [], person_seniorities: [] };
      state.savedSearchTerm = '';
      state.currentPage = 1;
      state.isDiscoveryMode = false;
    },
    setSearchResults: (state, action) => {
      state.results = action.payload.people;
      state.totalEntries = action.payload.total_entries;
    },
        setFilters: (state, action) => {
      state.filters = action.payload;
      state.currentPage = 1;
    },
    setCrmSearchTerm: (state, action) => { state.crmSearchTerm = action.payload; },
        setTargetDestination: (state, action) => {
      state.targetWorkspaceId = action.payload.workspaceId;
      state.targetFileId = action.payload.fileId;
    },
        clearSearch: (state) => {
      state.isDiscoveryMode = false;
      state.results = [];
      state.filters = {};
      state.recentSearches = [];           // optional: also clear recent searches
      state.targetWorkspaceId = null;
      state.targetFileId = null;
    },
    resetSearch: (state) => {
      state.isDiscoveryMode = false;
      state.filters = {};
      state.results = [];
      state.totalEntries = 0;
      state.currentPage = 1;
    }

  },
});

export const { 
  setDiscoveryMode, 
  setViewMode, 
  updateDiscoveryFilters, 
  setSavedSearchTerm, 
  setPage, 
  resetFilters ,
  setFilters,
  setTargetDestination,
  clearSearch,
 setCrmSearchTerm, setSearchResults, setPerPage, resetSearch
} = intelligenceSearchSlice.actions;

export default intelligenceSearchSlice.reducer;