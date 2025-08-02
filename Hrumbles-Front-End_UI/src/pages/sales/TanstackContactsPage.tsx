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
import { useQuery } from '@tanstack/react-query';
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
import { DateRangePickerField } from '@/components/sales/chart/dateRangePickerField';
import { startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  from: Date;
  to: Date;
  key?: string;
}

const TanstackContactsPage: React.FC = () => {
  const { toast } = useToast();
  const { fileId: fileIdFromUrl } = useParams<{ fileId?: string }>();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  const { viewingMode } = useSelector((state: any) => state.workspace);

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
  const [data, setData] = React.useState<SimpleContact[]>([]);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  
  const [chartDateRange, setChartDateRange] = React.useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
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
      if (!chartDateRange?.from) return true;
      const createdAt = new Date(contact.created_at);
      const from = chartDateRange.from;
      const to = chartDateRange.to || new Date();
      to.setHours(23, 59, 59, 999);
      return createdAt >= from && createdAt <= to;
    });
  }, [serverContacts, chartDateRange]);

  React.useEffect(() => {
      setData(filteredData);
  }, [filteredData]);


  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const dynamicColumns: ColumnDef<SimpleContact>[] = customFields.map(field => ({
      id: field.column_key,
      accessorFn: row => (row.custom_data as any)?.[field.column_key],
      header: ReorderableHeader,
      cell: getCustomCell(field.data_type as any),
      size: 150, minSize: 100, maxSize: 250,
    }));
    
    // Position custom fields before the audit trail columns (created at/by, updated at/by)
    const auditStartIndex = defaultColumns.findIndex(col => col.id === 'created_by_employee');

    if (auditStartIndex !== -1) {
        const preAuditColumns = defaultColumns.slice(0, auditStartIndex);
        const auditColumns = defaultColumns.slice(auditStartIndex);
        return [...preAuditColumns, ...dynamicColumns, ...auditColumns, ActionColumn];
    }

    // Fallback to original order if audit columns aren't found
    return [...defaultColumns, ...dynamicColumns, ActionColumn];
  }, [customFields]);

  const table = useReactTable({
    data,
    enableRowSelection: true,
    columns: memoizedColumns,
    initialState: { pagination: { pageSize: 20 } },
    state: { columnOrder, columnSizing, grouping, columnVisibility, columnFilters },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => handleRowUpdate(rowIndex, columnId, value),
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


const handleRowUpdate = (rowIndex: number, columnId: string, value: unknown) => {
    const oldData = [...data];
    let updatedRow: SimpleContact;

    if (customFields.some(f => f.column_key === columnId)) {
      const originalRow = oldData[rowIndex];
      const newCustomData = { ...(originalRow.custom_data || {}), [columnId]: value };
      updatedRow = { ...originalRow, custom_data: newCustomData, updated_by: currentUser?.id };
      updateContactMutation.mutate(
        { item: updatedRow, updates: { custom_data: newCustomData, updated_by: currentUser?.id } },
        {
          onError: (err: any) => {
            setData(oldData);
            toast({ title: "Update Failed", variant: "destructive", description: err.message });
          },
        }
      );
    } else {
      updatedRow = { ...oldData[rowIndex], [columnId]: value, updated_by: currentUser?.id };
      updateContactMutation.mutate(
        { item: updatedRow, updates: { [columnId]: value, updated_by: currentUser?.id } },
        {
          onError: (err: any) => {
            setData(oldData);
            toast({ title: "Update Failed", variant: "destructive", description: err.message });
          },
        }
      );
    }
    setData(oldData.map((row, index) => (index === rowIndex ? updatedRow : row)));
  };
  const handleDeleteRow = (contactId: string) => {
    deleteContactMutation.mutate(contactId, {
      onSuccess: () => toast({ title: "Contact Deleted" }),
      onError: (err: any) => toast({ title: "Delete Failed", variant: "destructive", description: err.message }),
    });
  };

  const handleDownloadCsv = () => {
    const visibleColumns = table.getVisibleLeafColumns().filter(c => !['select', 'actions'].includes(c.id));
    const header = visibleColumns.map(c => c.id);
    const rows = table.getRowModel().rows.map(row => 
        visibleColumns.map(col => row.getValue(col.id))
    );
    const csv = Papa.unparse({ fields: header, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'contacts.csv');
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
                        <DateRangePickerField dateRange={chartDateRange} onDateRangeChange={setChartDateRange} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleDownloadCsv}>Download CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPdf}>Download PDF</DropdownMenuItem>
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
                    onSuccess={(newContact) => setData(currentData => [newContact, ...currentData])}
                    fileId={fileIdFromUrl}
                />
            </DialogContent>
        </Dialog>
    </DndProvider>
);

};

export default TanstackContactsPage;