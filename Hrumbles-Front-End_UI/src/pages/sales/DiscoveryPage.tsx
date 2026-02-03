import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DiscoverySidebar } from '@/components/sales/discovery/DiscoverySidebar';
import { DiscoveryDashboard } from '@/components/sales/discovery/DiscoveryDashboard';
import { DiscoveryResultsTable } from '@/components/sales/discovery/DiscoveryResultsTable';
import { SavedContactsTable } from '@/components/sales/discovery/SavedContactsTable';
import { UnifiedDiscoveryTable } from '@/components/sales/discovery/UnifiedDiscoveryTable';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap } from 'lucide-react';
// FIX: Added setViewMode to the imports
import { setDiscoveryMode, setViewMode } from '@/Redux/intelligenceSearchSlice'; 
import { cn } from '@/lib/utils';

const DiscoveryPage = () => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const { viewMode, isDiscoveryMode, results } = useSelector(
    (state: any) => state.intelligenceSearch || { viewMode: 'discovery', isDiscoveryMode: false, results: [] }
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#F1F5F9]">
      {/* 1. PINNED SIDEBAR */}
      <aside className="w-[220px] flex-shrink-0 border-r bg-white shadow-xl z-20">
        <DiscoverySidebar />
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER BAR */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Find Professionals</h1>
            
            {/* TOGGLE SWITCH */}
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
              <button 
                onClick={() => dispatch(setViewMode('discovery'))}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2",
                  viewMode === 'discovery' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Search View
                {results?.length > 0 && (
                  <Badge className="bg-indigo-50 text-indigo-600 text-[9px] h-4 px-1.5 border-none">
                    {results.length}
                  </Badge>
                )}
              </button>
              <button 
                onClick={() => dispatch(setViewMode('saved'))}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                  viewMode === 'saved' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Saved Contacts
              </button>
            </div>
          </div>

          {/* <div className="flex items-center gap-3">
             <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full border border-orange-100 flex items-center gap-2 shadow-sm">
                <Zap size={14} className="fill-orange-500" />
                <span className="text-[11px] font-black uppercase">34 / 41 Credits</span>
             </div>
             <Button className="bg-indigo-600 hover:bg-indigo-700 font-black text-xs px-6">
                Execute with AI
             </Button>
          </div> */}
        </header>

        {/* DYNAMIC CONTENT AREA */}
       <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
     {/* If searching, show table. If Dashboard state, show Dashboard */}
     {isDiscoveryMode || viewMode === 'saved' ? (
       <UnifiedDiscoveryTable />
     ) : (
       <DiscoveryDashboard />
     )}
  </div>
      </main>
    </div>
  );
};

export default DiscoveryPage;