// src/components/sales/contacts-table/columns.tsx - REDESIGNED COMPACT COLUMNS

"use client";
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useDrag, useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, GripVertical, Link as LinkIcon, Trash2, AtSign, Lock, Linkedin, MessageSquare, Phone, Mail, UserPlus, Globe, MessageCircle, MoreHorizontal, Copy, Check, PhoneIncoming, Loader2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from './data-table-column-header';
import { CompanyCombobox } from './CompanyCombobox';
import { LocationCell } from './LocationCell';
import type { SimpleContact } from '@/types/simple-contact.types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { useToast } from '@/hooks/use-toast';
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// IMPROVED Re-orderable Header with better visibility
export const ReorderableHeader: React.FC<any> = ({ header, table }) => {
  const { setColumnOrder } = table;
  const { columnOrder } = table.getState();
  const { column } = header;
  const [isHovering, setIsHovering] = useState(false);

  const [, dropRef] = useDrop({
    accept: 'column',
    drop: (draggedColumn: any) => {
      const newColumnOrder = [...columnOrder];
      const fromIndex = newColumnOrder.indexOf(draggedColumn.id);
      const toIndex = newColumnOrder.indexOf(column.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        [newColumnOrder[fromIndex], newColumnOrder[toIndex]] = [newColumnOrder[toIndex], newColumnOrder[fromIndex]];
        setColumnOrder(newColumnOrder);
      }
    },
  });

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: monitor => ({ isDragging: !!monitor.isDragging() }),
    item: () => column,
    type: 'column',
  });

  return (
    <div 
      ref={dropRef} 
      className="flex-grow"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div ref={previewRef} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <div 
          ref={dragRef} 
          className={cn(
            "flex items-center gap-6 cursor-grab active:cursor-grabbing transition-colors",
            isHovering && "text-blue-300"
          )}
        >
          <GripVertical 
            size={14} 
            className={cn(
              "transition-all",
              isHovering ? "opacity-100 text-blue-300" : " text-white"
            )} 
          />
          <DataTableColumnHeader 
            column={column} 
            title={column.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
          />
        </div>
      </div>
    </div>
  );
};

const ReadOnlyCell: React.FC<any> = ({ getValue }) => {
  const value = getValue();
  return <div className="truncate text-xs">{value || <span className="text-slate-400">-</span>}</div>;
};

// Data-Type Specific Cells
const DateCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue();
  const [value, setValue] = React.useState(initialValue ? new Date(initialValue).toISOString().split('T')[0] : '');
  const onBlur = () => table.options.meta?.updateData(row.index, column.id, value ? new Date(value).toISOString() : null);
  React.useEffect(() => setValue(initialValue ? new Date(initialValue).toISOString().split('T')[0] : ''), [initialValue]);
  return <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full text-xs border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none p-1" />;
};

const NumberCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue() || "";
  const [value, setValue] = React.useState(initialValue);
  const onBlur = () => table.options.meta?.updateData(row.index, column.id, value === '' ? null : Number(value));
  React.useEffect(() => setValue(initialValue), [initialValue]);
  return <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full text-xs border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none p-0" />;
};

export const EditableCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue() || "";
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);

  const onBlur = async () => {
    setIsEditing(false);
    if (value !== initialValue) {
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      table.options.meta?.updateData(row.index, column.id, value);
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  React.useEffect(() => setValue(initialValue), [initialValue]);

  return (
    <div className="relative group">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={onBlur}
        className={cn(
          "h-full text-xs border-none bg-transparent transition-all rounded-none p-0 truncate",
          isEditing ? "focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-1" : "focus-visible:ring-0"
        )}
      />

      <AnimatePresence>
        {(isSaving || isSaved) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            ) : (
              <Check className="h-3 w-3 text-green-500" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PhoneCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue() || "";
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      table.options.meta?.updateData(row.index, column.id, value);
    }
  };

  return (
    <div onBlur={onBlur} className="phone-input-cell">
      <style>{`
        .phone-input-cell .PhoneInputInput {
          height: 100%;
          border: none;
          background-color: transparent;
          box-shadow: none;
          padding: 0;
          font-size: 11px;
        }
        .phone-input-cell .PhoneInputInput:focus {
          outline: none;
          box-shadow: 0 0 0 1px rgb(59 130 246);
        }
      `}</style>
      <PhoneInput
        international
        value={value}
        onChange={(v) => setValue(v || "")}
      />
    </div>
  );
};

const LinkedInCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue() || "";
  const [value, setValue] = React.useState(initialValue);
  const onBlur = () => table.options.meta?.updateData(row.index, column.id, value);
  React.useEffect(() => setValue(initialValue), [initialValue]);
  
  return (
    <div className="flex items-center gap-1.5">
      {value && (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 shrink-0">
          <LinkIcon size={12} />
        </a>
      )}
      <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} placeholder="linkedin.com/in/..." className="h-full text-xs border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 rounded-none p-0" />
    </div>
  );
};

