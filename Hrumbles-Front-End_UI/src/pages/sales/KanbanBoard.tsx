// Hrumbles-Front-End_UI\src\pages\sales\KanbanBoard.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDragDropManager } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Link, useParams } from 'react-router-dom';
import { produce } from 'immer';
import { useDndScrolling } from 'react-dnd-scrolling';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

import { Button } from '@/components/ui/button';
import { KanbanColumn } from '@/components/sales/contacts-kanban/KanbanColumn';
import { KanbanToolbar } from '@/components/sales/contacts-kanban/KanbanToolbar';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { useWorkspaces } from '@/hooks/sales/useWorkspaces';
import { useToast } from '@/hooks/use-toast';
import { SimpleContact } from '@/types/simple-contact.types';
import { setFilters, setDiscoveryMode } from '@/Redux/intelligenceSearchSlice';
import { Loader2, AlertCircle } from 'lucide-react';

type BoardData = Record<string, SimpleContact[]>;

const BoardContent = () => {
  const dispatch = useDispatch();
  const { fileId: urlFileId } = useParams<{ fileId?: string }>();
  
  // Get essential auth and filter data
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  const { filters: reduxFilters } = useSelector((state: any) => state.intelligenceSearch);
  
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(urlFileId || 'all');
  const [boardData, setBoardData] = useState<BoardData>({});
  const [sortOption, setSortOption] = useState('created_at_desc');

  // --- DIRECT SUPABASE FETCH LOGIC ---
  const { data: contacts = [], isLoading: isLoadingContacts, error: fetchError } = useQuery({
    queryKey: ['kanban-contacts-direct', organization_id, selectedWorkspaceId, reduxFilters?.search],
    enabled: !!organization_id,
    queryFn: async () => {
      console.log('[Kanban] Fetching directly from Supabase...');
      
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_workspace_files!inner(file_id)
        `)
        .eq('organization_id', organization_id);

      // 1. Handle Workspace/File filtering
      if (selectedWorkspaceId !== 'all') {
        query = query.eq('contact_workspace_files.file_id', selectedWorkspaceId);
      } else {
        // If "all", we don't need the !inner join, so let's simplify to get everyone
        const simpleQuery = supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', organization_id);
        
        // 2. Handle Search
        if (reduxFilters?.search) {
          simpleQuery.or(`name.ilike.%${reduxFilters.search}%,company_name.ilike.%${reduxFilters.search}%`);
        }
        
        const { data, error } = await simpleQuery.limit(1000);
        if (error) throw error;
        return data as SimpleContact[];
      }

      // 2. Handle Search for filtered query
      if (reduxFilters?.search) {
        query = query.or(`name.ilike.%${reduxFilters.search}%,company_name.ilike.%${reduxFilters.search}%`);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return data as SimpleContact[];
    }
  });

  const { data: workspaces = [] } = useWorkspaces();
  const { data: stages = [], isLoading: isLoadingStages } = useContactStages();
  const updateContactMutation = useUpdateSimpleContact();
  const { toast } = useToast();

  // Scroll logic for dragging
  const containerRef = useRef<HTMLDivElement>(null);
  const dragDropManager = useDragDropManager();
  useDndScrolling(containerRef, dragDropManager);

  // Auto-disable Discovery Mode if we are on Kanban
  useEffect(() => {
    dispatch(setDiscoveryMode(false));
  }, [dispatch]);

  // Process and Sort
  const processedContacts = useMemo(() => {
    let items = [...contacts];
    const [key, direction] = sortOption.split('_');
    items.sort((a, b) => {
      const valA = (a[key as keyof SimpleContact] || '').toString().toLowerCase();
      const valB = (b[key as keyof SimpleContact] || '').toString().toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [contacts, sortOption]);

  // Organize into columns
  useEffect(() => {
    const data: BoardData = {};
    stages.forEach(stage => { data[stage.name] = []; });
    if (!data['Uncategorized']) data['Uncategorized'] = [];

    processedContacts.forEach(contact => {
      const stageName = contact.contact_stage || 'Uncategorized';
      if (!data[stageName]) data[stageName] = [];
      data[stageName].push(contact);
    });
    setBoardData(data);
  }, [processedContacts, stages]);
  
  const columnsToRender = useMemo(() => {
    const officialStageNames = stages.map(s => s.name);
    const allKnownStageNames = new Set(officialStageNames);
    Object.keys(boardData).forEach(name => allKnownStageNames.add(name));

    return Array.from(allKnownStageNames).filter(name => {
      if (name === 'Uncategorized') return (boardData[name]?.length || 0) > 0;
      return true;
    });
  }, [stages, boardData]);

  const handleDrop = (item: { contact: SimpleContact }, newStageName: string) => {
    const { contact } = item;
    const oldStageName = contact.contact_stage || 'Uncategorized';
    if (oldStageName === newStageName) return;

    setBoardData(produce(draft => {
      const oldCol = draft[oldStageName];
      if (oldCol) {
        const idx = oldCol.findIndex(c => c.id === contact.id);
        if (idx > -1) {
          const [moved] = oldCol.splice(idx, 1);
          moved.contact_stage = newStageName;
          if (!draft[newStageName]) draft[newStageName] = [];
          draft[newStageName].unshift(moved);
        }
      }
    }));

    updateContactMutation.mutate(
      { item: contact, updates: { contact_stage: newStageName, updated_by: currentUser?.id } },
      {
        onSuccess: () => toast({ title: "Updated", description: `${contact.name} moved to ${newStageName}` }),
        onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" })
      }
    );
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500">
        <AlertCircle size={40} />
        <p>Error loading contacts: {(fetchError as any).message}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4 p-4 md:p-6 bg-slate-50/50">
      <header className="flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">People Kanban</h1>
          <p className="text-slate-500 text-sm mt-1">Direct CRM Pipeline View</p>
        </div>
        <Link to="/lists"><Button variant="outline">List View</Button></Link>
      </header>

      <div className="relative flex-1 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-white h-20 flex items-center">
          <KanbanToolbar
            searchTerm={reduxFilters?.search || ''}
            onSearchChange={(v) => dispatch(setFilters({ ...reduxFilters, search: v }))}
            sortOption={sortOption}
            onSortChange={setSortOption}
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            onWorkspaceChange={setSelectedWorkspaceId}
          />
        </div>

        <div ref={containerRef} className="absolute top-20 left-0 right-0 bottom-0 overflow-x-auto p-4 bg-slate-50/30">
          {isLoadingContacts || isLoadingStages ? (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="animate-spin" size={20} /> Loading Board...
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
               No contacts found in this view.
               <Button variant="link" onClick={() => setSelectedWorkspaceId('all')}>Clear Filters</Button>
            </div>
          ) : (
            <div className="flex gap-6 h-full min-w-max pb-4">
              {columnsToRender.map(stageName => (
                <KanbanColumn
                  key={stageName}
                  stage={stages.find(s => s.name === stageName) || { id: stageName, name: stageName, color: '#94a3b8' }}
                  contacts={boardData[stageName] || []}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC = () => (
  <DndProvider backend={HTML5Backend}>
    <BoardContent />
  </DndProvider>
);

export default KanbanBoard;