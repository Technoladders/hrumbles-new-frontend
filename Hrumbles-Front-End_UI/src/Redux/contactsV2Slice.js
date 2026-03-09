// src/Redux/contactsV2Slice.js
// NEW slice — does NOT touch intelligenceSearchSlice
import { createSlice } from '@reduxjs/toolkit';

const MAX_RECENT_SEARCHES = 5;

const EMPTY_FILTERS = {
  search: '',
  jobTitles: [],
  managementLevels: [],
  departments: [],
  seniorities: [],
  employeeCounts: [],
  stages: [],
  sources: [],
  industries: [],
  companyIds: [],
  countries: [],
  cities: [],
  hasEmail: false,
  hasPhone: false,
  isEnriched: false,
  // Discovery-only
  personLocations: [],
  organizationLocations: [],
  organizationEmployeeRanges: [],
  contactEmailStatus: [],
  technologies: '',
  personTitles: '',
  companyNameTags: [],
  jobPostingLocations: [],
  q_organization_job_titles: '',
  q_keywords: '',
  include_similar_titles: true,
  revenue_min: '',
  revenue_max: '',
};

const contactsV2Slice = createSlice({
  name: 'contactsV2',
  initialState: {
    // mode: 'crm' | 'discovery' | 'list'
    mode: 'crm',

    // localFilters = user is editing in sidebar, NOT yet applied
    localFilters: { ...EMPTY_FILTERS },

    // appliedFilters = what is actually sent to the server
    // Only changes when user clicks "Run Search"
    appliedFilters: null, // null = no search run yet (empty state)

    // Pagination
    currentPage: 1,
    perPage: 50,

    // Recent searches (persisted labels for display)
    // Each entry: { id, label, filters, timestamp }
    recentSearches: [],

    // Currently viewed list file
    activeFileId: null,

    // Selected rows
    selectedIds: [],
  },
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload;
      state.appliedFilters = null;
      state.localFilters = { ...EMPTY_FILTERS };
      state.currentPage = 1;
    },

    setActiveFileId: (state, action) => {
      state.activeFileId = action.payload;
      state.appliedFilters = null;
      state.localFilters = { ...EMPTY_FILTERS };
      state.currentPage = 1;
    },

    // Update local filter (sidebar editing — no fetch)
    updateLocalFilter: (state, action) => {
      state.localFilters = { ...state.localFilters, ...action.payload };
    },

    // Toggle array value in local filter
    toggleLocalFilterArray: (state, action) => {
      const { field, value } = action.payload;
      const current = state.localFilters[field] || [];
      state.localFilters[field] = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
    },

    // Apply local filters → trigger server fetch + save to recent searches
    runSearch: (state) => {
      state.appliedFilters = { ...state.localFilters };
      state.currentPage = 1;

      // Build a human-readable label for recent searches
      const parts = [];
      const f = state.localFilters;
      if (f.search) parts.push(f.search);
      if (f.q_keywords) parts.push(f.q_keywords);
      if (f.personTitles) parts.push(f.personTitles);
      if (f.jobTitles?.length) parts.push(f.jobTitles.join(', '));
      if (f.seniorities?.length) parts.push(f.seniorities.join(', '));
      if (f.countries?.length) parts.push(f.countries.join(', '));
      if (f.personLocations?.length) parts.push(f.personLocations.join(', '));
      if (f.industries?.length) parts.push(f.industries.join(', '));
      if (f.stages?.length) parts.push(f.stages.join(', '));
      if (f.employeeCounts?.length) parts.push(f.employeeCounts[0] + ' emp');
      if (f.hasEmail) parts.push('Has Email');
      if (f.hasPhone) parts.push('Has Phone');
      if (f.companyNameTags?.length) parts.push(f.companyNameTags.join(', '));

      if (parts.length === 0) return; // Don't save empty searches

      const label = parts.slice(0, 4).join(' · ');
      const newEntry = {
        id: Date.now().toString(),
        label,
        filters: { ...state.localFilters },
        timestamp: Date.now(),
        mode: state.mode,
      };

      // Deduplicate by label
      const filtered = state.recentSearches.filter(r => r.label !== label);
      state.recentSearches = [newEntry, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    },

    // Re-apply a recent search
    applyRecentSearch: (state, action) => {
      const entry = action.payload;
      state.localFilters = { ...entry.filters };
      state.appliedFilters = { ...entry.filters };
      state.mode = entry.mode || state.mode;
      state.currentPage = 1;
    },

    removeRecentSearch: (state, action) => {
      state.recentSearches = state.recentSearches.filter(r => r.id !== action.payload);
    },

    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },

    resetFilters: (state) => {
      state.localFilters = { ...EMPTY_FILTERS };
      state.appliedFilters = null;
      state.currentPage = 1;
    },

    setPage: (state, action) => {
      state.currentPage = action.payload;
    },

    setPerPage: (state, action) => {
      state.perPage = action.payload;
      state.currentPage = 1;
    },

    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },

    toggleSelectedId: (state, action) => {
      const id = action.payload;
      if (state.selectedIds.includes(id)) {
        state.selectedIds = state.selectedIds.filter(i => i !== id);
      } else {
        state.selectedIds.push(id);
      }
    },

    clearSelection: (state) => {
      state.selectedIds = [];
    },
  },
});

export const {
  setMode,
  setActiveFileId,
  updateLocalFilter,
  toggleLocalFilterArray,
  runSearch,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  resetFilters,
  setPage,
  setPerPage,
  setSelectedIds,
  toggleSelectedId,
  clearSelection,
} = contactsV2Slice.actions;

export default contactsV2Slice.reducer;