import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Mail, Phone, Plus, ListPlus, Building2, 
  ChevronRight, Clock, Sparkles, ShieldCheck 
} from 'lucide-react';
import { DiscoveryResultsTable } from './DiscoveryResultsTable';

export const DiscoveryEngine = () => {
  const { isDiscoveryMode, recentSearches } = useSelector((state: any) => state.intelligenceSearch);
  const [query, setQuery] = React.useState('');

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {!isDiscoveryMode ? (
        // DASHBOARD VIEW (Image 4)
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10">
          <div className="text-center space-y-4">
             <div className="h-20 w-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
                <Search className="text-white h-10 w-10" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Discovery</h2>
             <p className="text-slate-500 max-w-md mx-auto">Search across 275M+ verified professional profiles using AI-powered filters.</p>
          </div>

          <div className="w-full max-w-3xl space-y-6">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <Input 
                  placeholder="Example: List people from New York in the software sector..." 
                  className="h-16 pl-12 pr-6 rounded-2xl border-2 border-slate-200 bg-white shadow-xl text-lg font-medium focus-visible:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && /* trigger search */}
                />
             </div>

             {/* Recent Searches Section */}
             <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                   <Clock size={14} className="text-slate-400"/>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recently Explored</span>
                </div>
                {recentSearches.map((s: any, i: number) => (
                  <button key={i} className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group">
                     <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-slate-50 text-slate-500">{s.filterCount} Filters</Badge>
                        <span className="text-sm font-bold text-slate-700">{s.label}</span>
                     </div>
                     <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
          </div>
        </div>
      ) : (
        // RESULTS VIEW (Image 5)
        <DiscoveryResultsTable />
      )}
    </div>
  );
};