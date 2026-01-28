// TanstackContactPage.tsx - REDESIGNED WITH PROFESSIONAL UI

import React from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { useUserPreferences } from '@/hooks/sales/useUserPreferences';
import { useSelector } from 'react-redux';
import {
  ColumnDef,
  ColumnOrderState,
  ColumnSizingState,
  GroupingState,
  VisibilityState,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { columns as defaultColumns, ActionColumn, getCustomCell } from '@/components/sales/contacts-table/columns';
import { DataTableToolbar } from '@/components/sales/contacts-table/data-table-toolbar';
import { AddColumnDialog } from '@/components/sales/contacts-table/AddColumnDialog';
import { ReorderableHeader } from '@/components/sales/contacts-table/columns';
import type { SimpleContact } from '@/types/simple-contact.types';
import { AddContactForm } from '@/components/sales/contacts-table/AddContactForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Download, Search, Filter, SlidersHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog'
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { MoveContactsToolbar } from '@/components/sales/contacts-table/MoveContactsToolbar';
import { Flex, Text, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Spinner } from "@chakra-ui/react";
import { ChevronRightIcon } from '@chakra-ui/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { ContactDetailPanel } from '@/components/sales/contacts-table/ContactDetailPanel';
import { PeopleSearchDialog } from '@/components/sales/contacts-table/PeopleSearchDialog';
import { ContactFiltersSidebar } from '@/components/sales/contacts-table/ContactFiltersSidebar';
import { TableSkeleton } from '@/components/sales/contacts-table/TableSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const NATIVE_COLUMNS = ['id', 'name', 'email', 'mobile', 'job_title', 'linkedin_url', 'contact_stage', 'company_id', 'company_name', 'created_at', 'updated_at', 'created_by', 'updated_by', 'organization_id', 'file_id', 'medium', 'country', 'state', 'city', 'timezone', 'alt_mobile'];

const TanstackContactsPage: React.FC = () => {
  const { toast } = useToast();
  const { fileId: fileIdFromUrl } = useParams<{ fileId?: string }>();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  const { viewingMode } = useSelector((state: any) => state.workspace);
  const queryClient = useQueryClient();

  const { data: serverContacts = [], isLoading } = useSimpleContacts({ 
      fileId: fileIdFromUrl,
      fetchUnfiled: viewingMode === 'unfiled' && !fileIdFromUrl
  });
  const updateContactMutation = useUpdateSimpleContact();
  const deleteContactMutation = useDeleteContact();

  const { data: breadcrumbData, isLoading: isLoadingBreadcrumb } = useQuery({
    queryKey: ['breadcrumbData', fileIdFromUrl],
    queryFn: async () => {
        if (!fileIdFromUrl) return null;

        const { data: fileData, error: fileError } = await supabase
            .from('workspace_files')
            .select('name, workspace_id, workspaces(name)')
            .eq('id', fileIdFromUrl)
            .single();

        if (fileError) throw fileError;
        return fileData;
    },
    enabled: !!fileIdFromUrl,
  });

  const [isManageStagesOpen, setIsManageStagesOpen] = React.useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<SimpleContact | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [chartDateRange, setChartDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  const { data: savedColumnOrder, set: saveColumnOrder } = useUserPreferences<ColumnOrderState>('contactsColumnOrderV2');
  const { data: savedColumnSizing, set: saveColumnSizing } = useUserPreferences<ColumnSizingState>('contactsColumnSizing');

  const { data: employees = [] } = useQuery({
    queryKey: ['employeesForFilter', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase.from('hr_employees').select('id, first_name, last_name').eq('organization_id', organization_id).order('first_name', { ascending: true });
      if (error) { console.error("Error fetching employees:", error); return []; }
      return data;
    },
    enabled: !!organization_id,
  });

  const createdByOptions = React.useMemo(() => {
    return [
      { value: 'all', label: 'All Creators' },
      { value: 'system', label: 'System' },
      ...employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` })),
    ];
  }, [employees]);

  const { data: customFields = [] } = useQuery({
    queryKey: ['customContactFields', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data } = await supabase.from('custom_contact_fields').select('*').eq('organization_id', organization_id);
      return data ?? [];
    },
    enabled: !!organization_id,
  });

  
  const filteredData = React.useMemo(() => {
    return serverContacts.filter(contact => {
      if (!chartDateRange?.startDate) return true;
      const createdAt = new Date(contact.created_at);
      const from = chartDateRange.startDate;
      const to = chartDateRange.endDate || new Date();
      to.setHours(23, 59, 59, 999);
      return createdAt >= from && createdAt <= to;
    });
  }, [serverContacts, chartDateRange]);

  const createNameColumn = (): ColumnDef<SimpleContact> => ({
    id: 'name',
    accessorKey: 'name',
    header: ReorderableHeader,
    cell: ({ row }) => {
      const contact = row.original;
      
      return (
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-blue-600 hover:text-blue-700 hover:underline text-sm"
          onClick={() => setSelectedContact(contact)}
        >
          {contact.name}
        </Button>
      );
    },
    size: 180,
    minSize: 140,
    maxSize: 280,
  });
 
  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const updatedDefaultColumns = defaultColumns.map(col => 
      col.id === 'name' ? createNameColumn() : col
    );

    const dynamicColumns: ColumnDef<SimpleContact>[] = customFields
        .filter(field => !NATIVE_COLUMNS.includes(field.column_key))
        .map(field => ({
            id: field.column_key,
            accessorFn: row => (row.custom_data as any)?.[field.column_key],
            header: ReorderableHeader,
            cell: getCustomCell(field.data_type as any),
            size: 140, minSize: 100, maxSize: 220,
        }));
    
    const auditStartIndex = updatedDefaultColumns.findIndex(col => col.id === 'created_by_employee');

    if (auditStartIndex !== -1) {
        const preAuditColumns = updatedDefaultColumns.slice(0, auditStartIndex);
        const auditColumns = updatedDefaultColumns.slice(auditStartIndex);
        return [...preAuditColumns, ...dynamicColumns, ...auditColumns, ActionColumn];
    }

    return [...updatedDefaultColumns, ...dynamicColumns, ActionColumn];
  }, [customFields]);

  const table = useReactTable({
    data: filteredData,
    enableRowSelection: true,
    columns: memoizedColumns,
    autoResetPageIndex: false,
    initialState: {
      pagination: { pageSize: 20 },
      columnVisibility: {
        workspace_id: false,
        file_id: false,
        industry: false,
        ...columnVisibility
      }
    },
    state: { columnOrder, columnSizing, grouping, columnVisibility, columnFilters },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        console.log(`Step 2: table.meta.updateData called with:`, { rowIndex, columnId, value });
        handleRowUpdate(rowIndex, columnId, value);
      },
      deleteRow: (contactId: string) => handleDeleteRow(contactId),
      onContactClick: (contact: SimpleContact) => setSelectedContact(contact),
    },
    columnResizeMode: 'onChange',
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onGroupingChange: setGrouping,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      emailExists: (row, columnId, filterValue) => {
        if (filterValue === 'exists') {
          const email = row.getValue(columnId);
          return email != null && email !== '';
        }
        return true;
      },
    },
  });

  React.useEffect(() => {
    const initialOrder = memoizedColumns.map(c => c.id!).filter(Boolean);
    setColumnOrder(savedColumnOrder?.length ? savedColumnOrder : initialOrder);
    setColumnSizing(savedColumnSizing ?? {});
  }, [memoizedColumns, savedColumnOrder, savedColumnSizing]);
  
  React.useEffect(() => {
    setColumnVisibility(grouping.includes('contact_stage') ? { 'contact_stage': false } : {});
  }, [grouping]);

  const handleRowUpdate = (rowIndex: number, columnId: string, value: unknown) => {
    console.log("Step 3: handleRowUpdate function entered.");

    const originalRow = table.getPrePaginationRowModel().rowsById[rowIndex]?.original;

    console.log("Original Row:", originalRow);

    if (!originalRow) {
      console.error(`Could not find original row data at index ${rowIndex}. Aborting update.`);
      return;
    }

    let incomingUpdates: Record<string, any>;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        incomingUpdates = value;
    } else {
        incomingUpdates = { [columnId]: value };
    }

    const nativeUpdates: Record<string, any> = {};
    const customUpdates: Record<string, any> = {};
    for (const key in incomingUpdates) {
        if (Object.prototype.hasOwnProperty.call(incomingUpdates, key)) {
            if (NATIVE_COLUMNS.includes(key)) {
                nativeUpdates[key] = incomingUpdates[key];
            } else {
                customUpdates[key] = incomingUpdates[key];
            }
        }
    }

    const finalUpdates: Record<string, any> = { ...nativeUpdates };
    if (Object.keys(customUpdates).length > 0) {
        finalUpdates.custom_data = {
            ...(originalRow.custom_data || {}),
            ...customUpdates,
        };
    }
    
    finalUpdates.updated_at = new Date().toISOString();
    finalUpdates.updated_by = currentUser?.id;
    
    console.log("Final payload being sent to mutate:", { item: originalRow, updates: finalUpdates });

    updateContactMutation.mutate(
        { item: originalRow, updates: finalUpdates },
        {
            onError: (err: any) => {
                toast({ title: "Update Failed", variant: "destructive", description: err.message });
            },
        }
    );
  };

  const handleDeleteRow = (contactId: string) => {
    deleteContactMutation.mutate(contactId, {
      onSuccess: () => {
        toast({ title: "Contact Deleted" });
        if (selectedContact?.id === contactId) {
          setSelectedContact(null);
        }
      },
      onError: (err: any) => toast({ title: "Delete Failed", variant: "destructive", description: err.message }),
    });
  };

  const handleEditContact = (contact: SimpleContact) => {
    setSelectedContact(null);
    toast({ title: "Edit functionality", description: "Implement edit dialog here" });
  };

  const handleDownloadCsv = (exportAll: boolean) => {
    const rowsToExport = exportAll ? table.getPrePaginationRowModel().rows : table.getRowModel().rows;
    const visibleColumns = table.getVisibleLeafColumns().filter(c => !['select', 'actions'].includes(c.id));
    const header = visibleColumns.map(c => c.id);
    const rows = rowsToExport.map(row => 
        visibleColumns.map(col => row.getValue(col.id))
    );
    const csv = Papa.unparse({ fields: header, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', exportAll ? 'all_contacts.csv' : 'contacts_page.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const visibleColumns = table.getVisibleLeafColumns().filter(c => !['select', 'actions'].includes(c.id));
    const head = [visibleColumns.map(c => c.id)];
    const body = table.getRowModel().rows.map(row =>
      visibleColumns.map(col => {
        const value = row.getValue(col.id);
        if (value instanceof Date) return value.toLocaleDateString();
        return String(value ?? '');
      })
    );
    
    doc.text("Contacts Report", 14, 16);
    autoTable(doc, { head, body, startY: 20 });
    doc.save('contacts.pdf');
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Main Container with modern gradient background */}
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        


        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Header Section with clean design */}
          <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
            <div className="px-6 py-4">
              {fileIdFromUrl && (
                <Breadcrumb spacing="6px" separator={<ChevronRightIcon color="gray.400" boxSize={3} />} mb={2}>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      as={RouterLink} 
                      to="/lists"
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Workspaces
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {isLoadingBreadcrumb ? (
                    <Spinner size="xs" color="slate.400" />
                  ) : breadcrumbData && (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink 
                          as={RouterLink} 
                          to="/lists"
                          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          {breadcrumbData.workspaces?.name || 'Workspace'}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbItem isCurrentPage>
                        <BreadcrumbLink className="text-xs text-slate-700 font-medium">
                          {breadcrumbData.name}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  )}
                </Breadcrumb>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {fileIdFromUrl 
                      ? (breadcrumbData?.name || 'File People') 
                      : (viewingMode === 'unfiled' ? 'Unfiled People' : 'All People')
                    }
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {fileIdFromUrl
                      ? `${filteredData.length} contacts in this file`
                      : viewingMode === 'unfiled'
                        ? `${filteredData.length} unassigned contacts`
                        : `${filteredData.length} total contacts`
                    }
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setIsSearchDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                  >
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    Apollo Search
                  </Button>

                  <EnhancedDateRangeSelector 
                    value={chartDateRange} 
                    onChange={setChartDateRange} 
                  />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleDownloadCsv(false)}>
                        Export Page (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadCsv(true)}>
                        Export All (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDownloadPdf}>
                        Export Page (PDF)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsManageStagesOpen(true)}>
                        Manage Stages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsAddColumnOpen(true)}>
                        Manage Columns
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Toolbar Section */}
            <div className="px-6 pb-3">
              <DataTableToolbar
                table={table}
                onOpenAddContactDialog={() => setIsAddContactOpen(true)}
                onOpenImportDialog={() => setIsImportOpen(true)}
                onToggleGrouping={() => table.setGrouping(prev => prev.length ? [] : ['contact_stage'])}
                onToggleFilters={() => setIsSidebarOpen(!isSidebarOpen)}
                isSidebarOpen={isSidebarOpen}
                createdByOptions={createdByOptions}
              />
            </div>
          </div>

        {/* NEW INTEGRATED TABLE & SIDEBAR AREA */}
          <div className="flex-1 flex overflow-hidden p-4 gap-0">
            
            {/* 
                SIDEBAR MOVED HERE 
                It now sits inside the content area, below the header/toolbar 
            */}
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.div
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="h-full"
                >
                  <div className="w-auto h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <ContactFiltersSidebar 
                      table={table} 
                      isOpen={true} // Logic handled by parent AnimatePresence
                      onClose={() => setIsSidebarOpen(false)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TABLE CONTAINER */}
            <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-0">
              {isLoading ? (
                <TableSkeleton />
              ) : (
                <>
                  <div className="flex-1 overflow-hidden">
                    <DataTable table={table} onAddContact={() => setIsAddContactOpen(true)} />
                  </div>
                  <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50/50">
                    <DataTablePagination table={table} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Detail Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={handleEditContact}
          onDelete={handleDeleteRow}
        />
      )}

      {/* Dialogs */}
      <ManageStagesDialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen} />
      <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
      <ContactImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} fileId={fileIdFromUrl} />
      
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <AddContactForm
            onClose={() => setIsAddContactOpen(false)}
            onSuccess={() => {
              toast({ title: "Contact Added" });
              queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
            }}
            fileId={fileIdFromUrl}
          />
        </DialogContent>
      </Dialog>

      <PeopleSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
      />
    </DndProvider>
  );
};

export default TanstackContactsPage;