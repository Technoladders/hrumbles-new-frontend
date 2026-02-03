import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { searchPeopleInDiscovery } from '@/services/sales/apolloSearch';
import { 
  Mail, Phone, Building2, Plus, 
  ChevronLeft, ChevronRight, Info, 
  ChevronsLeft, ChevronsRight, Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { setPage } from '@/Redux/intelligenceSearchSlice';

export const DiscoveryResultsTable = ({ onAdd }: any) => {
  const dispatch = useDispatch();
  const { filters, currentPage, perPage } = useSelector((state: any) => state.intelligenceSearch || {});

  const { data, isLoading, isPlaceholderData, isFetching } = useQuery({
    queryKey: ['global-discovery', filters, currentPage],
    queryFn: () => searchPeopleInDiscovery(filters, currentPage, perPage),
    enabled: !!filters,
    placeholderData: (previousData) => previousData,
  });

  if (isLoading && !isPlaceholderData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Querying Global Database...</p>
      </div>
    );
  }

  const totalEntries = data?.total_entries || 0;
  const browseableLimit = 50000; // API limit
  const displayTotal = Math.min(totalEntries, browseableLimit);
  const totalPages = Math.ceil(displayTotal / perPage);

  const startRange = ((currentPage - 1) * perPage) + 1;
  const endRange = Math.min(currentPage * perPage, totalEntries);

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 1. DATA STATUS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <Info size={16} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Discovery Results</p>
            <p className="text-xs font-bold text-slate-700 mt-1">
              Found {totalEntries.toLocaleString()} professional matches
            </p>
          </div>
        </div>
        
        {totalEntries > browseableLimit && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black h-6">
            BROWSING LIMIT: 50,000 RECORDS
          </Badge>
        )}
      </div>

      {/* 2. SCROLLABLE TABLE CONTAINER */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-40">
              <tr className="bg-slate-900 text-white">
                {/* STICKY HEADER FOR FIRST COL */}
                <th className="sticky left-0 z-50 bg-slate-900 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Professional Identity
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">Organisation</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10">Availability</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.people?.map((person: any) => (
                <tr key={person.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* STICKY FIRST COLUMN */}
                  <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 px-6 py-4 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm flex-shrink-0">
                        <AvatarImage src={person.photo_url} />
                        <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">{person.first_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {person.first_name} {person.last_name_obfuscated}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold truncate leading-tight mt-0.5 max-w-[200px]">
                          {person.title}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="text-xs font-black truncate max-w-[180px]">{person.organization?.name || 'N/A'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-6">
                      <DataBadge active={person.has_email} label="EMAIL" icon={<Mail size={12}/>} />
                      <DataBadge active={person.has_direct_phone === "Yes"} label="PHONE" icon={<Phone size={12}/>} />
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => onAdd(person)}
                      className="h-8 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 px-5"
                    >
                      <Plus size={14} className="mr-1.5" /> ADD TO CRM
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. PINNED PAGINATION FOOTER */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between">
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Displaying Range</p>
            <p className="text-xs font-bold text-slate-700">
              {startRange.toLocaleString()} — {endRange.toLocaleString()} of {totalEntries.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <PaginationButton 
                onClick={() => dispatch(setPage(1))} 
                disabled={currentPage === 1} 
                icon={<ChevronsLeft size={16}/>} 
                tooltip="First Page" 
            />
            <PaginationButton 
                onClick={() => dispatch(setPage(currentPage - 1))} 
                disabled={currentPage === 1} 
                icon={<ChevronLeft size={16}/>} 
                label="Prev" 
            />
            
            <div className="mx-2 px-4 py-1.5 bg-slate-900 rounded-xl text-[10px] font-black text-white shadow-lg min-w-[100px] text-center">
              PAGE {currentPage} / {totalPages}
            </div>

            <PaginationButton 
                onClick={() => dispatch(setPage(currentPage + 1))} 
                disabled={currentPage >= totalPages} 
                icon={<ChevronRight size={16}/>} 
                label="Next" 
            />
            <PaginationButton 
                onClick={() => dispatch(setPage(totalPages))} 
                disabled={currentPage >= totalPages} 
                icon={<ChevronsRight size={16}/>} 
                tooltip="Last Page" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- SMALL ATOMS --- */

const DataBadge = ({ active, label, icon }: any) => (
  <div className={cn("flex flex-col items-center gap-1 transition-all", active ? "opacity-100" : "opacity-20")}>
    <div className={cn("p-1.5 rounded-full", active ? "bg-green-50 text-green-600 border border-green-100" : "bg-slate-100 text-slate-400")}>
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </div>
);

const PaginationButton = ({ onClick, disabled, icon, label, tooltip }: any) => (
  <Button
    variant="outline"
    size="sm"
    disabled={disabled}
    onClick={onClick}
    className="h-8 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30 px-3 transition-all"
    title={tooltip}
  >
    {icon}
    {label && <span className="ml-1.5 text-[10px] font-black uppercase">{label}</span>}
  </Button>
);