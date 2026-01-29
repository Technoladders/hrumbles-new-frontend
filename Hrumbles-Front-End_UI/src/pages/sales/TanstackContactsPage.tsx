// TanstackContactsPage.tsx - IMPROVED LAYOUT & UX (2026 style)

"use client";

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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, Search, Filter, X, SlidersHorizontal, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog';
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { ContactDetailPanel } from '@/components/sales/contacts-table/ContactDetailPanel';
import { PeopleSearchDialog } from '@/components/sales/contacts-table/PeopleSearchDialog';
import { ContactFiltersSidebar } from '@/components/sales/contacts-table/ContactFiltersSidebar';
import { TableSkeleton } from '@/components/sales/contacts-table/TableSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Spinner } from "@chakra-ui/react";
import { ChevronRightIcon } from '@chakra-ui/icons';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const NATIVE_COLUMNS = ['id', 'name', 'email', 'mobile', 'job_title', 'linkedin_url', 'contact_stage', 'company_id', 'company_name', 'created_at', 'updated_at', 'created_by', 'updated_by', 'organization_id', 'file_id', 'medium', 'country', 'state', 'city', 'timezone', 'alt_mobile'];

export default function TanstackContactsPage() {
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

  // Breadcrumb & file info
  const { data: breadcrumbData, isLoading: isLoadingBreadcrumb } = useQuery({
    queryKey: ['breadcrumbData', fileIdFromUrl],
    queryFn: async () => {
      if (!fileIdFromUrl) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select('name, workspace_id, workspaces(name)')
        .eq('id', fileIdFromUrl)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!fileIdFromUrl,
  });

  // State
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

  // Employees for created_by filter
  const { data: employees = [] } = useQuery({
    queryKey: ['employeesForFilter', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organization_id)
        .order('first_name', { ascending: true });
      if (error) console.error(error);
      return data ?? [];
    },
    enabled: !!organization_id,
  });

  const createdByOptions = React.useMemo(() => [
    { value: 'all', label: 'All Creators' },
    { value: 'system', label: 'System' },
    ...employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` })),
  ], [employees]);

  // Custom fields → dynamic columns
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
    if (!chartDateRange?.startDate) return serverContacts;
    return serverContacts.filter(contact => {
      const createdAt = new Date(contact.created_at);
      const from = chartDateRange.startDate!;
      const to = chartDateRange.endDate || new Date();
      to.setHours(23, 59, 59, 999);
      return createdAt >= from && createdAt <= to;
    });
  }, [serverContacts, chartDateRange]);

  // Memoized columns with dynamic custom fields
  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const updatedDefault = defaultColumns.map(col => 
      col.id === 'name' ? {
        ...col,
        cell: ({ row }) => (
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-700 hover:underline text-sm"
            onClick={() => setSelectedContact(row.original)}
          >
            {row.original.name}
          </Button>
        ),
      } : col
    );

    const dynamicCols = customFields
      .filter(f => !NATIVE_COLUMNS.includes(f.column_key))
      .map(field => ({
        id: field.column_key,
        accessorFn: row => (row.custom_data as any)?.[field.column_key],
        header: ReorderableHeader,
        cell: getCustomCell(field.data_type as any),
        size: 140, minSize: 100, maxSize: 220,
      }));

    const auditIdx = updatedDefault.findIndex(c => c.id === 'created_by_employee');
    if (auditIdx === -1) return [...updatedDefault, ...dynamicCols, ActionColumn];

    return [
      ...updatedDefault.slice(0, auditIdx),
      ...dynamicCols,
      ...updatedDefault.slice(auditIdx),
      ActionColumn,
    ];
  }, [customFields]);

  const table = useReactTable({
    data: filteredData,
    columns: memoizedColumns,
    enableRowSelection: true,
    state: { columnOrder, columnSizing, grouping, columnVisibility, columnFilters },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onGroupingChange: setGrouping,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    autoResetPageIndex: false,
    columnResizeMode: 'onChange',
    initialState: {
      pagination: { pageSize: 20 },
      columnVisibility: { workspace_id: false, file_id: false, seniority: false,
    departments: false,
    functions: false,
    industry: false,
    revenue: false,
    employee_count: false,
    country: false,
    city: false, ...columnVisibility },
    },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        const row = table.getPrePaginationRowModel().rows[rowIndex]?.original;
        if (!row) return;

        const updates = typeof value === 'object' && value !== null && !Array.isArray(value)
          ? value
          : { [columnId]: value };

        const native: any = {};
        const custom: any = {};
        Object.entries(updates).forEach(([k, v]) => {
          if (NATIVE_COLUMNS.includes(k)) native[k] = v;
          else custom[k] = v;
        });

        const payload: any = { ...native };
        if (Object.keys(custom).length > 0) {
          payload.custom_data = { ...(row.custom_data || {}), ...custom };
        }
        payload.updated_at = new Date().toISOString();
        payload.updated_by = currentUser?.id;

        updateContactMutation.mutate(
          { item: row, updates: payload },
          { onError: err => toast({ title: "Update Failed", variant: "destructive", description: (err as any).message }) }
        );
      },
      deleteRow: (id: string) => deleteContactMutation.mutate(id, {
        onSuccess: () => {
          toast({ title: "Contact Deleted" });
          if (selectedContact?.id === id) setSelectedContact(null);
        },
        onError: err => toast({ title: "Delete Failed", variant: "destructive", description: (err as any).message }),
      }),
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      emailExists: (row, id, val) => val === 'exists' ? !!row.getValue(id) : true,
    },
  });

  React.useEffect(() => {
    const initial = memoizedColumns.map(c => c.id!).filter(Boolean);
    setColumnOrder(savedColumnOrder?.length ? savedColumnOrder : initial);
    setColumnSizing(savedColumnSizing ?? {});
  }, [memoizedColumns, savedColumnOrder, savedColumnSizing]);

  React.useEffect(() => {
    if (grouping.includes('contact_stage')) {
      setColumnVisibility(prev => ({ ...prev, contact_stage: false }));
    }
  }, [grouping]);

  // Export handlers (kept from original)
  const handleDownloadCsv = (all: boolean) => {
    const rows = all ? table.getPrePaginationRowModel().rows : table.getRowModel().rows;
    const cols = table.getVisibleLeafColumns().filter(c => !['select', 'actions'].includes(c.id ?? ''));
    const csv = Papa.unparse({
      fields: cols.map(c => c.id ?? ''),
      data: rows.map(r => cols.map(c => r.getValue(c.id ?? ''))),
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = all ? 'all_contacts.csv' : 'contacts.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const cols = table.getVisibleLeafColumns().filter(c => !['select', 'actions'].includes(c.id ?? ''));
    autoTable(doc, {
      head: [cols.map(c => c.id ?? '')],
      body: table.getRowModel().rows.map(r => cols.map(c => {
        const v = r.getValue(c.id ?? '');
        return v instanceof Date ? v.toLocaleDateString() : String(v ?? '');
      })),
    });
    doc.save('contacts.pdf');
  };

  const filterCount = table.getState().columnFilters.length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
        {/* Sidebar Filters – persistent / toggleable */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="border-r border-slate-200 bg-white overflow-hidden"
            >
              <ContactFiltersSidebar
                table={table}
                isOpen={true}
                onClose={() => setIsSidebarOpen(false)}
                createdByOptions={createdByOptions}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header + Filter Summary */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSidebarOpen(true)}
                    className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {filterCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                        {filterCount}
                      </span>
                    )}
                  </Button>
                )}

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {fileIdFromUrl
                      ? (breadcrumbData?.name || 'List Contacts')
                      : viewingMode === 'unfiled'
                      ? 'Unfiled Contacts'
                      : 'All Contacts'}
                  </h1>

                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                    {isLoading ? (
                      <>
                        <Spinner size="xs" />
                        Loading...
                      </>
                    ) : (
                      <>
                        {table.getFilteredRowModel().rows.length.toLocaleString()} contacts
                        {filterCount > 0 && (
                          <span className="text-blue-600">
                            (filtered from {filteredData.length.toLocaleString()})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {filterCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                  >
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {filterCount} active filter{filterCount !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => table.resetColumnFilters()}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Breadcrumb – smaller & cleaner */}
            {fileIdFromUrl && (
              <div className="mt-2">
                <Breadcrumb spacing="4px" separator={<ChevronRightIcon color="gray.400" boxSize={3} />}>
                  <BreadcrumbItem>
                    <BreadcrumbLink as={RouterLink} to="/lists" className="text-xs text-slate-500 hover:text-slate-700">
                      Lists
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <BreadcrumbLink as={RouterLink} to="/lists" className="text-xs text-slate-500 hover:text-slate-700">
                      {breadcrumbData?.workspaces?.name || 'Workspace'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem isCurrentPage>
                    <span className="text-xs font-medium text-slate-700">
                      {breadcrumbData?.name || 'Loading...'}
                    </span>
                  </BreadcrumbItem>
                </Breadcrumb>
              </div>
            )}
          </div>

          {/* Toolbar – actions */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <DataTableToolbar
              table={table}
              onOpenAddContactDialog={() => setIsAddContactOpen(true)}
              onOpenImportDialog={() => setIsImportOpen(true)}
              onToggleGrouping={() => table.setGrouping(p => p.length ? [] : ['contact_stage'])}
              onToggleFilters={() => setIsSidebarOpen(!isSidebarOpen)}
              isSidebarOpen={isSidebarOpen}
              createdByOptions={createdByOptions}
            />

            <div className="flex items-center gap-2">
              <EnhancedDateRangeSelector value={chartDateRange} onChange={setChartDateRange} />

              <Button
                onClick={() => setIsSearchDialogOpen(true)}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
                Find People
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownloadCsv(false)}>
                    Current page (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadCsv(true)}>
                    All filtered (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadPdf}>
                    Current page (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

          {/* Table Area */}
          <div className="flex-1 overflow-hidden bg-white">
            {isLoading ? (
              <TableSkeleton />
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="text-slate-300 mb-4">
                  <Filter className="h-16 w-16 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 mb-2">No contacts found</h2>
                <p className="text-slate-500 max-w-md">
                  {filterCount > 0
                    ? "Try adjusting or clearing your filters"
                    : viewingMode === 'unfiled'
                    ? "No unassigned contacts yet. Add some to get started."
                    : "No contacts in this view yet."}
                </p>
                {filterCount > 0 && (
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => table.resetColumnFilters()}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <DataTable table={table} onAddContact={() => setIsAddContactOpen(true)} />
            )}
          </div>

          {/* Pagination */}
          {!isLoading && table.getFilteredRowModel().rows.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-3">
              <DataTablePagination table={table} />
            </div>
          )}
        </div>
      </div>

      {/* Side Panel & Modals */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={() => toast({ title: "Edit not implemented yet" })}
          onDelete={deleteContactMutation.mutate}
        />
      )}

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

      <PeopleSearchDialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen} />
    </DndProvider>
  );
}