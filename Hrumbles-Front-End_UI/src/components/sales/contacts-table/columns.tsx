// src/components/sales/contacts-table/columns.tsx
"use client";
import React from 'react';
import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useDrag, useDrop } from 'react-dnd';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, GripVertical, Link as LinkIcon, Trash2, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from './data-table-column-header';
import { CompanyCombobox } from './CompanyCombobox';
import type { SimpleContact } from '@/types/simple-contact.types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// --- Re-orderable Header ---
export const ReorderableHeader: React.FC<any> = ({ header, table }) => {
    // Correctly get the table's own setColumnOrder instance function
    const { setColumnOrder } = table; 
    const { columnOrder } = table.getState();
    const { column } = header;

    const [, dropRef] = useDrop({
        accept: 'column',
        drop: (draggedColumn: any) => {
            const newColumnOrder = [...columnOrder];
            const fromIndex = newColumnOrder.indexOf(draggedColumn.id);
            const toIndex = newColumnOrder.indexOf(column.id);
            if (fromIndex !== -1 && toIndex !== -1) {
                [newColumnOrder[fromIndex], newColumnOrder[toIndex]] = [newColumnOrder[toIndex], newColumnOrder[fromIndex]];
                // Call the table's internal state updater
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
        <div ref={dropRef} className="flex-grow">
            <div ref={previewRef} style={{ opacity: isDragging ? 0.5 : 1 }}>
                <div ref={dragRef} className="flex items-center gap-1 cursor-grab">
                    <GripVertical size={14} className="text-muted-foreground" />
                    <DataTableColumnHeader column={column} title={column.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                </div>
            </div>
        </div>
    );
};


// --- NEW Data-Type Specific Editable Cells ---
const DateCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialValue = getValue();
    const [value, setValue] = React.useState(initialValue ? new Date(initialValue).toISOString().split('T')[0] : '');
    const onBlur = () => table.options.meta?.updateData(row.index, column.id, value ? new Date(value).toISOString() : null);
    React.useEffect(() => setValue(initialValue ? new Date(initialValue).toISOString().split('T')[0] : ''), [initialValue]);
    return <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none p-1" />;
};

const NumberCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialValue = getValue() || "";
    const [value, setValue] = React.useState(initialValue);
    const onBlur = () => table.options.meta?.updateData(row.index, column.id, value === '' ? null : Number(value));
    React.useEffect(() => setValue(initialValue), [initialValue]);
    return <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none p-0" />;
};

// --- Custom Editable Cells & Renderers ---
export const EditableCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialValue = getValue() || "";
    const [value, setValue] = React.useState(initialValue);
    const onBlur = () => table.options.meta?.updateData(row.index, column.id, value);
    React.useEffect(() => setValue(initialValue), [initialValue]);
    return <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full border-none bg-transparent focus-visible:ring-0 rounded-none p-0 truncate" />;
};

const PhoneCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialValue = getValue() || "";
    const [value, setValue] = React.useState(initialValue);
    const onBlur = () => table.options.meta?.updateData(row.index, column.id, value);
    React.useEffect(() => setValue(initialValue), [initialValue]);
    
    return (
        <div className="flex items-center gap-2">
            <span role="img" aria-label="India flag">🇮🇳</span>
            <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 rounded-none p-0" placeholder="+91..." />
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
        <div className="flex items-center gap-2">
            <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 shrink-0">
                <LinkIcon size={14} />
            </a>
            <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} placeholder="linkedin.com/in/..." className="h-full border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 rounded-none p-0" />
        </div>
    );
};


// NEW helper function to get the right editor for a custom field
export const getCustomCell = (dataType: 'text' | 'date' | 'number') => {
    switch (dataType) {
        case 'date': return DateCell;
        case 'number': return NumberCell;
        default: return EditableCell;
    }
};

const DisplayDateCell: React.FC<any> = ({ getValue }) => {
    const date = getValue();
    if (!date) {
        return <span className="text-muted-foreground">-</span>;
    }
    // Format date as MM/DD/YY for a compact view
    return (
        <span className="text-muted-foreground">
            {new Date(date).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: '2-digit',
            })}
        </span>
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
            <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 shadow-none data-[state=open]:bg-gray-100">
                <SelectValue>
                    {initialValue ? (
                        <Badge variant="outline" className="border font-normal" style={{ backgroundColor: stageInfo?.color + '20', color: stageInfo?.color, borderColor: stageInfo?.color + '40' }}>{initialValue}</Badge>
                    ) : ( <span className="text-muted-foreground">Select...</span> )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.name}>
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
    // Start revealed if there's no data to hide.
    const [isRevealed, setIsRevealed] = useState(!initialValue);

    // If data changes (e.g., from an API update), re-evaluate if the cell should be hidden.
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
            className="h-7 text-xs font-normal text-gray-600"
            onClick={(e) => {
                e.stopPropagation(); // Prevent row selection or other events
                setIsRevealed(true);
            }}
        >
            <Lock className="h-3 w-3 mr-2" />
            Access
        </Button>
    );
};

const MediumSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialValue = getValue();
    // Static options for the Medium column
    const mediumOptions = ['Cold', 'LinkedIn', 'Email', 'Website', 'Referral', 'Other'];
    const onValueChange = (newValue: string) => table.options.meta?.updateData(row.index, column.id, newValue);

    return (
        <Select value={initialValue || ""} onValueChange={onValueChange}>
            <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 shadow-none data-[state=open]:bg-gray-100">
                <SelectValue>
                    {initialValue ? (
                        <Badge variant="secondary" className="font-normal">{initialValue}</Badge>
                    ) : ( <span className="text-muted-foreground">Select...</span> )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {mediumOptions.map(option => (
                    <SelectItem key={option} value={option}>
                        {option}
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
  header: '',
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
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Contact</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {row.original.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
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
    size: 40, // Slightly increased for better clicking
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <div className="px-1">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: ReorderableHeader,
    size: 180, // Giving more space to the primary column
    minSize: 150,
    maxSize: 300,
    cell: ({ row, ...props }) => {
      if (row.getIsGrouped()) {
        const { data: stages = [] } = useContactStages();
        const stageName = row.id.split(':')[1] || 'Uncategorized';
        const stageInfo = stages.find(s => s.name === stageName);
        return (
          <div onClick={() => row.toggleExpanded()} className="flex items-center gap-3 font-semibold text-gray-800 cursor-pointer">
            {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageInfo?.color ?? '#ccc' }}></span>
            {stageName}
            <span className="text-muted-foreground font-normal">({row.subRows.length})</span>
          </div>
        );
      }
     return (<div className="whitespace-nowrap" style={{ paddingLeft: `${row.depth * 1.5}rem` }}><EditableCell row={row} {...props} /></div>);
    },
  },
  {
    accessorKey: 'email',
    header: ReorderableHeader,
    size: 180,
    minSize: 120,
    maxSize: 250,
    // UPDATED: Wrap the original cell in our new AccessCell component
    cell: (props) => (
      <AccessCell getValue={props.getValue}>
        <EditableCell {...props} />
      </AccessCell>
    )
  },
  {
    accessorKey: 'mobile',
    header: ReorderableHeader,
    size: 160,
    minSize: 120,
    maxSize: 200,
    // UPDATED: Wrap the original cell in our new AccessCell component
    cell: (props) => (
      <AccessCell getValue={props.getValue}>
        <PhoneCell {...props} />
      </AccessCell>
    )
  },
  {
    accessorKey: 'linkedin_url',
    header: ReorderableHeader,
    size: 180,
    minSize: 150,
    maxSize: 250,
    // UPDATED: Wrap the original cell in our new AccessCell component
    cell: (props) => (
      <AccessCell getValue={props.getValue}>
        <LinkedInCell {...props} />
      </AccessCell>
    )
  },
  { accessorKey: 'company_name', header: ReorderableHeader, size: 180, minSize: 150, maxSize: 250, cell: CompanyCell },
  { accessorKey: 'job_title', header: ReorderableHeader, cell: EditableCell, size: 200, minSize: 150, maxSize: 300 },
  { accessorKey: 'contact_stage', header: ReorderableHeader, size: 150, minSize: 120, maxSize: 200, cell: StageSelectCell },
 
   { 
    accessorKey: 'medium', 
    header: ReorderableHeader, 
    size: 150, 
    minSize: 120, 
    maxSize: 200, 
    cell: MediumSelectCell 
  },
 
  {
    accessorFn: (row) => row.created_by ?? null,
    id: 'created_by_employee',
    header: "Created By",
    cell: ({ row }) => {
      const employee = row.original.created_by_employee;
      if (!employee) return <span className="text-muted-foreground">-</span>;
      const fallback = (employee.first_name?.[0] || '') + (employee.last_name?.[0] || '');
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6">
                <AvatarImage src={employee.profile_picture_url} />
                <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{employee.first_name} {employee.last_name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    enableFiltering: true,
    size: 100,
    minSize: 60,
    maxSize: 120,
    filterFn: 'arrIncludesSome',
  },
  { accessorKey: 'created_at', header: "Created At", cell: DisplayDateCell, enableSorting: true, size: 100, minSize: 60, maxSize: 120 },
  {
    accessorKey: 'updated_by_employee',
    header: "Updated By",
    cell: ({ row }) => {
      const employee = row.original.updated_by_employee;
      if (!employee) return <span className="text-muted-foreground">-</span>;
      const fallback = (employee.first_name?.[0] || '') + (employee.last_name?.[0] || '');
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6">
                <AvatarImage src={employee.profile_picture_url} />
                <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{employee.first_name} {employee.last_name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    size: 100,
    minSize: 60,
    maxSize: 120,
  },
  { accessorKey: 'updated_at', header: "Updated At", cell: DisplayDateCell, enableSorting: true, size: 100, minSize: 60, maxSize: 120 },
];

// Column Enhance