import React, { useState, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Link } from 'react-router-dom';
import { produce } from 'immer';

// UI Components
import { Button } from '@/components/ui/button';
import { KanbanColumn } from '@/components/sales/contacts-kanban/KanbanColumn';
import { KanbanToolbar } from '@/components/sales/contacts-kanban/KanbanToolbar';

// Hooks
import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { useWorkspaces } from '@/hooks/sales/useWorkspaces';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';

// Types
import { SimpleContact } from '@/types/simple-contact.types';

type BoardData = Record<string, SimpleContact[]>;

const KanbanBoard: React.FC = () => {
  // State
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('all');
  const [boardData, setBoardData] = useState<BoardData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('created_at_desc');

  // Data Fetching
  const { data: workspaces = [] } = useWorkspaces();
  const { data: stages = [], isLoading: isLoadingStages } = useContactStages();
  const { data: contacts = [], isLoading: isLoadingContacts } = useSimpleContacts({ workspaceId: selectedWorkspaceId });
  const updateContactMutation = useUpdateSimpleContact();
  const { toast } = useToast();
  const currentUser = useSelector((state: any) => state.auth.user);

  const isLoading = isLoadingContacts || isLoadingStages;

  // Memoized data processing (unchanged)
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

  // Effect to structure board data (unchanged)
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
  
  // Memoized list of columns to render (unchanged)
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

  // Drop handler (unchanged)
  const handleDrop = (item: { contact: SimpleContact }, newStageName: string) => {
    const { contact } = item;
    const oldStageName = contact.contact_stage || 'Uncategorized';
    if (oldStageName === newStageName) return;

    setBoardData(produce(draft => {
      const oldColumn = draft[oldStageName];
      const newColumn = draft[newStageName];
      const cardIndex = oldColumn.findIndex(c => c.id === contact.id);
      if (cardIndex > -1) {
        const [movedCard] = oldColumn.splice(cardIndex, 1);
        movedCard.contact_stage = newStageName;
        newColumn.unshift(movedCard);
      }
    }));
    updateContactMutation.mutate(
      { id: contact.id, updates: { contact_stage: newStageName, updated_by: currentUser?.id } },
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
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-full flex flex-col space-y-4">
        <header className="flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Contacts Kanban
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Drag and drop contacts to update their stage.
              </p>
            </div>
            <Link to="/contacts/list">
              <Button variant="outline">List View</Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col rounded-lg border bg-white overflow-hidden">
          {/* Fixed Toolbar */}
          <div className="p-4 border-b flex-shrink-0 sticky top-0 bg-white z-20 shadow-sm">
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

          {/* Scrollable Columns Container */}
          <div className="flex-1 overflow-x-auto p-4 bg-gray-50/50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading Board...
              </div>
            ) : (
              <div className="flex gap-4 h-full min-w-max" style={{ width: 'max-content' }}>
                {columnsToRender.map(stageName => {
                  const stageInfo = stages.find(s => s.name === stageName) || { 
                    id: stageName, 
                    name: stageName, 
                    color: '#9CA3AF' 
                  };
                  
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
    </DndProvider>
  );
};

export default KanbanBoard;