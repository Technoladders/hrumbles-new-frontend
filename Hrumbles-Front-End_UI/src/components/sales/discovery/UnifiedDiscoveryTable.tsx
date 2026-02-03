import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { 
  getCoreRowModel, 
  useReactTable, 
  getPaginationRowModel 
} from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { searchPeopleInDiscovery, saveSearchResultToContacts } from '@/services/sales/apolloSearch';
import { DataTable } from '@/components/ui/data-table'; // YOUR EXISTING COMPONENT
import { getUnifiedColumns, UnifiedContact } from './unified-columns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';
import { setPage } from '@/Redux/intelligenceSearchSlice';
import { Loader2 } from 'lucide-react';

export const UnifiedDiscoveryTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Redux State
  const { viewMode, discoveryFilters, savedSearchTerm, currentPage, perPage, targetFileId, targetWorkspaceId } = useSelector((state: any) => state.intelligenceSearch);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  // Local State for Modals
  const [listModalOpen, setListModalOpen] = React.useState(false);
  const [selectedPerson, setSelectedPerson] = React.useState<any>(null);

  // --- QUERY: DISCOVERY MODE ---
  const { data: discoveryData, isLoading: isDiscoveryLoading } = useQuery({
    queryKey: ['global-discovery', discoveryFilters, currentPage],
    queryFn: () => searchPeopleInDiscovery(discoveryFilters, currentPage, perPage),
    enabled: viewMode === 'discovery' && !!discoveryFilters,
    placeholderData: (prev) => prev
  });

  // --- QUERY: SAVED CRM MODE ---
  const { data: savedData, isLoading: isSavedLoading, refetch: refetchSaved } = useQuery({
    queryKey: ['saved-crm-leads', savedSearchTerm],
    queryFn: async () => {
      let query = supabase.from('contacts')
        .select(`*, enrichment_availability(*), companies(id, name)`)
        .not('apollo_person_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (savedSearchTerm) query = query.ilike('name', `%${savedSearchTerm}%`);
      const { data } = await query;
      return data || [];
    },
    enabled: viewMode === 'saved'
  });

  // --- ACTIONS ---
  const handleSaveDiscovery = async (person: any) => {
    try {
      await saveSearchResultToContacts(person, organization_id, targetWorkspaceId, targetFileId, user.id);
      toast({ title: "Lead Saved", description: `${person.first_name} added to CRM.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleEnrich = async (contactId: string, apolloId: string, type: 'email' | 'phone') => {
    try {
      // NOTE: Using the unified 'enrich-contact' for both as requested
      await supabase.functions.invoke('enrich-contact', { 
        body: { contactId, apolloPersonId: apolloId, revealType: type } 
      });
      toast({ title: "Request Sent", description: "Verifying data..." });
      refetchSaved();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  const handleListAdd = (person: any) => {
    setSelectedPerson(person);
    setListModalOpen(true);
  };

  const confirmListAdd = async (fileId: string) => {
    try {
      await supabase.from('contact_workspace_files').upsert({
        contact_id: selectedPerson.id,
        file_id: fileId,
        added_by: user.id
      });
      toast({ title: "Added to List" });
      setListModalOpen(false);
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  // --- DATA NORMALIZATION ---
  const tableData: UnifiedContact[] = useMemo(() => {
    if (viewMode === 'discovery') {
      return (discoveryData?.people || []).map((p: any) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name_obfuscated || ''}`,
        first_name: p.first_name,
        job_title: p.title,
        company_name: p.organization?.name,
        email: null, // Discovery doesn't show email
        mobile: null, // Discovery doesn't show phone
        photo_url: p.photo_url,
        apollo_id: p.id,
        has_email: p.has_email,
        has_phone: p.has_direct_phone === "Yes",
        is_saved: false,
        original_data: p
      }));
    } else {
      return (savedData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        first_name: c.name.split(' ')[0],
        job_title: c.job_title,
        company_name: c.company_name || c.companies?.name,
        email: c.email,
        mobile: c.mobile,
        photo_url: c.photo_url,
        apollo_id: c.apollo_person_id,
        has_email: c.enrichment_availability?.[0]?.has_email,
        has_phone: c.enrichment_availability?.[0]?.has_phone,
        is_saved: true,
        company_id: c.company_id,
        original_data: c
      }));
    }
  }, [viewMode, discoveryData, savedData]);

  // --- TABLE INSTANCE ---
  const columns = useMemo(() => getUnifiedColumns(
    handleSaveDiscovery, 
    handleEnrich, 
    (id) => navigate(`/contacts/${id}`),
    handleListAdd
  ), []);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // Client-side pagination for Saved view
    manualPagination: viewMode === 'discovery', // Server-side for Discovery
    pageCount: viewMode === 'discovery' ? Math.ceil((discoveryData?.total_entries || 0) / perPage) : undefined,
  });

  const isLoading = viewMode === 'discovery' ? isDiscoveryLoading : isSavedLoading;

  if (isLoading) return <div className="flex-1 flex items-center justify-center bg-white border border-dashed m-6 rounded-2xl"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* DATA TABLE REUSED HERE */}
      <div className="flex-1 overflow-hidden p-6 pb-0">
        <DataTable table={table} />
      </div>

      {/* CUSTOM PAGINATION FOOTER */}
      {viewMode === 'discovery' && (
        <div className="px-6 py-4 bg-white border-t flex justify-between items-center sticky bottom-0 z-50">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {discoveryData?.total_entries?.toLocaleString()} Global Matches
          </span>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={() => dispatch(setPage(currentPage - 1))} disabled={currentPage === 1}>Prev</Button>
             <div className="px-4 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 pt-2">Page {currentPage}</div>
             <Button variant="outline" size="sm" onClick={() => dispatch(setPage(currentPage + 1))}>Next</Button>
          </div>
        </div>
      )}

      {selectedPerson && <AddToListModal open={listModalOpen} onOpenChange={setListModalOpen} personName={selectedPerson.name} onConfirm={confirmListAdd} />}
    </div>
  );
};