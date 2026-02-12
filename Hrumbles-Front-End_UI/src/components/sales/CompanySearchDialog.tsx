// src/components/sales/CompanySearchDialog.tsx
import React from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Added Command and Popover components
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
  Users,
  Globe,
  Linkedin,
  AlertCircle,
  Plus,
  Building2,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { cn } from "@/lib/utils";
import {
  searchCompaniesInApollo,
  saveCompanySearchResultToDatabase,
  type ApolloOrganization,
  type ApolloCompanySearchFilters,
} from '@/services/apolloCompanySearch';

interface CompanySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId?: string;
}

export const CompanySearchDialog: React.FC<CompanySearchDialogProps> = ({
  open,
  onOpenChange,
  fileId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = React.useState('');
  const [industryQuery, setIndustryQuery] = React.useState('');
  const [locationQuery, setLocationQuery] = React.useState('');
  const [locationMode, setLocationMode] = React.useState<'include' | 'exclude'>('include');
  
  // UI State for Location Dropdown
  const [isLocationOpen, setIsLocationOpen] = React.useState(false);

  // Comprehensive Location List (Sorted Alphabetically)
  const locationOptions = React.useMemo(() => [
    "Andhra Pradesh, India", "Assam, India", "Bangalore, Karnataka", "Bihar, India", 
    "Chennai, Tamil Nadu", "Coimbatore, Tamil Nadu", "Delhi, NCR", "Gujarat, India", 
    "Haryana, India", "Hyderabad, Telangana", "Karnataka, India", "Kerala, India", 
    "Kochi, Kerala", "Kolkata, West Bengal", "Madhya Pradesh, India", "Maharashtra, India", 
    "Mumbai, Maharashtra", "Mysore, Karnataka", "Pune, Maharashtra", "Rajasthan, India", 
    "Surat, Gujarat", "Tamil Nadu, India", "Telangana, India", "Trichy, Tamil Nadu", 
    "Uttar Pradesh, India", "West Bengal, India"
  ].sort((a, b) => a.localeCompare(b)), []);

  const [filters, setFilters] = React.useState<ApolloCompanySearchFilters>({});
  const [hasSearched, setHasSearched] = React.useState(false);

  // Search query
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['apolloCompanySearch', filters],
    queryFn: () => searchCompaniesInApollo(filters, 1, 20),
    enabled: false,
  });

  const handleSearch = () => {
    const newFilters: ApolloCompanySearchFilters = {};

    if (searchQuery.trim()) newFilters.q_organization_name = searchQuery.trim();
    if (industryQuery.trim()) newFilters.organization_industries = [industryQuery.trim()];
    
    if (locationQuery.trim()) {
      const locations = locationQuery.split(',').map(l => l.trim());
      if (locationMode === 'include') {
        newFilters.organization_locations = locations;
      } else {
        (newFilters as any).excluded_organization_locations = locations;
      }
    }

    setFilters(newFilters);
    setHasSearched(true);
    refetch();
  };

  const saveMutation = useMutation({
    mutationFn: (organization: ApolloOrganization) =>
      saveCompanySearchResultToDatabase(organization, organization_id, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Company Added! 🎉' });
    },
  });

  const getInitials = (name: string) => name ? name.slice(0, 2).toUpperCase() : '??';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Search Companies in Cloud
          </DialogTitle>
          <DialogDescription>
            Target specific companies by industry and location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="e.g., Zoho, Microsoft"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                placeholder="e.g., Technology, Software"
                value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)}
              />
            </div>
            
            {/* ENHANCED: Searchable Location Dropdown */}
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Headquarters Location
              </Label>
              <div className="flex gap-2">
                <Select value={locationMode} onValueChange={(v: any) => setLocationMode(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="include">Is any of</SelectItem>
                    <SelectItem value="exclude">Is not any of</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between font-normal text-left h-10 overflow-hidden"
                    >
                      {locationQuery ? locationQuery : "Select city or state..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Type a location..." 
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
                        <CommandEmpty>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-xs text-purple-600"
                            onClick={() => setIsLocationOpen(false)}
                          >
                            <Plus className="mr-2 h-3 w-3" /> Use custom: "{locationQuery}"
                          </Button>
                        </CommandEmpty>
                        <CommandGroup heading="Available Locations">
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
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? 'Searching...' : 'Search Cloud'}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-3 mt-4">
          {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          {searchResults?.organizations?.map((org: any) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border">
                    <AvatarImage src={org.logo_url} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">{getInitials(org.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{org.name}</h3>
                        <p className="text-sm text-gray-600">{org.industry || org.primary_industry || 'N/A'}</p>
                      </div>
                      <Button size="sm" onClick={() => saveMutation.mutate(org)} disabled={saveMutation.isPending}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
                      {org.estimated_num_employees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org.estimated_num_employees.toLocaleString()}</span>}
                      {(org.city || org.state || org.country) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {[org.city, org.state, org.country].filter(Boolean).join(', ')}</span>}
                      {org.website_url && <a href={org.website_url} target="_blank" className="text-blue-600 flex items-center gap-1"><Globe className="h-3 w-3" /> Website</a>}
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