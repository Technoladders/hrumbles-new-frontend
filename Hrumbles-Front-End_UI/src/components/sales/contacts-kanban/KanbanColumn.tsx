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
      className={cn(
        "w-72 flex-shrink-0 h-full flex flex-col bg-slate-100/60 rounded-lg",
        isOver && canDrop && "bg-blue-100"
      )}
      style={{ minWidth: '288px' }} // Ensure minimum width matches w-72 + padding
    >
      {/* Header is sticky within this column */}
      <div className="p-3 border-b flex items-center gap-2 sticky top-0 bg-slate-100/80 rounded-t-lg backdrop-blur-sm z-10">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#ccc' }}></span>
        <h3 className="font-semibold text-gray-700 text-sm truncate">{stage.name}</h3>
        <span className="text-sm text-purple-800 ml-auto flex-shrink-0 px-2 py-0.5 bg-purple-300 rounded-full">{contacts.length}</span>
      </div>
      {/* Scrollable content within the column */}
      <div className="flex-grow p-1.5 overflow-y-auto">
        {contacts.map((contact) => (
          <KanbanCard key={contact.id} contact={contact} />
        ))}
        {contacts.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-center text-xs text-gray-400 p-2 mt-2 mx-2 border-2 border-dashed border-gray-300/80 rounded-md">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
};