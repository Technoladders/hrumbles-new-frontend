// src/pages/sales/KanbanBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSimpleContacts } from '@/hooks/sales/useSimpleContacts';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useUpdateSimpleContact } from '@/hooks/sales/useUpdateSimpleContact';
import { KanbanColumn } from '@/components/sales/contacts-kanban/KanbanColumn';
import { KanbanToolbar } from '@/components/sales/contacts-kanban/KanbanToolbar';
import { SimpleContact } from '@/types/simple-contact.types';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { produce } from 'immer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type BoardData = Record<string, SimpleContact[]>;

const KanbanBoard: React.FC = () => {
  const { data: contacts = [], isLoading: isLoadingContacts } = useSimpleContacts();
  const { data: stages = [], isLoading: isLoadingStages } = useContactStages();
  const updateContactMutation = useUpdateSimpleContact();
  const { toast } = useToast();
  const currentUser = useSelector((state: any) => state.auth.user);

  const [boardData, setBoardData] = useState<BoardData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('created_at_desc');

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
    processedContacts.forEach(contact => {
      const stageName = contact.contact_stage || 'Uncategorized';
      if (!data[stageName]) data[stageName] = [];
      data[stageName].push(contact);
    });
    setBoardData(data);
  }, [processedContacts, stages]);

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

  if (isLoadingContacts || isLoadingStages) {
    return <div className="p-4 text-center text-muted-foreground">Loading Board...</div>;
  }

return (
        <DndProvider backend={HTML5Backend}>
            {/* Changed: Main container now fills height and uses flexbox */}
            <div className="h-full w-full flex flex-col bg-white rounded-lg border">
                {/* KanbanToolbar now has a border */}
                <div className="p-4 border-b">
                     <KanbanToolbar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        sortOption={sortOption}
                        onSortChange={setSortOption}
                    />
                </div>

                {/* Changed: This is the main scrolling container for the board */}
                {/* flex-1: takes available height */}
                {/* overflow-x-auto: allows horizontal scrolling for columns */}
                {/* p-4: adds some padding around the columns */}
                <div className="flex-1 overflow-x-auto p-4">
                    <div className="flex h-full space-x-4">
                        {stages.map(stage => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                contacts={boardData[stage.name] || []}
                                onDrop={handleDrop}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default KanbanBoard;