const TextWithTooltipCell: React.FC<any> = (props) => {
  const value = props.getValue();

  if (!value || typeof value !== 'string' || value.trim() === '') {
    return <EditableCell {...props} />;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <div className="w-full h-full cursor-default overflow-hidden">
            <EditableCell {...props} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{value}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const getCustomCell = (dataType: 'text' | 'date' | 'number') => {
  switch (dataType) {
    case 'date': return DateCell;
    case 'number': return NumberCell;
    case 'text': return TextWithTooltipCell;
    default: return EditableCell;
  }
};

const DisplayDateCell: React.FC<any> = ({ getValue }) => {
  const date = getValue();
  if (!date) {
    return <span className="text-slate-400 text-xs">-</span>;
  }
  return (
    <span className="text-slate-600 text-xs">
      {new Date(date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      })}
    </span>
  );
};

const CopyableEditableCell: React.FC<any> = (props) => {
  const { getValue } = props;
  const { toast } = useToast();
  const [isCopied, setIsCopied] = React.useState(false);
  const valueToCopy = getValue() || "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!valueToCopy) return;

    await navigator.clipboard.writeText(valueToCopy);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Email copied to clipboard." });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="group relative flex items-center w-full">
      <EditableCell {...props} />

      <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Copy email</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const CopyableLinkedInCell: React.FC<any> = (props) => {
  const { getValue } = props;
  const { toast } = useToast();
  const [isCopied, setIsCopied] = React.useState(false);
  const valueToCopy = getValue() || "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!valueToCopy) return;

    await navigator.clipboard.writeText(valueToCopy);
    setIsCopied(true);
    toast({ title: "Copied!", description: "LinkedIn URL copied to clipboard." });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="group relative flex items-center w-full">
      <LinkedInCell {...props} />

      <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Copy URL</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const CopyablePhoneCell: React.FC<any> = (props) => {
  const { getValue } = props;
  const { toast } = useToast();
  const [isCopied, setIsCopied] = React.useState(false);
  const valueToCopy = getValue() || "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!valueToCopy) return;

    await navigator.clipboard.writeText(valueToCopy);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Phone number copied to clipboard." });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="group relative flex items-center w-full">
      <PhoneCell {...props} />

      <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Copy number</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const StageSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue();
  const { data: stages = [] } = useContactStages();
  const onValueChange = (newValue: string) => table.options.meta?.updateData(row.index, column.id, newValue);

  const stageInfo = stages.find(s => s.name === initialValue);
  
  return (
    <Select value={initialValue || ""} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-none bg-transparent focus:ring-0 shadow-none data-[state=open]:bg-slate-50">
        <SelectValue>
          {initialValue ? (
            <Badge variant="outline" className="border text-[10px] font-medium" style={{ backgroundColor: stageInfo?.color + '20', color: stageInfo?.color, borderColor: stageInfo?.color + '40' }}>{initialValue}</Badge>
          ) : ( <span className="text-slate-400 text-xs">Select...</span> )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map(stage => (
          <SelectItem key={stage.id} value={stage.name} className="text-xs">
            <div className="flex items-center"><span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{stage.name}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const CompanyCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialCompanyId = row.original.company_id;
  const companyName = getValue() as string;

  const onSelect = (companyId: number | null) => {
    table.options.meta?.updateData(row.index, 'company_id', companyId);
  };
  return <CompanyCombobox value={initialCompanyId} onSelect={onSelect} initialName={companyName} />;
};

const AccessCell = ({ getValue, children }: { getValue: () => any, children: React.ReactNode }) => {
  const initialValue = getValue();
  const [isRevealed, setIsRevealed] = useState(!initialValue);

  useEffect(() => {
    setIsRevealed(!initialValue);
  }, [initialValue]);

  if (isRevealed) {
    return <>{children}</>;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-[10px] font-normal px-2"
      onClick={(e) => {
        e.stopPropagation();
        setIsRevealed(true);
      }}
    >
      <Linkedin className="h-3 w-3 mr-1" />
      Access
    </Button>
  );
};

const MediumSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped()) return null;
  const initialValue = getValue();
  const mediumOptions = [
    { name: 'LinkedIn', color: '#0A66C2', icon: LinkIcon },
    { name: 'Cold Call', color: '#413a3aff', icon: Phone },
    { name: 'Email Campaign', color: '#10B981', icon: Mail },
    { name: 'Referral', color: '#8B5CF6', icon: UserPlus },
    { name: 'Website Form', color: '#3B82F6', icon: Globe },
    { name: 'WhatsApp / SMS', color: '#25D366', icon: MessageCircle },
    { name: 'Other', color: '#6B7280', icon: MoreHorizontal },
  ];
  const onValueChange = (newValue: string) => table.options.meta?.updateData(row.index, column.id, newValue);

  const selectedMedium = mediumOptions.find(option => option.name === initialValue);
  
  return (
    <Select value={initialValue || ""} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-none bg-transparent focus:ring-0 shadow-none data-[state=open]:bg-slate-50">
        <SelectValue>
          {initialValue ? (
            <Badge
              variant="outline"
              className="border text-[10px] font-medium flex items-center gap-1"
              style={{
                backgroundColor: selectedMedium?.color + '20',
                color: selectedMedium?.color,
                borderColor: selectedMedium?.color + '40'
              }}
            >
              {selectedMedium && <selectedMedium.icon size={12} />}
              {initialValue}
            </Badge>
          ) : (
            <span className="text-slate-400 text-xs">Select...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {mediumOptions.map(option => (
          <SelectItem key={option.name} value={option.name} className="text-xs">
            <div className="flex items-center gap-2">
              <option.icon size={12} style={{ color: option.color }} />
              {option.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const ActionColumn: ColumnDef<SimpleContact> = {
  id: 'actions',
  size: 60,
  minSize: 60,
  enableSorting: false,
  enableHiding: false,
  header: () => <div className="text-center text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Actions</div>,
  cell: ({ row }) => {
    const [isOpen, setIsOpen] = useState(false);
    const deleteContactMutation = useDeleteContact();
    const { toast } = useToast();

    const handleDelete = () => {
      deleteContactMutation.mutate(row.original.id, {
        onSuccess: () => {
          toast({ title: "Contact Deleted", description: "The contact has been permanently removed." });
          setIsOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Delete Failed", variant: "destructive", description: err.message });
        },
      });
    };

    return (
      <>
        <div className="flex justify-center">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="group h-7 w-7 rounded-full hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5 text-red-500 transition-colors group-hover:text-red-700" />
          </Button>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Contact</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {row.original.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} size="sm">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} size="sm">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

export const columns: ColumnDef<SimpleContact>[] = [
  {
    id: 'select',
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <div className="px-1 flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="h-3.5 w-3.5"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1 flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="h-3.5 w-3.5"
        />
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: ReorderableHeader,
    size: 180,
    minSize: 140,
    maxSize: 280,
    cell: ({ row, table, ...props }) => {
      if (row.getIsGrouped()) {
        const { data: stages = [] } = useContactStages();
        const stageName = row.id.split(':')[1] || 'Uncategorized';
        const stageInfo = stages.find(s => s.name === stageName);
        return (
          <div onClick={() => row.toggleExpanded()} className="flex items-center gap-2 font-semibold text-xs text-slate-800 cursor-pointer">
            {row.getIsExpanded() ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stageInfo?.color ?? '#ccc' }}></span>
            {stageName}
            <span className="text-slate-500 font-normal">({row.subRows.length})</span>
          </div>
        );
      }
      
      const contact = row.original;
      const meta = table.options.meta as any;
      
      return (
        <div className="whitespace-nowrap" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
       <Link 
        to={`/contacts/${contact.id}`} // Change path based on your AppRouter
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-xs"
      >
            {contact.name}
          </Link>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: ReorderableHeader,
    size: 170,
    minSize: 120,
    maxSize: 240,
    filterFn: 'emailExists',
    cell: (props) => {
      const initialValue = props.getValue();
      const [isRevealed, setIsRevealed] = useState(!initialValue);
      useEffect(() => { setIsRevealed(!initialValue); }, [initialValue]);

      if (isRevealed) {
        return <CopyableEditableCell {...props} />;
      }

      return (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="h-7 text-[10px] font-medium group transition-all duration-300 ease-in-out bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 hover:text-white hover:border-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600"
          onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
        >
          <AtSign className="h-3 w-3 mr-1 text-blue-700 transition-colors group-hover:text-white inline" />
          <span>Access email</span>
        </motion.button>
      );
    }
  },
  {
    accessorKey: 'mobile',
    header: ReorderableHeader,
    size: 150,
    minSize: 120,
    maxSize: 190,
    cell: (props) => {
      const initialValue = props.getValue();
      const [isRevealed, setIsRevealed] = useState(!initialValue);
      useEffect(() => { setIsRevealed(!initialValue); }, [initialValue]);

      if (isRevealed) {
        return <CopyablePhoneCell {...props} />;
      }

      return (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-medium group transition-all duration-300 ease-in-out bg-blue-50 text-blue-700 border-blue-200 hover:text-white hover:border-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600"
          onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
        >
          <Phone className="h-3 w-3 mr-1 text-blue-700 transition-colors group-hover:text-white" />
          Access Mobile
        </Button>
      );
    }
  },
  {
    accessorKey: 'alt_mobile',
    header: ReorderableHeader,
    size: 150,
    minSize: 120,
    maxSize: 190,
    cell: (props) => {
      const initialValue = props.getValue();
      const [isRevealed, setIsRevealed] = useState(!initialValue);
      useEffect(() => { setIsRevealed(!initialValue); }, [initialValue]);

      if (isRevealed) {
        return <CopyablePhoneCell {...props} />;
      }
      
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-medium group transition-all duration-300 ease-in-out bg-blue-50 text-blue-700 border-blue-200 hover:text-white hover:border-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600"
          onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
        >
          <Phone className="h-3 w-3 mr-1 text-blue-700 transition-colors group-hover:text-white" />
          Access Alt. Mobile
        </Button>
      );
    }
  },
  {
    id: 'location',
    header: () => <div className="text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Location</div>,
    accessorFn: row => {
      const parts = [row.city, row.state, row.country].filter(Boolean);
      return parts.join(', ');
    },
    cell: LocationCell,
    size: 180,
    minSize: 140,
    maxSize: 260,
  },
  {
    accessorKey: 'timezone',
    header: ReorderableHeader,
    cell: EditableCell,
    size: 130,
    minSize: 100,
    maxSize: 180,
  },
  {
    accessorKey: 'linkedin_url',
    header: ReorderableHeader,
    size: 170,
    minSize: 140,
    maxSize: 240,
    cell: (props) => {
      const initialValue = props.getValue();
      const [isRevealed, setIsRevealed] = useState(!initialValue);
      useEffect(() => { setIsRevealed(!initialValue); }, [initialValue]);

      if (isRevealed) {
        return <CopyableLinkedInCell {...props} />;
      }
      
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-medium group transition-all duration-300 ease-in-out bg-blue-50 text-blue-700 border-blue-200 hover:text-white hover:border-transparent hover:bg-gradient-to-r from-blue-500 to-indigo-600"
          onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
        >
          <Linkedin className="h-3 w-3 mr-1 text-blue-700 transition-colors group-hover:text-white" />
          Access Link
        </Button>
      );
    }
  },
  { accessorKey: 'company_name', header: ReorderableHeader, size: 170, minSize: 140, maxSize: 240, cell: CompanyCell },
  { accessorKey: 'job_title', header: ReorderableHeader, cell: EditableCell, size: 180, minSize: 140, maxSize: 260 },
  {
    accessorKey: 'contact_stage',
    header: ReorderableHeader,
    size: 140,
    minSize: 120,
    maxSize: 190,
    cell: StageSelectCell,
    filterFn: 'arrIncludesSome',
  },
  { 
    accessorKey: 'medium', 
    header: ReorderableHeader, 
    size: 140, 
    minSize: 120, 
    maxSize: 190, 
    cell: MediumSelectCell 
  },
  {
    accessorFn: (row) => row.created_by ?? null,
    id: 'created_by_employee',
    header: () => <div className="text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Created By</div>,
    cell: ({ row }) => {
      const employee = row.original.created_by_employee;
      if (!employee) return <span className="text-slate-400 text-xs">-</span>;
      const fallback = (employee.first_name?.[0] || '') + (employee.last_name?.[0] || '');
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-400 hover:ring-offset-1">
                <AvatarImage src={employee.profile_picture_url} />
                <AvatarFallback className="text-[9px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">{fallback}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {employee.first_name} {employee.last_name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    enableFiltering: true,
    size: 90,
    minSize: 60,
    maxSize: 120,
    filterFn: 'arrIncludesSome',
  },
  { accessorKey: 'created_at', header: () => <div className="text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Created</div>, cell: DisplayDateCell, enableSorting: true, size: 90, minSize: 60, maxSize: 120 },
  {
    accessorKey: 'updated_by_employee', 
    header: () => <div className="text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Updated By</div>,
    cell: ({ row }) => {
      const employee = row.original.updated_by_employee;
      if (!employee) return <span className="text-slate-400 text-xs">-</span>;
      const fallback = (employee.first_name?.[0] || '') + (employee.last_name?.[0] || '');
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-400 hover:ring-offset-1">
                <AvatarImage src={employee.profile_picture_url} />
                <AvatarFallback className="text-[9px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">{fallback}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {employee.first_name} {employee.last_name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    size: 90,
    minSize: 60,
    maxSize: 120,
  },
  { accessorKey: 'updated_at', header: () => <div className="text-[10px] font-bold uppercase tracking-wider text-white opacity-90">Updated</div>, cell: DisplayDateCell, enableSorting: true, size: 90, minSize: 60, maxSize: 120 },
];