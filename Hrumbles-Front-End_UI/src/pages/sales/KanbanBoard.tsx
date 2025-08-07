// KanbanBoard.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react'; // Add useRef
import { DndProvider, useDragDropManager } from 'react-dnd'; // Add useDragDropManager
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Link } from 'react-router-dom';
import { produce } from 'immer';
import { useDndScrolling } from 'react-dnd-scrolling'; // [THE FIX] Import the new hook

// ... (Your other imports remain the same)
import { Button } from '@/components/ui/button';
import { KanbanColumn } from '@/components/sales/contacts-kanban/KanbanColumn';
import { KanbanToolbar } from '@/components/sales/contacts-kanban/KanbanToolbar';
import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { useWorkspaces } from '@/hooks/sales/useWorkspaces';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { SimpleContact } from '@/types/simple-contact.types';


type BoardData = Record<string, SimpleContact[]>;

// [THE FIX] Create a new component to house the hook logic.
// This is necessary because the useScrolling hook needs to be a child of DndProvider.
const BoardContent = () => {
  // All the state and logic from KanbanBoard is moved here
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('all');
  const [boardData, setBoardData] = useState<BoardData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('created_at_desc');
  const { data: workspaces = [] } = useWorkspaces();
  const { data: stages = [], isLoading: isLoadingStages } = useContactStages();
  const { data: contacts = [], isLoading: isLoadingContacts } = useSimpleContacts({ 
      workspaceId: selectedWorkspaceId === 'all' || selectedWorkspaceId === 'unassigned' ? undefined : selectedWorkspaceId,
      fetchUnassigned: selectedWorkspaceId === 'unassigned'
  });
  const updateContactMutation = useUpdateSimpleContact();
  const { toast } = useToast();
  const currentUser = useSelector((state: any) => state.auth.user);
  const isLoading = isLoadingContacts || isLoadingStages;

  // Ref for the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  const dragDropManager = useDragDropManager();

  // Use the dnd-scrolling hook
  useDndScrolling(containerRef, dragDropManager);

  // All your other functions (memo, effects, handleDrop) remain the same...
    const processedContacts = useMemo(() => {
    let filtered = contacts.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const [key, direction] = sortOption.split('_');
    filtered.sort((a, b) => {
      const valA = a[key as keyof SimpleContact] || '';
      const valB = b[key as keyof SimpleContact] || '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [contacts, searchTerm, sortOption]);

  useEffect(() => {
    const data: BoardData = {};
    stages.forEach(stage => { data[stage.name] = []; });
    if (!data['Uncategorized']) { data['Uncategorized'] = []; }
    processedContacts.forEach(contact => {
      const stageName = contact.contact_stage || 'Uncategorized';
      if (!data[stageName]) { data[stageName] = []; }
      data[stageName].push(contact);
    });
    setBoardData(data);
  }, [processedContacts, stages]);
  
  const columnsToRender = useMemo(() => {
    const officialStageNames = stages.map(s => s.name);
    const allKnownStageNames = new Set(officialStageNames);
    
    Object.keys(boardData).forEach(stageName => {
      allKnownStageNames.add(stageName);
    });

    return Array.from(allKnownStageNames)
      .filter(stageName => {
          if (stageName === 'Uncategorized') {
              return boardData[stageName]?.length > 0;
          }
          return true;
      });
  }, [stages, boardData]);

  const handleDrop = (item: { contact: SimpleContact }, newStageName: string) => {
    const { contact } = item;
    const oldStageName = contact.contact_stage || 'Uncategorized';

    if (oldStageName === newStageName) return;
    setBoardData(produce(draft => {
        const oldColumn = draft[oldStageName];
        const newColumn = draft[newStageName];
        if (!newColumn) draft[newStageName] = [];
        const cardIndex = oldColumn.findIndex(c => c.id === contact.id);

        if (cardIndex > -1) {
            const [movedCard] = oldColumn.splice(cardIndex, 1);
            movedCard.contact_stage = newStageName;
            draft[newStageName].unshift(movedCard);
        }
    }));
    updateContactMutation.mutate(
      { item: contact, updates: { contact_stage: newStageName, updated_by: currentUser?.id } },
      {
        onSuccess: () => toast({ title: "Contact Updated", description: `${contact.name} moved to ${newStageName}.` }),
        onError: (error) => {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
          setBoardData(boardData); 
        },
      }
    );
  };
  

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <header className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              People Kanban
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Drag and drop people to update their stage.
            </p>
          </div>
          <Link to="/lists">

            <Button variant="outline">List View</Button>
          </Link>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col rounded-lg border bg-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 border-b bg-white h-20">
          <KanbanToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortOption={sortOption}
            onSortChange={setSortOption}
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            onWorkspaceChange={setSelectedWorkspaceId}
          />
        </div>

        {/* Attach the ref to the scrollable container */}
        <div ref={containerRef} className="absolute top-20 left-0 right-0 bottom-0 overflow-auto p-4 bg-gray-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading Board...
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {columnsToRender.map(stageName => {
                const stageInfo = stages.find(s => s.name === stageName) || { id: stageName, name: stageName, color: '#9CA3AF' };
                return (
                  <KanbanColumn
                    key={stageInfo.id}
                    stage={stageInfo}
                    contacts={boardData[stageName] || []}
                    onDrop={handleDrop}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// The main export now wraps BoardContent with the DndProvider
const KanbanBoard: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContent />
    </DndProvider>
  );
};

export default KanbanBoard;