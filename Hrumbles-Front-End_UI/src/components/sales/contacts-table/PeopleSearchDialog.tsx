// src/components/sales/contacts-table/PeopleSearchDialog.tsx
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  UserPlus,
  Building2,
  MapPin,
  Mail,
  Linkedin,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import {
  searchPeopleInApollo,
  saveSearchResultToContacts,
  type ApolloSearchPerson,
  type ApolloSearchFilters,
} from '@/services/apolloSearch';

interface PeopleSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PeopleSearchDialog: React.FC<PeopleSearchDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
    const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
const { fileId: urlFileId } = useParams();
const [selectedWorkspace, setSelectedWorkspace] = React.useState('');
const [selectedFile, setSelectedFile] = React.useState(urlFileId || '');

// NEW: Fetch workspace_id from workspace_files if urlFileId is provided
const { data: fileInfo, isLoading: isFileLoading } = useQuery({
  queryKey: ['workspace-file-info', urlFileId],
  queryFn: async () => {
    if (!urlFileId) return null;
    const { data, error } = await supabase
      .from('workspace_files')
      .select('workspace_id')
      .eq('id', urlFileId)
      .single();
    if (error) {
      console.error('Failed to fetch workspace for file:', error);
      throw error; // Will trigger query error handling if needed
    }
    return data;
  },
  enabled: !!urlFileId,
});

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces', organization_id],
    queryFn: async () => (await supabase.from('workspaces').select('id, name')).data
  });
  const { data: files } = useQuery({
    queryKey: ['workspace-files', selectedWorkspace],
    queryFn: async () => (await supabase.from('workspace_files').select('id, name').eq('workspace_id', selectedWorkspace)).data,
    enabled: !!selectedWorkspace
  });

// NEW: Auto-set selectedWorkspace when fileInfo loads
useEffect(() => {
  if (fileInfo?.workspace_id) {
    setSelectedWorkspace(fileInfo.workspace_id);
  }
}, [fileInfo?.workspace_id]);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = React.useState('');
  const [titleQuery, setTitleQuery] = React.useState('');
  const [locationQuery, setLocationQuery] = React.useState('');
  const [orgQuery, setOrgQuery] = React.useState('');
  const [orgMode, setOrgMode] = React.useState<'include' | 'exclude'>('include');
  const [isLocationOpen, setIsLocationOpen] = React.useState(false);

  // Expanded Comprehensive Location List (States & Cities)
  const locationOptions = React.useMemo(() => [
    // States
    "Andhra Pradesh, India", "Arunachal Pradesh, India", "Assam, India", "Bihar, India", "Chhattisgarh, India", 
    "Goa, India", "Gujarat, India", "Haryana, India", "Himachal Pradesh, India", "Jharkhand, India", 
    "Karnataka, India", "Kerala, India", "Madhya Pradesh, India", "Maharashtra, India", "Manipur, India", 
    "Meghalaya, India", "Mizoram, India", "Nagaland, India", "Odisha, India", "Punjab, India", 
    "Rajasthan, India", "Sikkim, India", "Tamil Nadu, India", "Telangana, India", "Tripura, India", 
    "Uttar Pradesh, India", "Uttarakhand, India", "West Bengal, India",
    // Major & Tier 2 Cities
    "Ahmedabad, Gujarat", "Amritsar, Punjab", "Bangalore, Karnataka", "Bhopal, Madhya Pradesh", 
    "Bhubaneswar, Odisha", "Chandigarh, India", "Chennai, Tamil Nadu", "Coimbatore, Tamil Nadu", 
    "Dehradun, Uttarakhand", "Delhi, NCR", "Erode, Tamil Nadu", "Faridabad, Haryana", "Ghaziabad, Uttar Pradesh", 
    "Gurgaon, Haryana", "Guwahati, Assam", "Gwalior, Madhya Pradesh", "Hubli, Karnataka", "Hyderabad, Telangana", 
    "Indore, Madhya Pradesh", "Jabalpur, Madhya Pradesh", "Jaipur, Rajasthan", "Jalandhar, Punjab", 
    "Jammu, J&K", "Jamshedpur, Jharkhand", "Jodhpur, Rajasthan", "Kanpur, Uttar Pradesh", "Karur, Tamil Nadu", 
    "Kochi, Kerala", "Kolkata, West Bengal", "Lucknow, Uttar Pradesh", "Ludhiana, Punjab", "Madurai, Tamil Nadu", 
    "Mangalore, Karnataka", "Meerut, Uttar Pradesh", "Mumbai, Maharashtra", "Mysore, Karnataka", "Nagpur, Maharashtra", 
    "Nashik, Maharashtra", "Noida, Uttar Pradesh", "Patna, Bihar", "Pondicherry, India", "Pune, Maharashtra", 
    "Raipur, Chhattisgarh", "Rajkot, Gujarat", "Ranchi, Jharkhand", "Salem, Tamil Nadu", "Shimla, Himachal Pradesh", 
    "Surat, Gujarat", "Thane, Maharashtra", "Thiruvananthapuram, Kerala", "Tirunelveli, Tamil Nadu", 
    "Tirupur, Tamil Nadu", "Trichy, Tamil Nadu", "Udaipur, Rajasthan", "Vadodara, Gujarat", "Varanasi, Uttar Pradesh", 
    "Vijayawada, Andhra Pradesh", "Visakhapatnam, Andhra Pradesh", "Warangal, Telangana"
  ].sort((a, b) => a.localeCompare(b)), []);

  const [filters, setFilters] = React.useState<ApolloSearchFilters>({
    person_titles: [],
    q_keywords: '',
  });
  const [hasSearched, setHasSearched] = React.useState(false);

  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['apolloSearch', filters],
    queryFn: () => searchPeopleInApollo(filters, 1, 20),
    enabled: false,
  });

