// src/components/sales/contacts-kanban/KanbanCard.tsx
import React from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleContact } from '@/types/simple-contact.types';
import { cn } from '@/lib/utils';

export const ItemTypes = { CARD: 'CONTACT_CARD' };

interface KanbanCardProps {
  contact: SimpleContact;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ contact }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    // FIX: Pass the entire contact object on drag
    item: { contact },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const createdBy = contact.created_by_employee;
  const fallback = (createdBy?.first_name?.[0] || '') + (createdBy?.last_name?.[0] || '');

  return (
    <div ref={drag} className="mb-3">
      <Card className={cn("shadow-sm hover:shadow-md transition-shadow cursor-grab", isDragging && "opacity-50 ring-2 ring-blue-500")}>
        <CardContent className="p-3">
          <div className="flex justify-between items-start">
            <p className="font-semibold text-sm text-gray-800">{contact.name}</p>
            <Avatar className="h-7 w-7">
              <AvatarImage src={createdBy?.profile_picture_url} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{contact.company_name || 'No company'}</p>
        </CardContent>
      </Card>
    </div>
  );
};