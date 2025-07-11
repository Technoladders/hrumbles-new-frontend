// src/pages/ContactsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

import { UnifiedContactListItem } from '@/types/contact';
import { useContacts } from '@/hooks/use-contacts';
import { useUpdateContact, type ContactUpdatableFields } from '@/hooks/use-update-contact';
import { useAddContactRow } from '@/hooks/use-add-contact-row';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download, Search, Loader2 } from 'lucide-react';
import ContactsTable from '@/components/sales/ContactPage/ContactsTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ContactEditForm from '@/components/sales/ContactPage/ContactEditForm';
import { AddColumnDialog } from '@/components/sales/ContactPage/AddColumnDialog';

interface DynamicColumn {
  key: string;
  name: string;
  type: string;
}

const ContactsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { data: serverContacts = [], isLoading, isError, error } = useContacts();
  const updateContactMutation = useUpdateContact();
  const addContactRowMutation = useAddContactRow();

  // ONLY state for the grid should be the rows themselves.
  // We will initialize it from serverContacts but it will live on its own after.
  const [gridRows, setGridRows] = useState<UnifiedContactListItem[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<DynamicColumn[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<UnifiedContactListItem | null>(null);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);

  // --- THE FIX: Use an effect that only runs ONCE when the data successfully loads ---
  useEffect(() => {
    // When the query is successful and we have data, populate the grid.
    // This effect's dependencies will not change on every render, breaking the loop.
    if (!isLoading && !isError && serverContacts) {
      setGridRows(serverContacts);
    }
  }, [isLoading, isError, serverContacts]); // Dependencies are stable

  // Fetch custom column definitions
  useEffect(() => {
    const fetchCustomColumns = async () => {
      if (!organization_id) return;
      const { data, error } = await supabase
        .from('custom_contact_fields')
        .select('column_key, column_name, data_type')
        .eq('organization_id', organization_id);
      
      if (error) {
        console.error("Error fetching custom columns:", error);
        toast({ title: "Could not load custom columns", variant: "destructive" });
      } else if (data) {
        setDynamicColumns(data.map(d => ({ key: d.column_key, name: d.column_name, type: d.data_type })));
      }
    };
    fetchCustomColumns();
  }, [organization_id, toast]);

  const filteredContacts = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (!lowercasedFilter) return gridRows;
    return gridRows.filter(contact =>
      Object.entries(contact).some(([key, value]) => {
        if (key === 'custom_data' && typeof value === 'object' && value !== null) {
          return Object.values(value).some(customValue => 
            String(customValue).toLowerCase().includes(lowercasedFilter)
          );
        }
        return String(value).toLowerCase().includes(lowercasedFilter);
      })
    );
  }, [gridRows, searchTerm]);

  const handleEditContactClick = (contact: UnifiedContactListItem) => {
    if (contact.source_table === 'contacts') {
      setEditingContact(contact);
      setIsEditContactDialogOpen(true);
    } else {
      toast({ title: "Full Edit Not Available", description: "Only manually added contacts can be opened in the full edit form." });
    }
  };
  const handleCloseEditContactDialog = () => setIsEditContactDialogOpen(false);

  const handleUpdateContactField = (item: UnifiedContactListItem, updates: ContactUpdatableFields | Record<string, any>) => {
    updateContactMutation.mutate({ item, updates }, {
      onSuccess: () => {
        // Optimistic update is already handled in the grid's onRows handler
        // But we need to make sure the server data is fresh for the next load
        queryClient.invalidateQueries({ queryKey: ['combinedContactsListV4'] });
      },
      onError: (err) => {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        // Revert optimistic update on error by refetching and resetting local state
        queryClient.invalidateQueries({ queryKey: ['combinedContactsListV4'] });
      }
    });
  };

  const handleAddRow = () => {
    if (!organization_id) {
        toast({title: "Cannot add row", description: "Organization not found.", variant: "destructive"});
        return;
    }
    addContactRowMutation.mutate(organization_id, {
        onSuccess: (newContact) => {
          // Add the new row to the top of the local state for immediate feedback
          setGridRows(currentRows => [newContact, ...currentRows]);
          toast({ title: "Row Added", description: "A new contact row has been created." });
        },
        onError: (err) => toast({ title: "Failed to Add Row", description: err.message, variant: "destructive" })
    });
  };
  
  const handleAddColumn = async (name: string, type: 'text' | 'number' | 'date' | 'link') => {
    const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (dynamicColumns.some(c => c.key === key)) {
      toast({ title: "Column Exists", description: "A column with this name already exists.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('custom_contact_fields').insert({
        organization_id,
        column_key: key,
        column_name: name,
        data_type: type,
    });
    
    if (error) {
      console.error("Error saving new column:", error);
      toast({ title: "Failed to Add Column", description: error.message, variant: "destructive" });
    } else {
      setDynamicColumns(prev => [...prev, { key, name, type }]);
      toast({ title: "Column Added", description: `The "${name}" column is now available.` });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-full flex flex-col h-[calc(100vh-theme-header-height)]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full sm:w-64 h-9 pl-9" 
            />
          </div>
          <Button className="h-9" onClick={handleAddRow} disabled={addContactRowMutation.isPending}>
            {addContactRowMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Row
          </Button>
          <Button variant="outline" className="h-9" onClick={() => setIsAddColumnDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Column
          </Button>
        </div>
      </div>
      
      <div className="flex-grow rounded-lg border bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading contacts...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-red-600">Error: {error?.message}</div>
        ) : (
          <ContactsTable
            contacts={filteredContacts}
            setContacts={setGridRows}
            onEditContact={handleEditContactClick}
            onUpdateContactField={handleUpdateContactField}
            dynamicColumns={dynamicColumns}
          />
        )}
      </div>

      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Full Contact Details</DialogTitle>
            <DialogDescription>
              For more detailed edits, use this form. Changes will reflect in the grid.
            </DialogDescription>
          </DialogHeader>
          {editingContact && <ContactEditForm contact={editingContact as any} onClose={handleCloseEditContactDialog} />}
        </DialogContent>
      </Dialog>
      
      <AddColumnDialog
        open={isAddColumnDialogOpen}
        onOpenChange={setIsAddColumnDialogOpen}
        onAddColumn={handleAddColumn}
      />
    </div>
  );
};

export default ContactsPage;