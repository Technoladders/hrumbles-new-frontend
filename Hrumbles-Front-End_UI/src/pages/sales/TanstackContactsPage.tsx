// src/pages/sales/TanstackContactsPage.tsx
import React from 'react';
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
import { columns as defaultColumns, ActionColumn } from '@/components/sales/contacts-table/columns';
import { DataTableToolbar } from '@/components/sales/contacts-table/data-table-toolbar';
import { AddColumnDialog } from '@/components/sales/contacts-table/AddColumnDialog';
import { EditableCell, ReorderableHeader, getCustomCell } from '@/components/sales/contacts-table/columns';
import type { SimpleContact } from '@/types/simple-contact.types';
import { AddContactForm } from '@/components/sales/contacts-table/AddContactForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { DateRangePickerField } from '@/components/sales/chart/dateRangePickerField';
import CreatorPerformanceChart from '@/components/sales/chart/ContactsPerformanceChart';
import CompanyStagePieChart from '@/components/sales/chart/ContactsStagePieChart';
import { startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog'
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { MoveContactsToolbar } from '@/components/sales/contacts-table/MoveContactsToolbar';
import { Icon, Flex, IconButton, Input, InputGroup, InputLeftElement, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorMode, Text, useMediaQuery } from "@chakra-ui/react";


interface DateRange {
  from: Date;
  to: Date;
  key?: string;
}

interface ChartData {
  name: string;
  companies_created?: number;
  value?: number;
}

const TanstackContactsPage: React.FC = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  
  const { selectedFileId, viewingMode } = useSelector((state: any) => state.workspace);

    // Call the hook with the correct options based on the viewing mode
    const { data: serverContacts = [], isLoading } = useSimpleContacts({ 
        fileId: selectedFileId,
        fetchUnfiled: viewingMode === 'unfiled'
    });
  const updateContactMutation = useUpdateSimpleContact();
  const deleteContactMutation = useDeleteContact();

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
  const [chartDateRange, setChartDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
    key: 'selection',
  });

  const { data: savedColumnOrder, set: saveColumnOrder } = useUserPreferences<ColumnOrderState>('contactsColumnOrderV2');
  const { data: savedColumnSizing, set: saveColumnSizing } = useUserPreferences<ColumnSizingState>('contactsColumnSizing');

  const { data: employees = [] } = useQuery({
    queryKey: ['employeesForFilter', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organization_id)
        .order('first_name', { ascending: true });
      if (error) {
        console.error("Error fetching employees:", error);
        return [];
      }
      return data;
    },
    enabled: !!organization_id,
  });

  const createdByOptions = React.useMemo(() => {
    return [
      { value: 'all', label: 'All Creators' },
      { value: 'system', label: 'System' },
      ...employees.map(emp => ({
        value: emp.id,
        label: `${emp.first_name} ${emp.last_name}`,
      })),
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

  React.useEffect(() => {
    console.log('[DEBUG-1] Raw server data received:', serverContacts);
    setData(serverContacts);
  }, [serverContacts]);

  React.useEffect(() => {
    console.log('[DEBUG-2] Column filter state changed:', columnFilters);
  }, [columnFilters]);

  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const dynamicColumns: ColumnDef<SimpleContact>[] = customFields.map(field => ({
      id: field.column_key,
      accessorFn: row => (row.custom_data as any)?.[field.column_key],
      header: ReorderableHeader,
      cell: getCustomCell(field.data_type as any),
      size: 120,
      minSize: 80,
      maxSize: 200,
    }));
    return [...defaultColumns, ...dynamicColumns, ActionColumn];
  }, [customFields]);

  const chartFilteredData = React.useMemo(() => {
    console.log('chartFilteredData: computing with chartDateRange:', chartDateRange);
    const filtered = data.filter(contact => {
      if (!chartDateRange?.from) {
        console.log('chartFilteredData: no from date, including all contacts');
        return true;
      }
      const createdAt = new Date(contact.created_at);
      const from = chartDateRange.from;
      const to = chartDateRange.to || new Date();
      const inRange = createdAt >= from && createdAt <= to;
      console.log(
        'chartFilteredData: contact:',
        contact.name,
        'created_at:',
        contact.created_at,
        'inRange:',
        inRange
      );
      return inRange;
    });
    console.log('chartFilteredData: filtered contacts count:', filtered.length);
    return filtered;
  }, [data, chartDateRange]);

  const creatorStatsForChart = React.useMemo(() => {
    const stats: { [key: string]: number } = {};
    chartFilteredData.forEach(contact => {
      const creatorName = contact.created_by_employee
        ? `${contact.created_by_employee.first_name} ${contact.created_by_employee.last_name}`
        : 'System';
      stats[creatorName] = (stats[creatorName] || 0) + 1;
    });
    const result = Object.entries(stats)
      .map(([name, count]) => ({ name, companies_created: count }))
      .sort((a, b) => b.companies_created - a.companies_created);
    console.log('creatorStatsForChart:', result);
    return result;
  }, [chartFilteredData]);

  const stageStatsForChart = React.useMemo(() => {
    const stats: { [key: string]: number } = {};
    chartFilteredData.forEach(contact => {
      const stage = contact.contact_stage || 'N/A';
      stats[stage] = (stats[stage] || 0) + 1;
    });
    const result = Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    console.log('stageStatsForChart:', result);
    return result;
  }, [chartFilteredData]);

  const table = useReactTable({
    data,
     enableRowSelection: true,
    columns: memoizedColumns,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    state: {
      columnOrder,
      columnSizing,
      grouping,
      columnVisibility,
      columnFilters,
    },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        handleRowUpdate(rowIndex, columnId, value);
      },
      deleteRow: (contactId: string) => {
        handleDeleteRow(contactId);
      },
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
    setData(serverContacts);
    const initialOrder = memoizedColumns.map(c => c.id!).filter(Boolean);
    setColumnOrder(savedColumnOrder?.length ? savedColumnOrder : initialOrder);
    setColumnSizing(savedColumnSizing ?? {});
  }, [serverContacts, memoizedColumns, savedColumnOrder, savedColumnSizing]);

  React.useEffect(() => {
    setColumnVisibility(grouping.includes('contact_stage') ? { 'contact_stage': false } : {});
  }, [grouping]);

  const handleColumnOrderChange = (updater: React.SetStateAction<ColumnOrderState>) => {
    setColumnOrder(prev => {
      const newOrder = typeof updater === 'function' ? updater(prev) : updater;
      saveColumnOrder(newOrder);
      return newOrder;
    });
  };

  const handleColumnSizingChange = (updater: React.SetStateAction<ColumnSizingState>) => {
    setColumnSizing(prev => {
      const newSizing = typeof updater === 'function' ? updater(prev) : updater;
      saveColumnSizing(newSizing);
      return newSizing;
    });
  };

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
      onSuccess: () => {
        toast({ title: "Contact Deleted", description: "The contact has been permanently removed." });
      },
      onError: (err: any) => {
        toast({ title: "Delete Failed", variant: "destructive", description: err.message });
      },
    });
  };

  const handleToggleGrouping = () => setGrouping(prev => (prev.length ? [] : ['contact_stage']));

      const selectedRowIds = Object.keys(table.getState().rowSelection);
    const selectedContactIds = selectedRowIds.map(index => table.getRow(index).original.id);

 if (viewingMode === 'file' && !selectedFileId) {
    return (
        <Flex direction="column" align="center" justify="center" h="full" bg="gray.50" borderRadius="lg" p={12}>
            <Icon as={FileText} boxSize={20} color="gray.300" mb={4} />
            <Text fontSize="2xl" fontWeight="semibold" color="gray.700">Select a File</Text>
            <Text mt={2} fontSize="md" color="gray.500">Please choose a workspace and a file from the sidebar to view contacts.</Text>
        </Flex>
    );
}