const saveMutation = useMutation({
  mutationFn: async (person: ApolloSearchPerson) => {

    const resolvedWorkspace = selectedWorkspace || fileInfo?.workspace_id;
    if (!resolvedWorkspace) {
      throw new Error('Workspace ID is required but not available.');
    }
    // FIX: Pass all 5 required arguments
    const result = await saveSearchResultToContacts(
      person, 
      organization_id, 
      resolvedWorkspace,  // Use resolved value
      selectedFile || urlFileId,  // Ensure file ID is always passed
      user?.id // Pass the logged-in user ID
    );
    return result;
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] }); // Match your query key
    toast({ title: 'Contact Added! 🎉', description: 'Person has been added to your contacts.' });
  },
  onError: (error: any) => {
    toast({ title: 'Failed to Add Contact', description: error.message, variant: 'destructive' });
  },
});

  const handleSearch = () => {
    const newFilters: ApolloSearchFilters = {};
    if (searchQuery.trim()) newFilters.q_keywords = searchQuery.trim();
    if (titleQuery.trim()) newFilters.person_titles = titleQuery.split(',').map(t => t.trim());
    if (locationQuery.trim()) newFilters.person_locations = [locationQuery.trim()];
    
    if (orgQuery.trim()) {
      const orgs = orgQuery.split(',').map(o => o.trim());
      if (orgMode === 'include') {
        newFilters.organization_names = orgs;
      } else {
        (newFilters as any).excluded_organization_names = orgs;
      }
    }

    setFilters(newFilters);
    setHasSearched(true);
    refetch();
  };

