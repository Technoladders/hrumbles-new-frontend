// src/pages/sales/EditableContactsPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { useToast } from "@/hooks/use-toast";
import type { DataGridHandle, SortColumn } from 'react-data-grid';

import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { useAddSimpleContactRow } from '@/hooks/sales/useAddSimpleContactRow';
import type { SimpleContact, SimpleContactUpdate } from '@/types/simple-contact.types';

import ContactsDataGrid from '@/components/sales/ContactPage/ContactsDataGrid';
import { exportToCsv, exportToPdf } from '@/utils/exportUtils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContactEditForm from '@/components/sales/ContactPage/ContactEditForm';
import { AddColumnDialog } from '@/components/sales/ContactPage/AddColumnDialog';

type Comparator = (a: SimpleContact, b: SimpleContact) => number;
function getComparator(sortColumn: string): Comparator {
  switch (sortColumn) {
    case 'name': case 'email': case 'job_title': case 'company_name': case 'contact_stage': case 'contact_owner':
      return (a, b) => (a[sortColumn] ?? '').localeCompare(b[sortColumn] ?? '');
    default:
      return (a, b) => String(a.custom_data?.[sortColumn] ?? '').localeCompare(String(b.custom_data?.[sortColumn] ?? ''));
  }
}

const EditableContactsPage: React.FC = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { data: serverContacts = [], isLoading, isError, error } = useSimpleContacts();
  const updateContactMutation = useUpdateSimpleContact();
  const addContactRowMutation = useAddSimpleContactRow();

  const [rows, setRows] = useState<SimpleContact[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<{ key: string; name: string; type: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SimpleContact | null>(null);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  
  const gridRef = useRef<DataGridHandle<SimpleContact>>(null);

  useEffect(() => {
    if (!isLoading && !isError) setRows(serverContacts);
  }, [isLoading, isError, serverContacts]);

  useEffect(() => {
    async function fetchCustomColumns() {
      if (!organization_id) return;
      const { data } = await supabase.from('custom_contact_fields').select('*').eq('organization_id', organization_id);
      if (data) setDynamicColumns(data.map(d => ({ key: d.column_key, name: d.column_name, type: d.data_type })));
    }
    fetchCustomColumns();
  }, [organization_id]);

  const filteredRows = useMemo(() => {
    const filter = searchTerm.toLowerCase();
    if (!filter) return rows;
    return rows.filter(r => Object.entries(r).some(([key, value]) => {
      if (key === 'custom_data' && typeof value === 'object' && value !== null) {
        return Object.values(value).some(cv => String(cv).toLowerCase().includes(filter));
      }
      return String(value).toLowerCase().includes(filter);
    }));
  }, [rows, searchTerm]);

  const sortedRows = useMemo((): readonly SimpleContact[] => {
    if (sortColumns.length === 0) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      for (const sort of sortColumns) {
        const comparator = getComparator(sort.columnKey);
        const compResult = comparator(a, b);
        if (compResult !== 0) return sort.direction === 'ASC' ? compResult : -compResult;
      }
      return 0;
    });
  }, [filteredRows, sortColumns]);

  const summaryRows = useMemo(() => [{ totalCount: rows.length }], [rows]);

  const handleUpdateContactField = (item: SimpleContact, updates: SimpleContactUpdate) => {
    updateContactMutation.mutate({ item, updates }, {
      onError: (err) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleAddRow = () => {
    if (!organization_id) return;
    addContactRowMutation.mutate(organization_id, {
      onSuccess: (newContact) => setRows(currentRows => [newContact, ...currentRows]),
      onError: (err) => toast({ title: "Failed to Add Row", description: err.message, variant: "destructive" })
    });
  };

  const handleAddColumn = async (name: string, type: 'text' | 'number' | 'date' | 'link') => {
    const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { error } = await supabase.from('custom_contact_fields').insert({ organization_id, column_key: key, column_name: name, data_type: type });
    if (error) { toast({ title: "Failed to Add Column", variant: "destructive" }); }
    else {
      setDynamicColumns(prev => [...prev, { key, name, type }]);
      toast({ title: "Column Added" });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 bg-gray-50">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" /></div>
          <Button className="h-9" onClick={handleAddRow} disabled={addContactRowMutation.isPending}>{addContactRowMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Row</Button>
          <Button variant="outline" className="h-9" onClick={() => setIsAddColumnDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Column</Button>
          <Button variant="outline" className="h-9" onClick={() => exportToCsv(gridRef.current!.element, 'contacts.csv')}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" className="h-9" onClick={() => exportToPdf(gridRef.current!.element, 'contacts.pdf')}><Download className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </header>
      <main className="flex-grow rounded-lg border bg-white overflow-hidden shadow-sm">
        {isLoading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...</div>
          : isError ? <div className="text-red-600 p-4">Error: {error?.message}</div>
          : <ContactsDataGrid contacts={sortedRows} onRowsChange={setRows} onUpdateContactField={handleUpdateContactField} onEditContact={(c) => { setEditingContact(c); setIsEditContactDialogOpen(true); }} dynamicColumns={dynamicColumns} sortColumns={sortColumns} onSortColumnsChange={setSortColumns} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} summaryRows={summaryRows} gridRef={gridRef} />
        }
      </main>
      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>{editingContact && <ContactEditForm contact={editingContact as any} onClose={() => setIsEditContactDialogOpen(false)} />}</DialogContent>
      </Dialog>
      <AddColumnDialog open={isAddColumnDialogOpen} onOpenChange={setIsAddColumnDialogOpen} onAddColumn={handleAddColumn} />
    </div>
  );
};

export default EditableContactsPage;