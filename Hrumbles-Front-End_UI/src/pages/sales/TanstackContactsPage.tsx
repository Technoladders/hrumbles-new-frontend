// TanstackContactPage.tsx

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
import { MoreHorizontal, FileText, Download } from 'lucide-react';
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
  // const [data, setData] = React.useState<SimpleContact[]>([]);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [chartDateRange, setChartDateRange] = React.useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
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

 
  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const dynamicColumns: ColumnDef<SimpleContact>[] = customFields
        .filter(field => !NATIVE_COLUMNS.includes(field.column_key))
        .map(field => ({
            id: field.column_key,
            accessorFn: row => (row.custom_data as any)?.[field.column_key],
            header: ReorderableHeader,
            cell: getCustomCell(field.data_type as any),
            size: 150, minSize: 100, maxSize: 250,
        }));
    
    const auditStartIndex = defaultColumns.findIndex(col => col.id === 'created_by_employee');

    if (auditStartIndex !== -1) {
        const preAuditColumns = defaultColumns.slice(0, auditStartIndex);
        const auditColumns = defaultColumns.slice(auditStartIndex);
        return [...preAuditColumns, ...dynamicColumns, ...auditColumns, ActionColumn];
    }

    return [...defaultColumns, ...dynamicColumns, ActionColumn];
  }, [customFields]);

  const table = useReactTable({
   data: filteredData, 
    enableRowSelection: true,
    columns: memoizedColumns,
      autoResetPageIndex: false,
    initialState: { pagination: { pageSize: 20 } },
    state: { columnOrder, columnSizing, grouping, columnVisibility, columnFilters },
    meta: {
          updateData: (rowIndex: number, columnId: string, value: unknown) => {
        console.log(`Step 2: table.meta.updateData called with:`, { rowIndex, columnId, value });
        handleRowUpdate(rowIndex, columnId, value);
      },

      deleteRow: (contactId: string) => handleDeleteRow(contactId),
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
  });

  React.useEffect(() => {
    const initialOrder = memoizedColumns.map(c => c.id!).filter(Boolean);
    setColumnOrder(savedColumnOrder?.length ? savedColumnOrder : initialOrder);
    setColumnSizing(savedColumnSizing ?? {});
  }, [memoizedColumns, savedColumnOrder, savedColumnSizing]);
  
  React.useEffect(() => {
    setColumnVisibility(grouping.includes('contact_stage') ? { 'contact_stage': false } : {});
  }, [grouping]);

// This function goes inside your TanstackContactsPage.tsx component

// TanstackContactPage.tsx

const handleRowUpdate = (rowIndex: number, columnId: string, value: unknown) => {
    console.log("Step 3: handleRowUpdate function entered.");

    // [THE FIX] Use `getPrePaginationRowModel` to get the row from the full dataset,
    // ignoring the current page.
    const originalRow = table.getPrePaginationRowModel().rowsById[rowIndex]?.original;

    console.log("Original Row:", originalRow);

    if (!originalRow) {
      console.error(`Could not find original row data at index ${rowIndex}. Aborting update.`);
      return;
    }

    // --- The rest of your function remains exactly the same ---
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
      onSuccess: () => toast({ title: "Contact Deleted" }),
      onError: (err: any) => toast({ title: "Delete Failed", variant: "destructive", description: err.message }),
    });
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
        <div className="w-full h-full flex flex-col space-y-4">
            
            {fileIdFromUrl && (
                <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={-2}>
                    <BreadcrumbItem>
                        <BreadcrumbLink as={RouterLink} to="/lists">Workspaces</BreadcrumbLink>
                    </BreadcrumbItem>
                    {isLoadingBreadcrumb ? <Spinner size="xs" /> : breadcrumbData && (
                        <>
                            <BreadcrumbItem>
                                <BreadcrumbLink as={RouterLink} to="/lists">{breadcrumbData.workspaces?.name || 'Workspace'}</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbItem isCurrentPage>
                                <BreadcrumbLink href="#">{breadcrumbData.name}</BreadcrumbLink>
                            </BreadcrumbItem>
                        </>
                    )}
                </Breadcrumb>
            )}

            <header className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                            {fileIdFromUrl ? (breadcrumbData?.name || 'File People') : (viewingMode === 'unfiled' ? 'Unfiled People' : 'All People')}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {fileIdFromUrl
                                ? `Viewing poeple in the file: ${breadcrumbData?.name || ''}`
                                : viewingMode === 'unfiled'
                                    ? 'These contacts are not yet assigned to a file.'
                                    : 'Viewing all people in your organization.'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <EnhancedDateRangeSelector value={chartDateRange} onChange={setChartDateRange} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownloadCsv(false)}>Export Page (CSV)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadCsv(true)}>Export All (CSV)</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDownloadPdf(false)}>Export Page (PDF)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPdf(true)}>Export All (PDF)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsManageStagesOpen(true)}>Manage Stages</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsAddColumnOpen(true)}>Manage Columns</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            
            <div className="flex-1 flex flex-col rounded-lg border bg-white overflow-hidden">
                <div className="p-4 border-b flex-shrink-0">
                    <DataTableToolbar
                        table={table}
                        onOpenAddContactDialog={() => setIsAddContactOpen(true)}
                        onOpenImportDialog={() => setIsImportOpen(true)}
                        onToggleGrouping={() => table.setGrouping(prev => prev.length ? [] : ['contact_stage'])}
                        createdByOptions={createdByOptions}
                    />
                </div>

               <div className="flex-1 relative">
                    {isLoading ? (
                        <p className="p-4 text-center">Loading Contacts...</p>
                    ) : (
                        <DataTable table={table} />
                    )}
                </div>
                <div className="p-2 border-t flex-shrink-0">
                    <DataTablePagination table={table} />
                </div>
            </div>
        </div>

        <ManageStagesDialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen} />
        <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
        <ContactImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} fileId={fileIdFromUrl} />
        <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogContent className="sm:max-w-[600px] z-50">
                <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
                <AddContactForm
                    onClose={() => setIsAddContactOpen(false)}
                    // [THE FIX] Instead of optimistically updating local state,
                    // we invalidate the query to refetch the list. This is the standard
                    // way to handle additions/deletions.
                    onSuccess={() => {
                        toast({ title: "Contact Added" });
                        queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
                    }}
                    fileId={fileIdFromUrl}
                />
            </DialogContent>
        </Dialog>
    </DndProvider>
);

};

export default TanstackContactsPage;