const handleAddContact = (person: ApolloSearchPerson) => {
  if (!selectedFile && !urlFileId) {
    toast({ title: "Action Required", description: "Please select a workspace and file first.", variant: "destructive" });
    return;
  }
  // NEW: Quick check for file loading (brief UX feedback if fetching workspace)
  if (urlFileId && isFileLoading) {
    toast({ title: "Loading", description: "Fetching file details...", variant: "default" });
    return;
  }
  saveMutation.mutate(person);
};

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search People in Apollo.io
          </DialogTitle>
          <DialogDescription>
            Find and add new contacts from Apollo.io's database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keywords */}
            <div>
              <Label htmlFor="search">Name or Keywords</Label>
              <Input
                id="search"
                placeholder="e.g., John Smith, Software"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* ENHANCED Location Searchable Dropdown */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </Label>
              <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="justify-between font-normal text-left h-10 overflow-hidden"
                  >
                    {locationQuery ? locationQuery : "Select city or state..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Type a city or state..." 
                      value={locationQuery}
                      onValueChange={(val) => setLocationQuery(val)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && locationQuery) {
                           setIsLocationOpen(false);
                           handleSearch();
                        }
                      }}
                    />
                    <CommandList>
                      {/* Allow custom entry if not in list (e.g., Karur) */}
                      <CommandEmpty>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-xs text-purple-600"
                          onClick={() => setIsLocationOpen(false)}
                        >
                          <Plus className="mr-2 h-3 w-3" /> Use custom: "{locationQuery}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup heading="Locations">
                        {locationOptions.map((loc) => (
                          <CommandItem
                            key={loc}
                            value={loc}
                            onSelect={(currentValue) => {
                              setLocationQuery(currentValue);
                              setIsLocationOpen(false);
                            }}
                          >
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

            {/* Job Title */}
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g., CEO, Developer, Manager"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Company Filter */}
            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                <span>Company Filter</span>
                <span className="text-[10px] text-gray-400">Comma separated for multiple</span>
              </Label>
              <div className="flex gap-2">
                <Select value={orgMode} onValueChange={(v: any) => setOrgMode(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="include">Is any of</SelectItem>
                    <SelectItem value="exclude">Is not any of</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter companies..."
                  value={orgQuery}
                  onChange={(e) => setOrgQuery(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? 'Searching...' : 'Search Apollo.io'}
          </Button>
        </div>

        {/* Add this UI before the results list */}
        {!urlFileId && (
          <div className="flex gap-4 p-4 bg-slate-50 rounded-lg border mb-4">
            <div className="flex-1">
              <Label className="text-[10px] uppercase font-bold">Target Workspace</Label>
              <Select onValueChange={setSelectedWorkspace}>
                <SelectTrigger><SelectValue placeholder="Select Workspace" /></SelectTrigger>
                <SelectContent>{workspaces?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-[10px] uppercase font-bold">Target File</Label>
              <Select onValueChange={setSelectedFile} disabled={!selectedWorkspace}>
                <SelectTrigger><SelectValue placeholder="Select File" /></SelectTrigger>
                <SelectContent>{files?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* --- Results Section (Preserved) --- */}
        <div className="space-y-3 mt-4">
          {isLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>}
          {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center gap-3 py-4"><AlertCircle className="h-5 w-5 text-red-600" /><div><p className="font-medium text-red-900">Search Failed</p><p className="text-sm text-red-700">{(error as Error).message}</p></div></CardContent></Card>}
          {!isLoading && hasSearched && searchResults?.people.length === 0 && <Card className="border-yellow-200 bg-yellow-50"><CardContent className="flex flex-col items-center gap-3 py-8"><AlertCircle className="h-12 w-12 text-yellow-600" /><div className="text-center"><p className="font-medium text-yellow-900">No Results Found</p></div></CardContent></Card>}
          {!isLoading && searchResults && searchResults.people.map((person) => (
                <Card key={person.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        {person.photo_url ? <AvatarImage src={person.photo_url} /> : <AvatarFallback className="bg-purple-100 text-purple-600">{getInitials(person.name)}</AvatarFallback>}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div><h3 className="font-semibold text-gray-900">{person.name}</h3><p className="text-sm text-gray-600">{person.title}</p></div>
                          <Button size="sm" onClick={() => handleAddContact(person)} disabled={saveMutation.isPending}><UserPlus className="h-4 w-4 mr-1" />Add</Button>
                        </div>
                        {person.organization && <div className="flex items-center gap-1 text-sm text-gray-500 mt-2"><Building2 className="h-3 w-3" />{person.organization.name}</div>}
                        <div className="flex flex-wrap gap-3 mt-3">
                          {person.email && <div className="flex items-center gap-1 text-xs text-gray-600"><Mail className="h-3 w-3" />{person.email}</div>}
                          {(person.city || person.state || person.country) && <div className="flex items-center gap-1 text-xs text-gray-600"><MapPin className="h-3 w-3" />{[person.city, person.state, person.country].filter(Boolean).join(', ')}</div>}
                          {person.linkedin_url && <a href={person.linkedin_url} target="_blank" className="flex items-center gap-1 text-xs text-blue-600"><Linkedin className="h-3 w-3" />LinkedIn</a>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};