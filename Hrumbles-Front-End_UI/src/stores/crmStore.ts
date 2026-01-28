import { create } from 'zustand';

interface FilterState {
  lists: string[];
  persona: string[];
  seniorities: string[];
  locations: string[];
  industries: string[];
  employeeRanges: string[];
  revenueRanges: string[];
  contact_stage: string[];
  workspace_id: string[];
  file_id: string[];
}

interface CRMState {
  viewMode: 'people' | 'companies';
  sidebarOpen: boolean;
  globalSearch: string;
  tableSearch: string;
  selectedRows: string[];
  currentPage: number;
  pageSize: number;
  filters: FilterState;
  
  // Actions
  setViewMode: (mode: 'people' | 'companies') => void;
  toggleSidebar: () => void;
  setGlobalSearch: (val: string) => void;
  setTableSearch: (val: string) => void;
  setSelectedRows: (rows: string[]) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleFilterValue: (key: keyof FilterState, value: string) => void;
  clearAllFilters: () => void;
  clearSelection: () => void;
}

export const useCRMStore = create<CRMState>((set) => ({
  viewMode: 'people',
  sidebarOpen: true,
  globalSearch: '',
  tableSearch: '',
  selectedRows: [],
  currentPage: 1,
  pageSize: 25,
  filters: {
    lists: [], persona: [], seniorities: [], locations: [],
    industries: [], employeeRanges: [], revenueRanges: [],
    contact_stage: [], workspace_id: [], file_id: []
  },

  setViewMode: (mode) => set({ viewMode: mode, selectedRows: [] }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setGlobalSearch: (val) => set({ globalSearch: val }),
  setTableSearch: (val) => set({ tableSearch: val }),
  setSelectedRows: (rows) => set({ selectedRows: rows }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size }),
  
  toggleFilterValue: (key, value) => set((state) => {
    const current = state.filters[key] as string[];
    const next = current.includes(value) 
      ? current.filter(v => v !== value) 
      : [...current, value];
    return { filters: { ...state.filters, [key]: next } };
  }),

  clearAllFilters: () => set({ 
    globalSearch: '', tableSearch: '', 
    filters: { 
        lists: [], persona: [], seniorities: [], locations: [], 
        industries: [], employeeRanges: [], revenueRanges: [], 
        contact_stage: [], workspace_id: [], file_id: [] 
    } 
  }),
  clearSelection: () => set({ selectedRows: [] }),
}));