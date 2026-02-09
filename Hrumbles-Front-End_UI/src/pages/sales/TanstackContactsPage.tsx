"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel,
  ColumnFiltersState,
  VisibilityState,
  ColumnOrderState,
  ColumnSizingState
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Components
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { ContactFiltersSidebar } from '@/components/sales/contacts-table/ContactFiltersSidebar';
import { DiscoverySidebar } from '@/components/sales/discovery/DiscoverySidebar'; 
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { columns } from '@/components/sales/contacts-table/columns';

// Redux & Services
import { setDiscoveryMode, setPage, setFilters, resetSearch, setPerPage } from '@/Redux/intelligenceSearchSlice';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';
import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useToast } from '@/hooks/use-toast';

// Icons & UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Settings2, Zap, RotateCcw, Check, ArrowLeft, FolderOpen, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from "@chakra-ui/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

// Types for table preferences
interface TablePreferences {
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  columnSizing: ColumnSizingState;
}

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  seniority: false, 
  departments: false, 
  functions: false, 
  industry: false, 
  revenue: false, 
  employee_count: false,
  country: false, 
  city: false,
  created_at: false, 
  updated_at: false
};

const DEFAULT_COLUMN_ORDER: ColumnOrderState = [
  'select', 'name', 'email', 'mobile', 'job_title', 'company_name', 
  'actions', 'contact_stage', 'medium', 'created_by_employee', 
  'created_at', 'location', 'seniority', 'departments', 'functions',
  'industry', 'revenue', 'employee_count', 'updated_at'
];

const DEFAULT_COLUMN_SIZING: ColumnSizingState = {};

