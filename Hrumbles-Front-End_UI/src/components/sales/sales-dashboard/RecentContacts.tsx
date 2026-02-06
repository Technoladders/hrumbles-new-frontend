// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/RecentContacts.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ArrowRight, 
  Mail, 
  Building2,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: number;
  name: string;
  email?: string;
  job_title?: string;
  photo_url?: string;
  contact_stage?: string;
  created_at: string;
  companies?: {
    id: number;
    name: string;
    logo_url?: string;
  };
}

interface RecentContactsProps {
  contacts: Contact[];
  isLoading: boolean;
}

const STAGE_STYLES: Record<string, string> = {
  'Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  'Contacted': 'bg-violet-50 text-violet-700 border-violet-200',
  'Qualified': 'bg-amber-50 text-amber-700 border-amber-200',
  'Proposal': 'bg-orange-50 text-orange-700 border-orange-200',
  'Negotiation': 'bg-pink-50 text-pink-700 border-pink-200',
  'Closed Won': 'bg-green-50 text-green-700 border-green-200',
  'Closed Lost': 'bg-red-50 text-red-700 border-red-200',
};

export const RecentContacts: React.FC<RecentContactsProps> = ({ contacts, isLoading }) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Recent Contacts</h3>
          <p className="text-xs text-gray-500 mt-0.5">Latest additions to your pipeline</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => navigate('/contacts')}
        >
          View all
          <ArrowRight size={12} className="ml-1" />
        </Button>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="px-5 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
              </div>
            </div>
          ))
        ) : contacts.length > 0 ? (
          contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => navigate(`/contacts/${contact.id}`)}
              className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <Avatar className="h-10 w-10 border border-gray-200">
                  <AvatarImage src={contact.photo_url || undefined} />
                  <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {contact.name}
                    </p>
                    {contact.contact_stage && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          STAGE_STYLES[contact.contact_stage] || "bg-gray-50 text-gray-600 border-gray-200"
                        )}
                      >
                        {contact.contact_stage}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {contact.job_title && (
                      <p className="text-xs text-gray-500 truncate">
                        {contact.job_title}
                      </p>
                    )}
                    {contact.companies?.name && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <Building2 size={10} />
                        {contact.companies.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Time and Actions */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (contact.email) window.location.href = `mailto:${contact.email}`;
                    }}
                  >
                    <Mail size={14} className="text-gray-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Empty state
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No contacts yet</p>
            <p className="text-xs text-gray-500 mt-1">Start building your pipeline</p>
            <Button 
              size="sm" 
              className="mt-4"
              onClick={() => navigate('/contacts')}
            >
              Add Contact
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};