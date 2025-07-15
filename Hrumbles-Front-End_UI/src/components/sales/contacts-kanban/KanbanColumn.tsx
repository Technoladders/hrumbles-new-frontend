// src/components/sales/contacts-kanban/KanbanColumn.tsx
import React from 'react';
import { useDrop } from 'react-dnd';
import { KanbanCard, ItemTypes } from './KanbanCard';
import { SimpleContact } from '@/types/simple-contact.types';
import { ContactStage } from '@/hooks/sales/useContactStages';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: ContactStage;
  contacts: SimpleContact[];
  onDrop: (item: { contact: SimpleContact }, stageName: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, contacts, onDrop }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item: { contact: SimpleContact }) => onDrop(item, stage.name),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={cn("w-72 md:w-80 h-full flex-shrink-0 bg-slate-100/60 rounded-lg flex flex-col transition-colors", 
        isOver && canDrop && "bg-blue-100"
      )}
    >
      <div className="p-3 border-b flex items-center gap-2 sticky top-0 bg-slate-100/80 rounded-t-lg backdrop-blur-sm z-10">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }}></span>
        <h3 className="font-semibold text-gray-700">{stage.name}</h3>
        <span className="text-sm text-muted-foreground ml-1 px-2 py-0.5 bg-slate-200 rounded-full">{contacts.length}</span>
      </div>
      <div className="flex-grow p-1.5 overflow-y-auto">
        {contacts.map((contact) => (
          <KanbanCard key={contact.id} contact={contact} />
        ))}
        {contacts.length === 0 && <div className="text-center text-sm text-gray-400 mt-4 p-4 border-2 border-dashed border-gray-300 rounded-md">Drop contacts here</div>}
      </div>
    </div>
  );
};