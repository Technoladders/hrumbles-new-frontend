// src/components/sales/contacts-table/columns.tsx
"use client";
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useDrag, useDrop } from 'react-dnd';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, GripVertical, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from './data-table-column-header';
import { CompanyCombobox } from './CompanyCombobox';
import type { SimpleContact } from '@/types/simple-contact.types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
    return <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 rounded-none p-0" />;
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

// FIX: This cell now correctly displays the company name and only shows the combobox on click.
const CompanyCell: React.FC<any> = ({ getValue, row, column, table }) => {
    if (row.getIsGrouped()) return null;
    const initialCompanyId = row.original.company_id;
    const companyName = getValue() as string;

    const onSelect = (companyId: number | null) => {
        table.options.meta?.updateData(row.index, 'company_id', companyId);
    };
    return <CompanyCombobox value={initialCompanyId} onSelect={onSelect} initialName={companyName} />;
};

const EmployeeAvatarCell: React.FC<any> = ({ getValue, row }) => {
    if (row.getIsGrouped()) return null;
    const employee = getValue();
    if (!employee) return <span className="text-muted-foreground">-</span>;
    const fallback = (employee.first_name?.[0] || '') + (employee.last_name?.[0] || '');
    return (
        <TooltipProvider><Tooltip><TooltipTrigger>
            <Avatar className="h-7 w-7"><AvatarImage src={employee.profile_picture_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
        </TooltipTrigger><TooltipContent>{employee.first_name} {employee.last_name}</TooltipContent></Tooltip></TooltipProvider>
    );
};

// const DateCell: React.FC<any> = ({ getValue, row }) => {
//     if (row.getIsGrouped()) return null;
//     const date = getValue();
//     if (!date) return <span className="text-muted-foreground">-</span>;
//     return <span className="text-muted-foreground">{new Date(date).toLocaleDateString()}</span>;
// };

// --- FINAL Column Definitions ---
export const columns: ColumnDef<SimpleContact>[] = [
  { id: 'select', size: 40, enableSorting: false, enableHiding: false, header: ({ table }) => (<div className="px-1"><Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" /></div>), cell: ({ row }) => (<div className="px-1"><Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" /></div>) },
  {
    accessorKey: 'name',
    header: ReorderableHeader,
    size: 280,
    cell: ({ row, ...props }) => {
      if (row.getIsGrouped()) {
        const { data: stages = [] } = useContactStages();
        const stageName = row.id.split(':')[1] || 'Uncategorized';
        const stageInfo = stages.find(s => s.name === stageName);
        return (
          <div onClick={() => row.toggleExpanded()} className="flex items-center gap-3 font-semibold text-gray-800 cursor-pointer">
            {row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageInfo?.color ?? '#ccc' }}></span>
            {stageName}
            <span className="text-muted-foreground font-normal">({row.subRows.length})</span>
          </div>
        );
      }
      return (<div style={{ paddingLeft: `${row.depth * 2}rem` }}><EditableCell row={row} {...props} /></div>);
    },
  },
  { accessorKey: 'email', header: ReorderableHeader, cell: EditableCell, size: 250 },
  { accessorKey: 'mobile', header: ReorderableHeader, cell: PhoneCell, size: 180 },
  { accessorKey: 'linkedin_url', header: ReorderableHeader, cell: LinkedInCell, size: 220 },
  { accessorKey: 'company_name', header: ReorderableHeader, size: 200, cell: CompanyCell },
  { accessorKey: 'job_title', header: ReorderableHeader, cell: EditableCell, size: 200 },
  { accessorKey: 'contact_stage', header: ReorderableHeader, size: 180, cell: StageSelectCell },
  
  { accessorKey: 'created_by_employee', header: "Created By", cell: EmployeeAvatarCell, enableSorting: false, size: 100 },
  { accessorKey: 'updated_by_employee', header: "Updated By", cell: EmployeeAvatarCell, enableSorting: false, size: 100 },
  { accessorKey: 'created_at', header: "Created At", cell: DateCell, enableSorting: true, size: 150 },
  { accessorKey: 'updated_at', header: "Updated At", cell: DateCell, enableSorting: true, size: 150 },
];

// NEW Action Column (to be added at the end)
export const ActionColumn: ColumnDef<SimpleContact> = {
    id: 'actions',
    size: 60,
    cell: ({ row, table }) => {
        const contact = row.original;
        const meta = table.options.meta as any; // Cast to access custom meta properties

        if (row.getIsGrouped()) return null;

        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the contact for <span className="font-bold">{contact.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => meta?.deleteRow(contact.id)} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    },
};