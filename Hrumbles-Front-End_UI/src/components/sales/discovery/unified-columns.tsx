import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Lock, Eye, Building2, Plus, ShieldCheck, MoreHorizontal, ListPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export type UnifiedContact = {
  id: string;
  name: string;
  first_name: string;
  last_name?: string;
  job_title: string;
  company_name: string;
  email: string | null;
  mobile: string | null;
  photo_url: string | null;
  apollo_id: string;
  has_email: boolean;
  has_phone: boolean;
  is_saved: boolean; // True = in CRM, False = Discovery result
  company_id?: string;
  original_data?: any; // Full object for actions
};

export const getUnifiedColumns = (
  onAdd: (person: any) => void,
  onAccess: (id: string, apolloId: string, type: 'email' | 'phone') => void,
  onView: (id: string) => void,
  onListAdd: (person: any) => void
): ColumnDef<UnifiedContact>[] => [
  {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Professional Identity',
    size: 280,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-slate-100 rounded-lg">
            <AvatarImage src={p.photo_url || ''} />
            <AvatarFallback className="text-[10px] font-bold bg-indigo-50 text-indigo-600">
              {p.first_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            {p.is_saved ? (
               <Link to={`/contacts/${p.id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline">
                 {p.name}
               </Link>
            ) : (
               <span className="text-sm font-bold text-slate-900">{p.name}</span>
            )}
            {p.is_saved && <Badge variant="outline" className="w-fit text-[8px] h-3 px-1 border-emerald-200 text-emerald-700 bg-emerald-50">CRM Record</Badge>}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'job_title',
    header: 'Job Title',
    size: 220,
    cell: ({ getValue }) => <div className="truncate font-medium text-xs text-slate-600" title={getValue() as string}>{getValue() as string}</div>
  },
  {
    accessorKey: 'company_name',
    header: 'Organization',
    size: 200,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
        <Building2 size={14} className="text-slate-400 shrink-0" /> {row.original.company_name}
      </div>
    )
  },
  {
    id: 'email_access',
    header: 'Email Address',
    size: 200,
    cell: ({ row }) => {
      const c = row.original;
      if (c.email) {
        return (
          <div className="flex items-center gap-2 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-100 w-fit">
            <Mail size={12}/> <span className="truncate max-w-[140px]">{c.email}</span>
          </div>
        );
      }
      // Discovery Logic: Show "Available" badge
      if (!c.is_saved && c.has_email) {
         return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Email Available</Badge>;
      }
      // Saved Logic: Show "Access" button
      if (c.is_saved) {
        return (
          <Button 
            size="sm" 
            onClick={() => onAccess(c.id, c.apollo_id, 'email')}
            className="h-7 text-[10px] font-black bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm"
          >
            <Lock size={10} className="mr-1.5" /> Unlock
          </Button>
        );
      }
      return <span className="text-[10px] text-slate-300 italic">Not found</span>;
    }
  },
  {
    id: 'phone_access',
    header: 'Phone Number',
    size: 200,
    cell: ({ row }) => {
      const c = row.original;
      if (c.mobile) {
        return (
          <div className="flex items-center gap-2 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-100 w-fit">
            <Phone size={12}/> {c.mobile}
          </div>
        );
      }
      if (!c.is_saved && c.has_phone) {
         return <Badge className="bg-slate-100 text-slate-500 border-slate-200">Phone Available</Badge>;
      }
      if (c.is_saved) {
        return (
          <Button 
            size="sm" 
            onClick={() => onAccess(c.id, c.apollo_id, 'phone')}
            className="h-7 text-[10px] font-black bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 shadow-sm"
          >
            <Phone size={10} className="mr-1.5" /> Request
          </Button>
        );
      }
      return <span className="text-[10px] text-slate-300 italic">Not found</span>;
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right pr-4">Actions</div>,
    size: 140,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex justify-end gap-1">
          {!c.is_saved ? (
             <Button size="sm" onClick={() => onAdd(c.original_data)} className="h-7 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black px-3">
               <Plus size={12} className="mr-1" /> SAVE
             </Button>
          ) : (
             <div className="flex items-center">
                <ActionIcon icon={<ListPlus size={14}/>} tooltip="Add to List" onClick={() => onListAdd(c)} />
                <ActionIcon icon={<Eye size={14}/>} tooltip="View" onClick={() => onView(c.id)} />
                {c.company_id && <Link to={`/companies/${c.company_id}`}><ActionIcon icon={<Building2 size={14}/>} tooltip="Company" /></Link>}
             </div>
          )}
        </div>
      );
    }
  }
];

const ActionIcon = ({ icon, tooltip, onClick }: any) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={onClick}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[10px] font-bold">{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);