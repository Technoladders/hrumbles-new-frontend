import React, { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, createColumnHelper, SortingState
} from '@tanstack/react-table';
import { 
  ChevronLeft, ChevronRight, MoreHorizontal, Mail, Phone, Linkedin, 
  ExternalLink, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCRMStore } from '@/stores/crmStore';
import { useCRMData } from '@/hooks/crm/useCRMData';
import { EditableCell } from './EditableCell'; // Spreadsheet-style input

const columnHelper = createColumnHelper<any>();

export function DataTable() {
  const { viewMode, selectedRows, setSelectedRows, pageSize, setPageSize, currentPage, setCurrentPage } = useCRMStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const { data: result, isLoading } = useCRMData();
  const tableData = result?.data || [];

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      ),
      size: 40,
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (props) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
            {String(props.getValue()).charAt(0)}
          </div>
          <EditableCell {...props} />
        </div>
      ),
      size: 200,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-green-50 text-green-600"><CheckCircle2 size={12}/></div>
          <span className="text-xs text-slate-500 truncate max-w-[120px]">{row.original.email || 'N/A'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('job_title', {
      header: 'Title',
      cell: EditableCell,
    }),
    columnHelper.accessor('contact_stage', {
        header: 'Stage',
        cell: ({ getValue }) => (
            <div className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 inline-block">
                {String(getValue())}
            </div>
        )
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Connect',
      cell: () => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600"><Mail size={14} /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600"><Linkedin size={14} /></Button>
        </div>
      )
    })
  ], []);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, rowSelection: selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {}) },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
        const next = typeof updater === 'function' ? updater(selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {})) : updater;
        setSelectedRows(Object.keys(next).filter(k => next[k]));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) return <div className="h-full w-full flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-auto border-x border-slate-100 relative">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={`group hover:bg-slate-50/80 transition-colors ${row.getIsSelected() ? 'bg-indigo-50/50' : ''}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <span>{tableData.length} records found</span>
          <div className="flex items-center gap-2">
            <span>Show:</span>
            <select className="border rounded px-1 h-7 bg-white outline-none" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs font-bold text-slate-700 mx-2">Page {currentPage}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(currentPage + 1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}