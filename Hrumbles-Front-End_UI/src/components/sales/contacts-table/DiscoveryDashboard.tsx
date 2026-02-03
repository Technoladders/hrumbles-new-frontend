import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Clock, ChevronRight, Sparkles, 
  UserSearch, Globe, Database, Zap
} from 'lucide-react';
import { setDiscoveryMode, setFilters } from '@/Redux/intelligenceSearchSlice';

export const DiscoveryDashboard = () => {
  const dispatch = useDispatch();
  const { recentSearches } = useSelector((state: any) => state.intelligenceSearch || { recentSearches: [] });
  const [query, setQuery] = useState('');

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    dispatch(setFilters({ q_keywords: query.trim() }));
    dispatch(setDiscoveryMode(true));
  };

  const handleRecentClick = (filter: any) => {
    dispatch(setFilters(filter));
    dispatch(setDiscoveryMode(true));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="w-full max-w-3xl space-y-12">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
            <Zap className="text-white h-10 w-10 fill-white" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Discovery Engine</h2>
          <p className="text-slate-500 font-medium text-lg">
            Access 275M+ verified professionals. Find your next ideal prospect.
          </p>
        </div>

        {/* Central Search Bar */}
        <form onSubmit={handleQuickSearch} className="relative group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-6 h-6" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. List software engineers in Bangalore who use React..." 
              className="h-20 pl-14 pr-6 rounded-3xl border-2 border-slate-200 bg-white shadow-2xl text-xl font-bold placeholder:text-slate-300 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
            />
            <Button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-14 px-8 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Search Database
            </Button>
          </div>
        </form>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Clock size={14} className="text-slate-400"/>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Explorations</span>
            </div>
            
            <div className="space-y-2">
              {recentSearches.length > 0 ? recentSearches.map((s: any, i: number) => (
                <button 
                  key={i} 
                  onClick={() => handleRecentClick(s.filters)}
                  className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50">
                      <Search size={14} className="text-slate-400 group-hover:text-indigo-600"/>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-700">{s.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{s.timeAgo}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600" />
                </button>
              )) : (
                <div className="p-8 border-2 border-dashed rounded-3xl text-center">
                  <p className="text-xs font-bold text-slate-400 italic">No recent history</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Sparkles size={14} className="text-amber-500"/>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Insights</span>
            </div>
            <Card className="border-none shadow-sm bg-indigo-900 text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe size={120} />
              </div>
              <CardContent className="p-8 relative z-10 space-y-4">
                <h4 className="text-lg font-black leading-tight">Your Discovery potential is unlimited.</h4>
                <p className="text-indigo-200 text-xs font-medium leading-relaxed">
                  Start searching to find verified email addresses, direct mobile numbers, and technographic data for over 73 million companies.
                </p>
                <div className="flex gap-4 pt-2">
                   <div className="text-center">
                      <p className="text-xl font-black">275M+</p>
                      <p className="text-[8px] uppercase font-bold text-indigo-400">People</p>
                   </div>
                   <div className="h-8 w-px bg-indigo-700" />
                   <div className="text-center">
                      <p className="text-xl font-black">1.3M+</p>
                      <p className="text-[8px] uppercase font-bold text-indigo-400">Verified India</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};