// src/pages/sales/ContactsV2Page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setMode, setActiveFileId } from '@/Redux/contactsV2Slice';
import { useContactsV2 } from '@/hooks/sales/useContactsV2';
import { useToast } from '@/hooks/use-toast';

import { ContactsV2Header } from '@/components/sales/contacts-v2/ContactsV2Header';
import { ContactsV2Sidebar } from '@/components/sales/contacts-v2/ContactsV2Sidebar';
import { ContactsV2Toolbar } from '@/components/sales/contacts-v2/ContactsV2Toolbar';
import { ContactsV2Table } from '@/components/sales/contacts-v2/ContactsV2Table';

// Existing modals reused (no touch to old code)
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';

import { ContactV2Row } from '@/hooks/sales/useContactsV2';

export default function ContactsV2Page() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Route params
  const { fileId } = useParams<{ fileId?: string }>();

  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);
  const { mode } = useSelector((state: any) => state.contactsV2);

  // ── Sync mode from URL ────────────────────────────────────────────────────
  useEffect(() => {
    if (fileId) {
      dispatch(setMode('list'));
      dispatch(setActiveFileId(fileId));
    }
  }, [fileId, dispatch]);

  // ── Fetch file details ────────────────────────────────────────────────────
  const { data: currentFile } = useQuery({
    queryKey: ['workspace-file-v2', fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select('id, name, type, workspace_id, workspaces(id, name)')
        .eq('id', fileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!fileId,
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, count, isLoading, isFetching, hasSearched } = useContactsV2();

  // ── Modal state ───────────────────────────────────────────────────────────
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactV2Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddToList = (contact: ContactV2Row) => {
    setSelectedContact(contact);
    setListModalOpen(true);
  };

  const handleBulkAddToList = () => {
    // For bulk, we open the modal without a specific contact
    setSelectedContact(null);
    setListModalOpen(true);
  };

  const handleEnrich = async (
    contactId: string,
    apolloId: string | null,
    type: 'email' | 'phone',
  ) => {
    try {
      toast({ title: 'Request Sent', description: `Verifying ${type}…` });
      const { data: result, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId,
          apolloPersonId: apolloId,
          revealType: type,
          organizationId: organization_id,
          userId: user.id,
        },
      });
      if (error) throw new Error(error.message);
      if (result?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: result.message });
        return;
      }
      toast({ title: 'Success', description: result?.message || 'Enrichment complete' });
      queryClient.invalidateQueries({ queryKey: ['contacts-v2-data'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleSaveDiscovery = async (person: any, targetFileId?: string) => {
    try {
      const savedContact = await saveDiscoveryToCRM(person, organization_id, user.id);
      const finalFileId = targetFileId || fileId;
      if (finalFileId && savedContact?.id) {
        await supabase.from('contact_workspace_files').upsert({
          contact_id: savedContact.id,
          file_id: finalFileId,
          added_by: user.id,
        });
      }
      toast({ title: 'Lead Captured', description: `${person.name || person.first_name} added to CRM.` });
      queryClient.invalidateQueries({ queryKey: ['contacts-v2-data'] });
      return savedContact;
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
      throw err;
    }
  };

  const handleListConfirm = async (targetFileId: string) => {
    if (!selectedContact) return;

    try {
      if (selectedContact.is_discovery && selectedContact.original_data) {
        await handleSaveDiscovery(selectedContact.original_data, targetFileId);
      } else if (selectedContact.id) {
        await supabase.from('contact_workspace_files').upsert({
          contact_id: selectedContact.id,
          file_id: targetFileId,
          added_by: user.id,
        });
        toast({ title: 'Added to List' });
        queryClient.invalidateQueries({ queryKey: ['contacts-v2-data'] });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setListModalOpen(false);
      setSelectedContact(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950 overflow-hidden">

      {/* Header */}
      <ContactsV2Header
        fileId={fileId}
        fileName={currentFile?.name}
        workspaceName={(currentFile as any)?.workspaces?.name}
        isFetching={isFetching}
        onImport={() => setImportOpen(true)}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-[220px] flex-shrink-0 overflow-hidden">
          <ContactsV2Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">

          {/* Toolbar + recent searches */}
          <ContactsV2Toolbar
            count={count}
            isFetching={isFetching}
            onBulkAddToList={handleBulkAddToList}
          />

          {/* Table */}
          <ContactsV2Table
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            hasSearched={hasSearched}
            onAddToList={handleAddToList}
            onEnrich={handleEnrich}
            onSaveDiscovery={handleSaveDiscovery}
          />
        </div>
      </div>

      {/* Modals */}
      {selectedContact && (
        <AddToListModal
          open={listModalOpen}
          onOpenChange={open => {
            setListModalOpen(open);
            if (!open) setSelectedContact(null);
          }}
          personName={selectedContact.name || 'Contact'}
          onConfirm={handleListConfirm}
          isFromDiscovery={selectedContact.is_discovery}
        />
      )}

      <ContactImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        fileId={fileId || null}
      />
    </div>
  );
}