import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, Zap, Globe, ChevronRight } from 'lucide-react';
import { setFilters } from '@/Redux/intelligenceSearchSlice';

export const DiscoveryDashboard = () => {
  const [query, setQuery] = useState('');
  const dispatch = useDispatch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    dispatch(setFilters({ q_keywords: query }));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
      <div className="w-full max-w-3xl space-y-12 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
            <Zap size={40} className="text-white fill-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Professional Discovery</h1>
          <p className="text-slate-500 font-medium">Search across 275M+ verified global profiles.</p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, or company keywords..." 
            className="h-20 pl-14 pr-44 rounded-3xl border-2 border-slate-200 bg-white shadow-2xl text-xl font-bold focus-visible:ring-indigo-500"
          />
          <Button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 h-14 px-8 bg-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">
            Find Professionals
          </Button>
        </form>

        <div className="grid grid-cols-2 gap-8">
           <RecentSearches />
           <GlobalStatsCard />
        </div>
      </div>
    </div>
  );
};

const RecentSearches = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
      <Clock size={14}/> Recent Explorations
    </div>
    <div className="bg-white border rounded-2xl p-4 text-center py-10 border-dashed">
       <p className="text-xs font-bold text-slate-400 italic">History will appear here</p>
    </div>
  </div>
);

const GlobalStatsCard = () => (
  <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
    <Globe className="absolute -right-10 -top-10 w-40 h-40 opacity-10" />
    <h3 className="text-lg font-black mb-2">Global Data Reach</h3>
    <p className="text-indigo-200 text-xs leading-relaxed font-medium mb-4">Access verified emails and direct mobile numbers instantly.</p>
    <div className="flex gap-6">
       <div><p className="text-2xl font-black">275M+</p><p className="text-[9px] font-bold text-indigo-400 uppercase">Profiles</p></div>
       <div className="w-px h-10 bg-indigo-700" />
       <div><p className="text-2xl font-black">1.3M+</p><p className="text-[9px] font-bold text-indigo-400 uppercase">Verified India</p></div>
    </div>
  </div>
);
// 