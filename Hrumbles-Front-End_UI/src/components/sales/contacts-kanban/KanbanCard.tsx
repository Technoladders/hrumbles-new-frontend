import React from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleContact } from '@/types/simple-contact.types';
import { cn } from '@/lib/utils';
import moment from 'moment';
import { Calendar, Linkedin, Clock } from 'lucide-react';

export const ItemTypes = { CARD: 'CONTACT_CARD' };

interface KanbanCardProps {
  contact: SimpleContact;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ contact }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { contact },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));



  const createdBy = contact.created_by_employee;
  const fallback = (createdBy?.first_name?.[0] || '') + (createdBy?.last_name?.[0] || '');

  const formattedUpdatedAt = contact.updated_at
    ? moment(contact.updated_at).format('MMM D, YYYY, h:mm A')
    : 'Not updated';

  return (
    <div ref={drag} className="mb-3">
      <Card
        className={cn(
          "shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab border border-gray-100 rounded-lg bg-white",
          isDragging && "opacity-50 ring-2 ring-blue-500"
        )}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-sm text-gray-900">{contact.name}</p>
              {contact.job_title && (
                <p className="text-xs text-gray-500 mt-1">{contact.job_title}</p>
              )}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={createdBy?.profile_picture_url} />
              <AvatarFallback className="bg-purple-100 text-purple-800 text-xs">
                {fallback}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-purple-800 flex-shrink-0">
              <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors">
                {contact.companies?.logo_url && (
                  <img
                    src={contact.companies.logo_url}
                    alt={`${contact.company_name} logo`}
                    className="h-4 w-4 mr-1 rounded-full object-contain"
                  />
                )}
                {contact.company_name || 'No company'}
              </span>
            </p>
            {/* {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 transition-colors"
              >
                <Linkedin size={16} />
              </a>
            )} */}
          </div>
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <Clock size={14} className="mr-1 text-gray-400" />
            {formattedUpdatedAt}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};