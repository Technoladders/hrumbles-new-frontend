import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  PhoneCall, StickyNote, Layers, Clock, 
  Trash2, Plus, Filter, MessageSquare 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export const ActivityTimelineTab = ({ contact, onAddNote }: any) => {
  const activities = (contact?.contact_activities || []).sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Interaction History</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[11px] font-black border-slate-200">
            <Filter size={14} className="mr-2 text-slate-400"/> FILTER
          </Button>
          <Button size="sm" onClick={onAddNote} className="h-8 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 shadow-md">
            <Plus size={14} className="mr-1.5"/> ADD NOTE
          </Button>
        </div>
      </div>

      <div className="relative space-y-4">
        {activities.length > 0 ? activities.map((activity: any) => (
          <TimelineItem key={activity.id} activity={activity} />
        )) : (
          <div className="bg-white rounded-2xl border-2 border-dashed p-16 text-center shadow-sm">
            <Clock className="mx-auto text-slate-200 mb-4" size={48}/>
            <p className="text-slate-500 font-bold">No engagement logs recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Activities like calls and notes will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineItem = ({ activity }: any) => {
  const isCall = activity.type === 'call';
  const isStage = activity.type === 'stage_change';
  
  return (
    <div className="relative pl-12 pb-8 last:pb-0 before:absolute before:left-5 before:top-10 before:bottom-0 before:w-[2px] before:bg-slate-100 last:before:hidden">
      <div className={cn(
        "absolute left-0 top-0 h-10 w-10 rounded-xl border-4 border-white shadow-md flex items-center justify-center transition-transform hover:scale-110",
        isCall ? "bg-amber-500 text-white" : isStage ? "bg-indigo-600 text-white" : "bg-blue-500 text-white"
      )}>
        {isCall ? <PhoneCall size={18}/> : isStage ? <Layers size={18}/> : <StickyNote size={18}/>}
      </div>
      
      <Card className="border-none shadow-sm group">
        <CardContent className="p-5">
           <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                {activity.title}
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
                {formatDistanceToNow(new Date(activity.created_at))} ago
              </span>
           </div>

           {isCall && (
             <div className="flex gap-4 mb-3">
                <Badge variant="outline" className="text-[9px] font-black uppercase text-amber-700 bg-amber-50/50 border-amber-100">
                  Type: {activity.purpose || 'Discovery'}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-600 bg-slate-50 border-slate-200">
                  Outcome: {activity.disposition || 'Connected'}
                </Badge>
             </div>
           )}

           <p className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-line bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
             {activity.description || 'No additional details provided.'}
           </p>

           <div className="mt-4 flex items-center justify-between border-t pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                 <Avatar className="h-5 w-5 border">
                    <AvatarFallback className="text-[8px] bg-slate-900 text-white font-bold">S</AvatarFallback>
                 </Avatar>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                   Authenticated Internal Action
                 </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 size={12}/>
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};