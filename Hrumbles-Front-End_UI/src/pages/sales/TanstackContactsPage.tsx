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
  ColumnFiltersState
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { columns as defaultColumns, ActionColumn } from '@/components/sales/contacts-table/columns';
import { DataTableToolbar } from '@/components/sales/contacts-table/data-table-toolbar';
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog';
import { AddColumnDialog } from '@/components/sales/contacts-table/AddColumnDialog';
import { EditableCell, ReorderableHeader } from '@/components/sales/contacts-table/columns';
import type { SimpleContact } from '@/types/simple-contact.types';
import { AddContactForm } from '@/components/sales/contacts-table/AddContactForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCustomCell } from '@/components/sales/contacts-table/columns';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { DataTablePagination } from '@/components/ui/data-table-pagination'; 

const TanstackContactsPage: React.FC = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  const { data: serverContacts = [], isLoading, isError, error } = useSimpleContacts();
  const updateContactMutation = useUpdateSimpleContact();
  const deleteContactMutation = useDeleteContact();

  const [data, setData] = React.useState<SimpleContact[]>([]);
  const [isManageStagesOpen, setIsManageStagesOpen] = React.useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);

  const { data: savedColumnOrder, set: saveColumnOrder } = useUserPreferences<ColumnOrderState>('contactsColumnOrderV2');
  const { data: savedColumnSizing, set: saveColumnSizing } = useUserPreferences<ColumnSizingState>('contactsColumnSizing');

  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

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

  // --- DEBUG LOG #2: See how the filter state changes ---
  React.useEffect(() => {
    console.log('[DEBUG-2] Column filter state changed:', columnFilters);
  }, [columnFilters]);

  // ADD: Fetch employees to use as filter options
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

  // ADD: Memoize the options for the filter component
  const createdByOptions = React.useMemo(() => {
      return employees.map(emp => ({
          value: emp.id,
          label: `${emp.first_name} ${emp.last_name}`,
      }));
  }, [employees]);


  const memoizedColumns = React.useMemo<ColumnDef<SimpleContact>[]>(() => {
    const dynamicColumns: ColumnDef<SimpleContact>[] = customFields.map(field => ({
      id: field.column_key,
      accessorFn: row => (row.custom_data as any)?.[field.column_key],
      header: ReorderableHeader,
      cell: getCustomCell(field.data_type as any),
      size: 150,
    }));
    return [...defaultColumns, ...dynamicColumns, ActionColumn];
  }, [customFields]);

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
    // Changed: This is now the main container for the entire table view component.
    // It fills the height given by ContactsView and handles its children's layout.
    // overflow-hidden is crucial to ensure scrolling happens ONLY in the designated area.
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-white">
      {/* Part 1: Fixed Toolbar */}
      <div className="p-4 border-b">
        <DataTableToolbar
          table={table}
          onOpenAddContactDialog={() => setIsAddContactOpen(true)}
          onAddColumn={() => setIsAddColumnOpen(true)} // You might need to pass this down if it's used
          onToggleGrouping={handleToggleGrouping}
           createdByOptions={createdByOptions}
        />
      </div>

      {/* Part 2: Scrolling Content Area */}
      {/* flex-1 makes this div grow to fill available space. */}
      {/* overflow-auto enables vertical and horizontal scrolling for the table inside. */}
      <div className="flex-1 overflow-auto">
        <DataTable table={table} />
      </div>

      {/* Part 3: Fixed Pagination */}
      <div className="p-2 border-t">
        <DataTablePagination table={table} />
      </div>

      {/* Dialogs can remain at this level */}
      <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-[600px]">
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
    // Note: The DndProvider should ideally be moved up to ContactsView.tsx
    // to wrap both views, but it can stay here if only used for the table.
  );
};

export default TanstackContactsPage;