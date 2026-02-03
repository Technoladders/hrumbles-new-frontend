import React, { useState, useMemo } from 'react';
import { 
  Phone, StickyNote, Mail, Calendar, CheckSquare, 
  Search, Filter, ChevronDown, ChevronRight, MoreHorizontal,
  Clock, CheckCircle2, AlertCircle, ArrowUpRight, User,
  ChevronUp
} from 'lucide-react';
import { format, isFuture, isPast, parseISO, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Types ---
type ActivityType = 'all' | 'note' | 'call' | 'email' | 'task' | 'meeting' | 'stage_change';

interface ActivityTimelineProps {
  contact: any;
  onOpenModal: (type: 'note' | 'call' | 'email' | 'task' | 'meeting') => void;
}

// --- Helper Functions ---

// Safe JSON parser for the metadata field which might come as string or object
const parseMetadata = (meta: any) => {
  if (!meta) return {};
  if (typeof meta === 'object') return meta;
  try {
    return JSON.parse(meta);
  } catch (e) {
    return {};
  }
};

// --- Main Component ---

export const ActivityTimelineTab: React.FC<ActivityTimelineProps> = ({ contact, onOpenModal }) => {
  const [activeTab, setActiveTab] = useState<ActivityType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 1. Process and Sort Data
  const groupedActivities = useMemo(() => {
    const rawActivities = contact?.contact_activities || [];
    
    // Filter first
    const filtered = rawActivities.filter((act: any) => {
      // Tab Filter
      if (activeTab !== 'all' && act.type !== activeTab) return false;
      
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const meta = parseMetadata(act.metadata);
        return (
          act.title?.toLowerCase().includes(q) || 
          act.description?.toLowerCase().includes(q) ||
          meta.outcome?.toLowerCase().includes(q)
        );
      }

      // Checkbox Filter
      if (activeTab === 'all' && filterType.length > 0 && !filterType.includes(act.type)) {
        return false;
      }
      return true;
    });

    // Grouping Buckets
    const groups = {
      overdue: [] as any[],
      upcoming: [] as any[],
      months: {} as Record<string, any[]>
    };

    filtered.forEach((act: any) => {
      // Use activity_date (custom column) or created_at as fallback
      const dateStr = act.activity_date || act.created_at;
      const date = new Date(dateStr);
      const meta = parseMetadata(act.metadata);
      const isTask = act.type === 'task';
      const isCompleted = act.status === 'completed' || meta.status === 'completed';

      // Logic for Overdue vs Upcoming vs Past
      if (isTask && !isCompleted && isPast(date)) {
        groups.overdue.push(act);
      } else if (isFuture(date)) {
        groups.upcoming.push(act);
      } else {
        // Past / Completed activities grouped by Month
        const monthKey = format(date, 'MMMM yyyy');
        if (!groups.months[monthKey]) groups.months[monthKey] = [];
        groups.months[monthKey].push(act);
      }
    });

    // Sort within groups
    groups.overdue.sort((a, b) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime()); // Ascending for overdue
    groups.upcoming.sort((a, b) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime()); // Ascending for upcoming
    
    // Sort months descending
    const sortedMonthKeys = Object.keys(groups.months).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    // Sort items within months descending
    sortedMonthKeys.forEach(key => {
      groups.months[key].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return { ...groups, sortedMonthKeys };
  }, [contact, activeTab, searchQuery, filterType]);

  // --- Handlers ---
  const toggleMonth = (month: string) => {
    const newSet = new Set(collapsedMonths);
    if (newSet.has(month)) newSet.delete(month);
    else newSet.add(month);
    setCollapsedMonths(newSet);
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedItems(newSet);
  };

  const collapseAll = () => {
    // If all expanded, collapse all. Else expand all within reason.
    // For this UI, "Collapse all" usually means closing the accordion details of items
    setExpandedItems(new Set());
  };

  const totalCount = (contact?.contact_activities || []).length;

  return (
    <div className="flex flex-col space-y-4 font-sans text-slate-600">
      
      {/* 1. Header & Filters */}
      <div className="flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityType)} className="w-full">
           <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
             {['all', 'note', 'email', 'call', 'task', 'meeting'].map((tab) => (
               <TabsTrigger 
                 key={tab} 
                 value={tab}
                 className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
               >
                {tab === 'all' 
          ? 'All Activity' 
          : tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
               </TabsTrigger>
             ))}
           </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter by:</span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-teal-600 font-semibold hover:text-teal-700 hover:bg-teal-50">
                  Filter activity ({totalCount}) <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {['note', 'email', 'call', 'task', 'meeting'].map((t) => (
                  <DropdownMenuCheckboxItem 
                    key={t}
                    checked={filterType.includes(t)}
                    onCheckedChange={(c) => c ? setFilterType([...filterType, t]) : setFilterType(filterType.filter(x => x !== t))}
                    className="capitalize"
                  >
                    {t}s
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="h-8 text-teal-600 font-semibold hover:text-teal-700 hover:bg-teal-50">
              All users <ChevronDown size={14} className="ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <Input 
                 placeholder="Search activity..." 
                 className="pl-8 h-8 text-xs bg-white border-slate-200 focus:border-teal-500"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <Button variant="ghost" size="sm" onClick={collapseAll} className="h-8 px-2 text-xs text-slate-400 hover:text-slate-600">
               Collapse all
             </Button>
          </div>
        </div>
      </div>

      {/* 2. Timeline Content */}
      <div className="relative min-h-[400px]">
        {/* Vertical Line for the whole timeline */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 z-0" />

        {/* SECTION: OVERDUE */}
        {groupedActivities.overdue.length > 0 && (
          <div className="mb-8 relative z-10">
            <div className="flex items-center gap-2 mb-4 bg-slate-100 py-1 px-2 rounded w-fit ml-4">
              <AlertCircle size={14} className="text-red-500" />
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide">Overdue</h3>
            </div>
            <div className="space-y-4">
              {groupedActivities.overdue.map(act => (
                <TimelineCard 
                  key={act.id} 
                  activity={act} 
                  expanded={expandedItems.has(act.id)}
                  onToggle={() => toggleItem(act.id)}
                  isOverdue={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION: UPCOMING */}
        {groupedActivities.upcoming.length > 0 && (
          <div className="mb-8 relative z-10">
             <h3 className="text-sm font-semibold text-slate-500 mb-4 ml-14">Upcoming</h3>
             <div className="space-y-4">
               {groupedActivities.upcoming.map(act => (
                 <TimelineCard 
                    key={act.id} 
                    activity={act} 
                    expanded={expandedItems.has(act.id)}
                    onToggle={() => toggleItem(act.id)}
                  />
               ))}
             </div>
          </div>
        )}

        {/* SECTION: MONTHLY GROUPS */}
        {groupedActivities.sortedMonthKeys.map((month) => (
          <div key={month} className="mb-8 relative z-10">
            <div 
              className="flex items-center gap-2 mb-4 ml-12 cursor-pointer group"
              onClick={() => toggleMonth(month)}
            >
              <h3 className="text-sm font-bold text-slate-700">{month}</h3>
              <div className="h-px bg-slate-200 flex-1 group-hover:bg-slate-300 transition-colors" />
              <ChevronDown 
                size={14} 
                className={cn("text-slate-400 transition-transform", collapsedMonths.has(month) && "-rotate-90")} 
              />
            </div>

            {!collapsedMonths.has(month) && (
              <div className="space-y-4">
                {groupedActivities.months[month].map(act => (
                  <TimelineCard 
                    key={act.id} 
                    activity={act} 
                    expanded={expandedItems.has(act.id)}
                    onToggle={() => toggleItem(act.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 ml-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
             <div className="bg-white p-4 rounded-full shadow-sm mb-3">
               <Clock className="text-slate-300" size={32} />
             </div>
             <p className="text-slate-600 font-semibold">No activity found</p>
             <p className="text-xs text-slate-400 mt-1">Try changing filters or log a new activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Timeline Card Component ---

const TimelineCard = ({ activity, expanded, onToggle, isOverdue }: any) => {
  const metadata = parseMetadata(activity.metadata);
  const date = new Date(activity.activity_date || activity.created_at);
  const creator = activity.creator || {}; // Assuming joined from backend

  // Configuration map for Icons and Colors based on HubSpot style
  const config: Record<string, any> = {
    task: { 
      icon: CheckCircle2, 
      color: isOverdue ? "text-red-500 bg-white" : "text-emerald-500 bg-white",
      label: "Task"
    },
    call: { 
      icon: Phone, 
      color: "text-amber-600 bg-white",
      label: "Logged call"
    },
    email: { 
      icon: Mail, 
      color: "text-slate-600 bg-white",
      label: "Email sent"
    },
    meeting: { 
      icon: Calendar, 
      color: "text-red-500 bg-white",
      label: "Meeting"
    },
    note: { 
      icon: StickyNote, 
      color: "text-yellow-500 bg-white",
      label: "Note"
    },
    stage_change: { 
      icon: ArrowUpRight, 
      color: "text-blue-500 bg-white",
      label: "Lifecycle change"
    }
  };

  const typeConfig = config[activity.type] || { icon: CheckSquare, color: "text-slate-400", label: "Activity" };
  const Icon = typeConfig.icon;

  // Formatting the Title/Header based on Type
  const renderHeader = () => {
    switch (activity.type) {
      case 'call':
        return (
          <span className="text-sm font-semibold text-slate-800">
            {activity.title || 'Logged call'}
            {metadata.outcome && <span className="font-normal text-slate-500"> - {metadata.outcome}</span>}
          </span>
        );
      case 'task':
        return (
          <span className={cn("text-sm font-semibold", isOverdue ? "text-slate-900" : "text-slate-800")}>
            {activity.title}
          </span>
        );
      case 'meeting':
        return (
          <span className="text-sm font-semibold text-slate-800">
            Meeting - {activity.title}
          </span>
        );
      case 'stage_change':
        return (
          <span className="text-sm font-bold text-slate-800">
            Lifecycle change
          </span>
        );
      default:
        return <span className="text-sm font-semibold text-slate-800">{activity.title || typeConfig.label}</span>;
    }
  };

  return (
    <div className="group relative pl-12 transition-all">
      {/* Icon Bubble */}
      <div className={cn(
        "absolute left-3 top-0 h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center z-20 shadow-sm",
        typeConfig.color,
        activity.type === 'task' && !isOverdue && "border-emerald-500" // Checkbox style for tasks
      )}>
        <Icon size={14} />
      </div>

      <Card className={cn(
        "border-slate-200 shadow-sm transition-all hover:shadow-md", 
        expanded ? "ring-1 ring-teal-500 border-teal-500" : "hover:border-slate-300"
      )}>
        {/* Card Header (Always Visible) */}
        <div 
          className="p-4 flex items-start justify-between cursor-pointer" 
          onClick={onToggle}
        >
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
               {/* Type Label (e.g. "Logged call") */}
               <span className="text-xs font-bold text-slate-700 capitalize">
                 {typeConfig.label}
               </span>
            </div>

            {/* Main Title Row */}
            <div className="flex items-center gap-2">
              {creator.first_name && (
                <span className="text-sm font-semibold text-teal-600 hover:underline">
                  {creator.first_name} {creator.last_name}
                </span>
              )}
              {activity.type === 'stage_change' ? (
                <span className="text-sm text-slate-600">
                   {activity.description} 
                   <span className="text-teal-600 font-semibold cursor-pointer ml-1 inline-flex items-center">
                     View details <ArrowUpRight size={10} className="ml-0.5" />
                   </span>
                </span>
              ) : (
                <div className="flex flex-col">
                  {renderHeader()}
                  {!expanded && activity.description && (
                    <span className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium">
                      {activity.description.replace(/<[^>]*>?/gm, '')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Metadata */}
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-xs text-slate-400">
               {isOverdue && (
                 <span className="text-red-600 font-semibold flex items-center gap-1">
                   <Calendar size={10} /> Overdue: {format(date, "MMM d, h:mm a")}
                 </span>
               )}
               {!isOverdue && (
                 <span>{format(date, "MMM d, yyyy 'at' h:mm a")}</span>
               )}
             </div>
             <div className={cn("transition-transform duration-200", expanded && "rotate-180")}>
               <ChevronDown size={14} className="text-slate-400" />
             </div>
          </div>
        </div>

        {/* Expandable Content */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100/50 bg-slate-50/30 rounded-b-xl">
             <div className="pt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
               {activity.description}
             </div>
             
             {/* Dynamic Metadata Rendering */}
             <div className="mt-4 flex flex-wrap gap-2">
                {metadata.outcome && (
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-normal">
                    Outcome: <span className="font-semibold ml-1 capitalize">{metadata.outcome}</span>
                  </Badge>
                )}
                {metadata.duration && (
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-normal">
                    Duration: <span className="font-semibold ml-1">{metadata.duration} min</span>
                  </Badge>
                )}
                {metadata.priority && (
                  <Badge variant="outline" className={cn(
                    "bg-white border-slate-200 font-normal",
                    metadata.priority === 'high' ? "text-red-600" : "text-slate-600"
                  )}>
                    Priority: <span className="font-semibold ml-1 capitalize">{metadata.priority}</span>
                  </Badge>
                )}
             </div>

             <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={creator.profile_picture_url} />
                    <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                      {creator.first_name?.[0]}{creator.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-slate-400">
                    Created by {creator.first_name || 'System'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                    Delete
                  </Button>
                </div>
             </div>
          </div>
        )}
      </Card>
    </div>
  );
};
// claude 5 UI