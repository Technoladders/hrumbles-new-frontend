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
import { EditableCell, ReorderableHeader } from '@/components/sales/contacts-table/columns';
import type { SimpleContact } from '@/types/simple-contact.types';
import { AddContactForm } from '@/components/sales/contacts-table/AddContactForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { DateRangePickerField } from '@/components/sales/chart/dateRangePickerField';
import CreatorPerformanceChart from '@/components/sales/chart/ContactsPerformanceChart';
import CompanyStagePieChart from '@/components/sales/chart/ContactsStagePieChart';
import { startOfMonth } from 'date-fns';

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
  const { data: serverContacts = [], isLoading, isError, error } = useSimpleContacts();
  const updateContactMutation = useUpdateSimpleContact();
  const deleteContactMutation = useDeleteContact();

  const [data, setData] = React.useState<SimpleContact[]>([]);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);
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

  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-white">
      {/* Charts and Date Range Picker */}
      <div className="p-4 border-b">
        <div className="flex justify-end">
          <DateRangePickerField
            dateRange={chartDateRange}
            onDateRangeChange={setChartDateRange}
            className="w-[250px] sm:w-[200px]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-full">
          <CreatorPerformanceChart data={creatorStatsForChart} />
          <CompanyStagePieChart data={stageStatsForChart} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b">
        <DataTableToolbar
          table={table}
          onOpenAddContactDialog={() => setIsAddContactOpen(true)}
          onToggleGrouping={handleToggleGrouping}
          createdByOptions={createdByOptions}
        />
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-x-auto">
        <DataTable table={table} />
      </div>

      {/* Pagination */}
      <div className="p-2 border-t">
        <DataTablePagination table={table} />
      </div>

      {/* Dialogs */}
      <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-[600px] z-50">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <AddContactForm
            onClose={() => setIsAddContactOpen(false)}
            onSuccess={(newContact) => setData(currentData => [newContact, ...currentData])}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TanstackContactsPage;