// This is the main return statement with the correct layout structure.
return (
    <DndProvider backend={HTML5Backend}>
        {/*
          STEP 1: The entire page becomes a vertical flex container.
          - `h-full` is crucial for `flex-1` to work on children.
        */}
        <div className="w-full h-full flex flex-col space-y-4">
            
            {/* Header section - does not grow or shrink. */}
            <header className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                            {viewingMode === 'unfiled' ? 'Unfiled Contacts' : 'Contacts'}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {viewingMode === 'unfiled'
                                ? 'These contacts are not yet assigned to a file.'
                                : 'Viewing contacts in your selected file.'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a href="#"><Button variant="outline" size="sm" className="h-9">Kanban View</Button></a>
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

            {/* Move Toolbar - also does not grow or shrink. */}
            {viewingMode === 'unfiled' && selectedContactIds.length > 0 && (
                <div className="flex-shrink-0">
                    <MoveContactsToolbar selectedContactIds={selectedContactIds} onMoveComplete={() => table.resetRowSelection()} />
                </div>
            )}

            {/*
              STEP 2: The main card becomes the "flex sandwich".
              - `flex-1`: It will grow to fill ALL available vertical space.
              - `flex flex-col`: It arranges its children (toolbar, table, pagination) vertically.
              - `overflow-hidden`: A safeguard to prevent any of its children from "leaking" out.
            */}
            <div className="flex-1 flex flex-col rounded-lg border bg-white overflow-hidden">
                
                {/* Table Toolbar - This is pinned to the top of the card. */}
                <div className="p-4 border-b flex-shrink-0">
                    <DataTableToolbar
                        table={table}
                        onOpenAddContactDialog={() => setIsAddContactOpen(true)}
                        onOpenImportDialog={() => setIsImportOpen(true)}
                        onToggleGrouping={() => table.setGrouping(prev => prev.length ? [] : ['contact_stage'])}
                        createdByOptions={createdByOptions}
                    />
                </div>

                {/*
                  STEP 3: The table's direct wrapper. This is the only part that scrolls.
                  - `flex-1`: It grows to fill the space between the toolbar and pagination.
                  - `overflow-auto`: It will show scrollbars (both vertical and horizontal) IF its child is too big.
                */}
               <div className="flex-1 relative">
                    {isLoading ? (
                        <p className="p-4 text-center">Loading Contacts...</p>
                    ) : (
                        <DataTable table={table} />
                    )}
                </div>
                {/* Pagination - This is pinned to the bottom of the card. */}
                <div className="p-2 border-t flex-shrink-0">
                    <DataTablePagination table={table} />
                </div>
            </div>
        </div>

        {/* Dialogs remain at the end, outside the layout flow. */}
        <ManageStagesDialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen} />
        <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
        <ContactImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} fileId={selectedFileId} />
        <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogContent className="sm:max-w-[600px] z-50">
                <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
                <AddContactForm
                    onClose={() => setIsAddContactOpen(false)}
                    onSuccess={(newContact) => setData(currentData => [newContact, ...currentData])}
                    fileId={selectedFileId}
                />
            </DialogContent>
        </Dialog>
    </DndProvider>
);

};

export default TanstackContactsPage;