import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  MapPin,
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { 
  setDiscoveryMode, 
  setFilters, 
  setTargetDestination 
} from '../../../Redux/intelligenceSearchSlice';

interface PeopleSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PeopleSearchDialog: React.FC<PeopleSearchDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { fileId: urlFileId } = useParams();

  // --- Local Form State ---
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedFile, setSelectedFile] = useState(urlFileId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [orgQuery, setOrgQuery] = useState('');
  const [orgMode, setOrgMode] = useState<'include' | 'exclude'>('include');
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // --- External Data Fetching ---
  const { data: fileInfo, isLoading: isFileLoading } = useQuery({
    queryKey: ['workspace-file-info', urlFileId],
    queryFn: async () => {
      if (!urlFileId) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select('workspace_id')
        .eq('id', urlFileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!urlFileId,
  });

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces', organization_id],
    queryFn: async () => (await supabase.from('workspaces').select('id, name')).data,
    enabled: !!organization_id
  });

  const { data: files } = useQuery({
    queryKey: ['workspace-files', selectedWorkspace],
    queryFn: async () => (await supabase.from('workspace_files').select('id, name').eq('workspace_id', selectedWorkspace)).data,
    enabled: !!selectedWorkspace
  });

  useEffect(() => {
    if (fileInfo?.workspace_id) {
      setSelectedWorkspace(fileInfo.workspace_id);
    }
  }, [fileInfo?.workspace_id]);

  const locationOptions = React.useMemo(() => [
    "Ahmedabad, Gujarat", "Bangalore, Karnataka", "Chennai, Tamil Nadu", "Coimbatore, Tamil Nadu", 
    "Delhi, NCR", "Gurgaon, Haryana", "Hyderabad, Telangana", "Kochi, Kerala", "Kolkata, West Bengal", 
    "Mumbai, Maharashtra", "Noida, Uttar Pradesh", "Pune, Maharashtra", "California, USA", "London, UK", "Dubai, UAE"
  ].sort((a, b) => a.localeCompare(b)), []);

  // --- SEARCH EXECUTION ---
  const handleExecuteSearch = () => {
    // 1. Validation: Ensure destination is set
    const finalFileId = selectedFile || urlFileId;
    const finalWorkspaceId = selectedWorkspace || fileInfo?.workspace_id;

    if (!finalFileId || !finalWorkspaceId) {
      toast({ 
        title: "Configuration Required", 
        description: "Please select a target Workspace and File to save discovery results.", 
        variant: "destructive" 
      });
      return;
    }

    // 2. Build Filters
    const apiFilters: any = {
      q_keywords: searchQuery || undefined,
      person_titles: titleQuery ? [titleQuery] : undefined,
      person_locations: locationQuery ? [locationQuery] : undefined,
    };

    if (orgQuery) {
      if (orgMode === 'include') apiFilters.organization_names = [orgQuery];
      else apiFilters.excluded_organization_names = [orgQuery];
    }

    // 3. Dispatch to Redux
    dispatch(setFilters(apiFilters));
    dispatch(setTargetDestination({ 
      workspaceId: finalWorkspaceId, 
      fileId: finalFileId 
    }));
    dispatch(setDiscoveryMode(true));

    // 4. UI Transition
    onOpenChange(false);
    toast({ 
      title: "Discovery Mode Activated", 
      description: "Switching to global professional database view.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            Global Professional Discovery
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Configure filters to search across 275M+ verified professional profiles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destination Config (Shown only if not already in a specific file) */}
          {!urlFileId && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-tighter">Required</Badge>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Destination</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700">Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {workspaces?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700">Target File</Label>
                  <Select value={selectedFile} onValueChange={setSelectedFile} disabled={!selectedWorkspace}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {files?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Search size={12}/> Keywords or Name
              </Label>
              <Input
                placeholder="e.g., Jane Doe, Product Designer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={12}/> Location
              </Label>
              <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-medium h-10">
                    {locationQuery || "Search city/state..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 shadow-2xl" align="start">
                  <Command>
                    <CommandInput placeholder="Filter locations..." value={locationQuery} onValueChange={setLocationQuery} />
                    <CommandList>
                      <CommandEmpty>
                        <Button variant="ghost" className="w-full justify-start text-xs text-indigo-600" onClick={() => setIsLocationOpen(false)}>
                          <Plus size={12} className="mr-2"/> Use custom: "{locationQuery}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        {locationOptions.map((loc) => (
                          <CommandItem key={loc} value={loc} onSelect={(v) => { setLocationQuery(v); setIsLocationOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", locationQuery === loc ? "opacity-100" : "opacity-0")} />
                            {loc}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Briefcase size={12}/> Specific Job Title
              </Label>
              <Input
                placeholder="e.g., Software Engineer"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 size={12}/> Organisation Filter
              </Label>
              <div className="flex gap-2">
                <Select value={orgMode} onValueChange={(v: any) => setOrgMode(v)}>
                  <SelectTrigger className="w-[100px] text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="include">Is</SelectItem>
                    <SelectItem value="exclude">Is Not</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Company Name..."
                  value={orgQuery}
                  onChange={(e) => setOrgQuery(e.target.value)}
                  className="flex-1 h-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button 
            onClick={handleExecuteSearch} 
            className="w-full md:w-auto px-10 bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100"
          >
            LAUNCH DISCOVERY ENGINE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};