export default function TanstackContactsPage() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

    // 1. Redux State
  const { isDiscoveryMode, totalEntries, currentPage, perPage } = useSelector(
    (state: any) => state.intelligenceSearch
  );

  useEffect(() => {
    const pageParam = searchParams.get('page');
    const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
    
    // Only dispatch if different to prevent loops
    if (pageNumber !== currentPage) {
        dispatch(setPage(pageNumber));
    }
  }, [searchParams, currentPage, dispatch]);
  
  // Get fileId from route params
  const { fileId } = useParams<{ fileId?: string }>();
  

  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  // 2. Fetch file details if fileId is present
  const { data: currentFile } = useQuery({
    queryKey: ['workspace-file', fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select(`
          id,
          name,
          type,
          workspace_id,
          workspaces (
            id,
            name
          )
        `)
        .eq('id', fileId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!fileId
  });

  // 3. Local State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isFromDiscovery, setIsFromDiscovery] = useState(false);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // 4. Table Preferences State
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(DEFAULT_COLUMN_SIZING);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // 5. Fetch user table preferences from database
  const { data: userPreferences } = useQuery({
    queryKey: ['table-preferences', user?.id, 'contacts-table'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_table_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('table_name', 'contacts-table')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // 6. Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: TablePreferences) => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('user_table_preferences')
        .upsert({
          user_id: user.id,
          table_name: 'contacts-table',
          column_visibility: preferences.columnVisibility,
          column_order: preferences.columnOrder,
          column_sizing: preferences.columnSizing,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,table_name'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Preferences Saved", description: "Your table view has been saved." });
      queryClient.invalidateQueries({ queryKey: ['table-preferences', user?.id] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
    }
  });

  // 7. Load preferences from database on mount
  useEffect(() => {
    if (userPreferences && !preferencesLoaded) {
      if (userPreferences.column_visibility) {
        setColumnVisibility(userPreferences.column_visibility);
      }
      if (userPreferences.column_order) {
        setColumnOrder(userPreferences.column_order);
      }
      if (userPreferences.column_sizing) {
        setColumnSizing(userPreferences.column_sizing);
      }
      setPreferencesLoaded(true);
    } else if (!userPreferences && !preferencesLoaded && user?.id) {
      setPreferencesLoaded(true);
    }
  }, [userPreferences, preferencesLoaded, user?.id]);

  // 8. Save preferences handler
  const savePreferences = useCallback(() => {
    if (preferencesLoaded && user?.id) {
      savePreferencesMutation.mutate({
        columnVisibility,
        columnOrder,
        columnSizing
      });
    }
  }, [columnVisibility, columnOrder, columnSizing, preferencesLoaded, user?.id]);

  // 9. Unified Data Fetching - Now supports fileId
 const { data: queryResult, isLoading, isFetching } = useSimpleContacts({ 
    fileId: fileId || null, 
    fetchUnfiled: false 
  });

  const tableData = queryResult?.data || [];
  const totalRowCount = queryResult?.count || 0; // Get count from query

  // 10. Actions
  const handleSaveDiscovery = async (person: any, targetFileId?: string) => {
    try {
      const savedContact = await saveDiscoveryToCRM(person, organization_id, user.id);
      
      // If fileId provided (from modal or current page), also add to list
      const finalFileId = targetFileId || fileId;
      if (finalFileId && savedContact?.id) {
        await supabase.from('contact_workspace_files').upsert({
          contact_id: savedContact.id,
          file_id: finalFileId,
          added_by: user.id
        });
      }
      
      toast({ title: "Lead Captured", description: `${person.name || person.first_name} added to CRM.` });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['file-contacts', fileId] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
      return savedContact;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
      throw err;
    }
  };

  const handleEnrich = async (contactId: string, apolloId: string, type: 'email' | 'phone') => {
    try {
      toast({ title: "Request Sent", description: "Verifying data assets..." });
      await supabase.functions.invoke('enrich-contact', { 
        body: { contactId, apolloPersonId: apolloId, revealType: type } 
      });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

// Replace the current handleListAdd completely
const handleListAdd = async (targetFileId: string) => {
  if (!targetFileId) {
    toast({ variant: "destructive", title: "No list selected" });
    return;
  }

  try {
    if (isFromDiscovery && selectedContact?.original_data) {
      // ── Discovery → CRM + add to list in one flow ──
      const person = selectedContact.original_data;

      // 1. Save to contacts + get the new contact
      const savedContact = await saveDiscoveryToCRM(person, organization_id, user.id);

      if (!savedContact?.id) {
        throw new Error("Contact was created but no ID returned");
      }

      // 2. Add to the chosen list
      const { error } = await supabase
        .from('contact_workspace_files')
        .upsert({
          contact_id: savedContact.id,
          file_id: targetFileId,
          added_by: user.id,
          // optional: added_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${person.name || person.first_name} saved to CRM and added to list.`,
      });

      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['file-contacts', targetFileId] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    } 
    else if (selectedContact?.id) {
      // ── Normal CRM contact – just add to list ──
      const { error } = await supabase
        .from('contact_workspace_files')
        .upsert({
          contact_id: selectedContact.id,
          file_id: targetFileId,
          added_by: user.id,
        });

      if (error) throw error;

      toast({ title: "Added to List" });

      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['file-contacts', fileId] });
      }
    } 
    else {
      throw new Error("No valid contact selected");
    }
  } catch (err: any) {
    console.error("Add to list failed:", err);
    toast({
      variant: "destructive",
      title: "Failed to add to list",
      description: err.message || "An unexpected error occurred",
    });
  } finally {
    setListModalOpen(false);
    setIsFromDiscovery(false);
    setSelectedContact(null); // clean up
  }
};

  // --- 11. COMPREHENSIVE ASSET HANDLER (ADD/EDIT/DELETE/FLAG) ---
  const handleAssetAction = async (rowIndex: number, type: 'email' | 'mobile', action: string, value: string, payload?: any) => {
    if (isDiscoveryMode) return;
    const rowItem = tableData[rowIndex];
    if (!rowItem) return;

    const tableName = type === 'email' ? 'enrichment_contact_emails' : 'enrichment_contact_phones';
    const valCol = type === 'email' ? 'email' : 'phone_number';
    const statusCol = type === 'email' ? 'email_status' : 'status';
    const sourceCol = type === 'email' ? 'source' : 'source_name';
    const mainCol = type === 'email' ? 'email' : 'mobile';

    try {
      if (action === 'add') {
         const insertPayload: any = {
            contact_id: rowItem.id,
            [valCol]: value,
            [statusCol]: payload?.status || (type === 'email' ? 'unverified' : 'no_status'),
            [sourceCol]: 'Manual',
         };

         if (type === 'mobile') {
            insertPayload.type = payload?.type || 'mobile';
         }
         if (type === 'email') {
            insertPayload.is_primary = false; 
         }

         const { error } = await supabase.from(tableName).insert(insertPayload);
         if (error) throw error;

         if (!rowItem[mainCol]) {
            await supabase.from('contacts').update({ [mainCol]: value }).eq('id', rowItem.id);
            if (type === 'email') {
                await supabase.from(tableName).update({ is_primary: true }).eq('contact_id', rowItem.id).eq(valCol, value);
            }
         }
         toast({ title: "Added", description: "Record added successfully." });
      }
      else if (action === 'edit') {
         const { value: newValue, type: newType, status: newStatus } = payload;
         
         const updatePayload: any = {
            [valCol]: newValue,
            [statusCol]: newStatus
         };
         if (type === 'mobile') updatePayload.type = newType;

         const { error } = await supabase.from(tableName)
            .update(updatePayload)
            .eq('contact_id', rowItem.id)
            .eq(valCol, value);
         
         if (error) throw error;

         if (rowItem[mainCol] === value) {
            await supabase.from('contacts').update({ [mainCol]: newValue }).eq('id', rowItem.id);
         }
         toast({ title: "Updated", description: "Record updated." });
      }
      else if (action === 'set_primary') {
         await supabase.from('contacts').update({ [mainCol]: value }).eq('id', rowItem.id);
         
         if (type === 'email') {
            await supabase.from(tableName).update({ is_primary: false }).eq('contact_id', rowItem.id);
            await supabase.from(tableName).update({ is_primary: true }).eq('contact_id', rowItem.id).eq(valCol, value);
         }
         toast({ title: "Primary Updated", description: "Main contact method updated." });
      }
      else if (action === 'flag') {
         await supabase.from(tableName).update({ [statusCol]: payload }).eq('contact_id', rowItem.id).eq(valCol, value);
         toast({ title: "Status Updated", description: `Marked as ${payload}` });
      }
      else if (action === 'delete') {
         await supabase.from(tableName).delete().eq('contact_id', rowItem.id).eq(valCol, value);
         if (rowItem[mainCol] === value) {
            await supabase.from('contacts').update({ [mainCol]: null }).eq('id', rowItem.id);
         }
         toast({ title: "Deleted", description: "Record removed." });
      }

      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (e: any) {
        console.error(e);
        toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  // --- 12. HANDLE INLINE EDITS (Simple Columns) ---
  const handleUpdateData = async (rowIndex: number, columnId: string, value: any) => {
    if (isDiscoveryMode) return;
    const rowItem = tableData[rowIndex];
    if (!rowItem) return;

    try {
        if (columnId === 'location' && typeof value === 'object') {
          await supabase.from('contacts').update(value).eq('id', rowItem.id);
        } else {
          await supabase.from('contacts').update({ [columnId]: value }).eq('id', rowItem.id);
        }
        queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  // 13. Column Filters
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // 14. Adjust visibility based on mode
  useEffect(() => {
    if (isDiscoveryMode) {
      setColumnVisibility(prev => ({
        ...prev, 
        contact_stage: false, 
        medium: false, 
        created_by_employee: false, 
        created_at: false, 
        updated_at: false, 
        location: false, 
      }));
    } else {
      setColumnVisibility(prev => ({
        ...prev, 
        contact_stage: true, 
        medium: true, 
        created_by_employee: true, 
        created_at: true, 
        updated_at: false, 
        location: true,
      }));
    }
  }, [isDiscoveryMode]);

  // 15. Table Configuration
  const table = useReactTable({
    data: tableData,
    columns,
    state: { 
      columnFilters, 
      columnVisibility, 
      columnOrder,
      columnSizing,
      pagination: { pageIndex: currentPage - 1, pageSize: perPage } 
    },
    manualPagination: true, // <--- ALWAYS TRUE NOW (Server-side paging)
    rowCount: totalRowCount, // <--- PASS TOTAL COUNT FROM SERVER
    pageCount: isDiscoveryMode ? Math.ceil(totalEntries / perPage) : undefined,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
  onPaginationChange: (updater) => {
      // 1. Calculate the new state
      // 'updater' is usually a function: (oldState) => newState
      const currentPagination = { pageIndex: currentPage - 1, pageSize: perPage };
      const newPagination = typeof updater === 'function'
        ? updater(currentPagination)
        : updater;

      // 2. Handle Page Size Change (Rows per page)
      if (newPagination.pageSize !== perPage) {
        dispatch(setPerPage(newPagination.pageSize)); // Update Redux
        dispatch(setPage(1)); // Always reset to page 1 when changing limit
        
        // Update URL to page 1
        setSearchParams(prev => {
          prev.set('page', '1');
          return prev;
        });
      }

      // 3. Handle Page Index Change (Next/Prev)
      else if (newPagination.pageIndex !== currentPagination.pageIndex) {
        const newPageNumber = newPagination.pageIndex + 1;
        // Update URL (useEffect will catch this and update Redux)
        setSearchParams(prev => {
          prev.set('page', newPageNumber.toString());
          return prev;
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      saveDiscoveryLead: handleSaveDiscovery,
      enrichContact: handleEnrich,
      openListModal: (c: any, fromDiscovery: boolean = false) => { 
        setSelectedContact(c); 
        setIsFromDiscovery(fromDiscovery);
        setListModalOpen(true); 
      },
      updateData: handleUpdateData,
      handleAssetAction: handleAssetAction,
    }
  });

  console.log("tableData from TanstackContactsPage:", tableData);

  // 16. Reset preferences to default
  const handleResetPreferences = () => {
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setColumnSizing(DEFAULT_COLUMN_SIZING);
    toast({ title: "Reset", description: "Table view reset to defaults." });
  };

  // 17. Get column display name
  const getColumnDisplayName = (columnId: string) => {
    return columnId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // 18. Determine page title
  const pageTitle = fileId && currentFile 
    ? currentFile.name 
    : isDiscoveryMode 
      ? 'Global Intelligence' 
      : 'My Contacts';

  const recordCount = isDiscoveryMode 
    ? totalEntries 
    : table.getFilteredRowModel().rows.length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
        
        {/* HEADER - Full Width at Top */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
             {/* Back button when viewing a specific file */}
             {fileId && (
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => navigate('/lists')}
                 className="text-slate-600 hover:text-slate-900"
               >
                 <ArrowLeft size={16} className="mr-1" />
                 Back to Lists
               </Button>
             )}
             
             <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {fileId && currentFile?.workspaces && (
                    <Badge variant="outline" className="text-[9px] bg-slate-100">
                      <FolderOpen size={10} className="mr-1" />
                      {currentFile.workspaces.name}
                    </Badge>
                  )}
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                     {pageTitle}
                  </h1>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                   {isDiscoveryMode ? `${recordCount.toLocaleString()} Matches` : `${recordCount} Records`}
                </p>
             </div>
             
             {/* Mode toggle - only show when not viewing a specific file */}
             {!fileId && (
               <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner ml-4">
                  <button 
                    onClick={() => dispatch(resetSearch())} 
                    className={cn(
                      "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", 
                      !isDiscoveryMode ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    CRM Records
                  </button>
                  <button 
                    onClick={() => dispatch(setDiscoveryMode(true))} 
                    className={cn(
                      "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", 
                      isDiscoveryMode ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Search People
                  </button>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-3">

             {fileId && !isDiscoveryMode && (
               <Button 
                 variant="secondary" 
                 size="sm" 
                 onClick={() => setIsImportOpen(true)}
                 className="h-9 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
               >
                 <UploadCloud size={14} className="mr-2" />
                 Import CSV
               </Button>
             )}
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                <Input 
                   placeholder={isDiscoveryMode ? "Search Global Database..." : "Search Contacts..."}
                   className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 w-64"
                   value={searchTerm}
                   onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!isDiscoveryMode) table.getColumn('name')?.setFilterValue(e.target.value);
                   }}
                   onKeyDown={(e) => {
                      if (e.key === 'Enter' && isDiscoveryMode) dispatch(setFilters({ q_keywords: searchTerm }));
                   }}
                />
             </div>
             
             <Button 
               variant="outline" 
               size="sm" 
               className="h-9 hidden lg:flex"
               onClick={() => setViewSettingsOpen(true)}
             >
               <Settings2 className="mr-2 h-3.5 w-3.5" /> View
             </Button>
             
             {!isSidebarOpen && (
               <Button 
                 variant="outline" 
                 size="icon" 
                 onClick={() => setIsSidebarOpen(true)} 
                 className="h-9 w-9"
               >
                 <Filter size={14}/>
               </Button>
             )}
          </div>
        </header>

        {/* MAIN CONTENT - Sidebar and Table Share Space */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* SIDEBAR */}
          {isSidebarOpen && (
            <div className="w-[220px] flex-shrink-0 border-r bg-white z-20 overflow-hidden">
               {isDiscoveryMode ? (
                 <DiscoverySidebar /> 
               ) : (
                 <ContactFiltersSidebar 
                   table={table} 
                   isOpen={isSidebarOpen} 
                   onClose={() => setIsSidebarOpen(false)} 
                   fileId={fileId || null}
                 />
               )}
            </div>
          )}

          {/* TABLE AREA */}
<div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
  <div className="flex-1 overflow-hidden p-0 pb-0 flex flex-col relative">
      
      {/* 
         CHANGE 1: Only show full Spinner on INITIAL load (isLoading).
         On updates (isFetching), keep the table mounted but dimmed.
      */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed">
          <Spinner size="xl" color="indigo.500" />
          <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">
            Loading Contacts...
          </p>
        </div>
      ) : (
        <div className={cn(
            "flex-1 bg-white rounded-t-2xl border shadow-sm overflow-hidden flex flex-col transition-opacity duration-200",
            // Dim the table while fetching new page/rows
            isFetching ? "opacity-60 pointer-events-none" : "opacity-100"
        )}>
           {isDiscoveryMode && tableData.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                 <div className="bg-indigo-50 p-4 rounded-full mb-4">
                   <Zap className="h-8 w-8 text-indigo-600" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">Global Intelligence Search</h3>
                 <p className="text-sm text-slate-500 max-w-md mt-2">
                   Search over 275M+ verified contacts.
                 </p>
             </div>
           ) : tableData.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                 <div className="bg-slate-100 p-4 rounded-full mb-4">
                   <FolderOpen className="h-8 w-8 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">No Contacts Yet</h3>
                 <p className="text-sm text-slate-500 max-w-md mt-2">
                   {fileId 
                     ? "This list is empty. Add contacts from the Discovery mode or your CRM."
                     : "Start by adding contacts or searching in Discovery mode."
                   }
                 </p>
             </div>
           ) : (
             <DataTable table={table} />
           )}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="bg-white border-x border-b rounded-b-2xl px-6 py-3 flex justify-between items-center shadow-sm mb-6">
         <DataTablePagination table={table} />
      </div>
  </div>
</div>
        </div>

        {/* ADD TO LIST MODAL */}
        {selectedContact && (
          <AddToListModal 
            open={listModalOpen} 
            onOpenChange={(open: boolean) => {
              setListModalOpen(open);
              if (!open) setIsFromDiscovery(false);
            }} 
            personName={selectedContact.name || `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`} 
            onConfirm={handleListAdd}
            isFromDiscovery={isFromDiscovery}
          />
        )}

         {/* IMPORT DIALOG - RENDERED HERE */}
        <ContactImportDialog 
          open={isImportOpen} 
          onOpenChange={setIsImportOpen} 
          fileId={fileId || null} 
        />

        {/* VIEW SETTINGS DIALOG */}
        <Dialog open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Table View Settings
              </DialogTitle>
              <DialogDescription>
                Customize which columns are visible, their order, and sizes.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="visibility" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visibility">Column Visibility</TabsTrigger>
                <TabsTrigger value="order">Column Order</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visibility" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {table.getAllColumns()
                      .filter(column => typeof column.accessorFn !== "undefined" && column.getCanHide())
                      .map(column => (
                        <div 
                          key={column.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Label 
                            htmlFor={`col-${column.id}`} 
                            className="text-sm font-medium cursor-pointer capitalize"
                          >
                            {getColumnDisplayName(column.id)}
                          </Label>
                          <Switch
                            id={`col-${column.id}`}
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          />
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="order" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-1">
                    {columnOrder
                      .filter(colId => {
                        const col = table.getColumn(colId);
                        return col && col.getIsVisible();
                      })
                      .map((colId, index) => (
                        <div 
                          key={colId} 
                          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50 border"
                        >
                          <span className="text-xs text-slate-500 w-6">{index + 1}</span>
                          <span className="text-sm font-medium capitalize flex-1">
                            {getColumnDisplayName(colId)}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => {
                                const newOrder = [...columnOrder];
                                const currentIndex = newOrder.indexOf(colId);
                                if (currentIndex > 0) {
                                  [newOrder[currentIndex - 1], newOrder[currentIndex]] = 
                                  [newOrder[currentIndex], newOrder[currentIndex - 1]];
                                  setColumnOrder(newOrder);
                                }
                              }}
                            >
                              ↑
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={index === columnOrder.length - 1}
                              onClick={() => {
                                const newOrder = [...columnOrder];
                                const currentIndex = newOrder.indexOf(colId);
                                if (currentIndex < newOrder.length - 1) {
                                  [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
                                  [newOrder[currentIndex + 1], newOrder[currentIndex]];
                                  setColumnOrder(newOrder);
                                }
                              }}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="flex justify-between mt-4">
              <Button 
                variant="outline" 
                onClick={handleResetPreferences}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    savePreferences();
                    setViewSettingsOpen(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}