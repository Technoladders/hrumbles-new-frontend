import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom'; // MODIFICATION: Import useSearchParams
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { toast } from 'sonner';

// UI and Icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Search, ChevronLeft, ChevronRight, Edit, Trash2, Loader2, Mail, Phone, Copy, Check } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import { AddBenchProfileSheet } from '@/components/bench-profiles/AddBenchProfileSheet';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BenchProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  experience: string | null;
  suggested_title: string | null;
  notice_period: string | null;
  created_at: string;
  created_by_user: { first_name: string; last_name: string; } | null;
  current_salary: string | null;
  expected_salary: string | null;
  current_location: string | null;
}

const getInitials = (name: string = "") => {
  if (!name) return "NA";
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const OwnerAvatarCell = ({ 
  ownerName, 
  createdAt, 
  currentUserName 
}: { 
  ownerName: string, 
  createdAt: string,
  currentUserName: string
}) => {
  if (!ownerName) {
    return <TableCell><span className="text-gray-400 text-sm">N/A</span></TableCell>;
  }

  const displayName = ownerName;

  const initials = getInitials(displayName);

  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </TableCell>
  );
};

const ContactIcon = ({ type, value }: { type: 'email' | 'phone'; value: string }) => {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(value);
    setJustCopied(true);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copied!`);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const icon = type === 'email' 
    ? <Mail className="h-4 w-4" />
    : <Phone className="h-4 w-4" />;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors">
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="center">
        <div className="flex items-center gap-2">
          <span className="text-sm">{value}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleCopy} className="p-1 rounded-md hover:bg-accent">
                  {justCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Copy</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const formatINR = (value: string): string => {
  if (!value) return '';
  // Remove non-numeric characters
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  // Format with INR-style commas (e.g., 40,00,000)
  const chars = numericValue.split('').reverse();
  let formatted = [];
  for (let i = 0; i < chars.length; i++) {
    if (i === 3) formatted.push(',');
    if (i > 3 && (i - 3) % 2 === 0) formatted.push(',');
    formatted.push(chars[i]);
  }
  return formatted.reverse().join('');
};

const formatSalary = (value: string): string => {
  if (!value) return 'N/A';
  
  // Normalize and extract parts: currency, amount, type
  let amountStr = value.replace(/[^0-9]/g, ''); // Extract numerics
  let type = 'yr'; // Default
  
  // Detect type from string (case-insensitive)
  const lowerValue = value.toLowerCase();
  if (lowerValue.includes('lpa') || lowerValue.includes('year')) type = 'yr';
  else if (lowerValue.includes('monthly') || lowerValue.includes('month')) type = 'mon';
  else if (lowerValue.includes('hourly') || lowerValue.includes('hour')) type = 'hr';
  
  if (!amountStr) return 'N/A';
  
  // Format amount with INR commas (e.g., 50000 -> 50,000)
  const numericValue = parseInt(amountStr, 10);
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(numericValue);
  
  return `₹ ${formattedAmount}/${type}`;
};

const BenchProfilesPage = () => {
  const { organization_id } = useSelector((state: any) => state.auth);
  const user = useSelector((state: any) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // MODIFICATION: State initialized from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get("limit") || "10", 10));

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [recruiterFilter, setRecruiterFilter] = useState("All");

  // MODIFICATION: useEffect to sync state with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 10) params.set("limit", itemsPerPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, itemsPerPage, setSearchParams]);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['benchProfiles', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_bench_profiles').select(`*, created_by_user:created_by (first_name, last_name)`).eq('organization_id', organization_id).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organization_id,
  });

const filteredProfiles = useMemo(() => {
  let filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.suggested_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add recruiter filter
  if (recruiterFilter !== "All") {
    filtered = filtered.filter(p => {
      const recruiterName = p.created_by_user ? `${p.created_by_user.first_name} ${p.created_by_user.last_name}` : 'System';
      return recruiterName === recruiterFilter;
    });
  }

  // Sort by recruiter name if recruiter filter is active (alphabetical sort)
  if (recruiterFilter !== "All") {
    filtered.sort((a, b) => {
      const recruiterA = a.created_by_user ? `${a.created_by_user.first_name} ${a.created_by_user.last_name}` : 'System';
      const recruiterB = b.created_by_user ? `${b.created_by_user.first_name} ${b.created_by_user.last_name}` : 'System';
      return recruiterA.localeCompare(recruiterB);
    });
  }

  return filtered;
}, [profiles, searchTerm, recruiterFilter]);

const paginatedProfiles = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredProfiles.slice(startIndex, startIndex + itemsPerPage);
}, [filteredProfiles, currentPage, itemsPerPage, recruiterFilter]); // Added recruiterFilter

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);

  const handleOpenSheet = (profile: any = null) => { setEditingProfile(profile); setSheetOpen(true); };
  const handleCloseSheet = () => { setSheetOpen(false); setEditingProfile(null); };

  const handleConfirmDelete = async () => {
    if (!deletingProfile) return;
    setIsDeleting(true);
    const { error } = await supabase.from('hr_bench_profiles').delete().eq('id', deletingProfile.id);
    if (error) toast.error(`Failed: ${error.message}`);
    else { toast.success("Profile deleted."); refetch(); }
    setIsDeleting(false);
    setDeletingProfile(null);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

       <span className="text-sm text-gray-600">
  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
  {Math.min((currentPage * itemsPerPage), filteredProfiles.length)} of{" "}
  {filteredProfiles.length} profiles
</span>
      </div>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} /></div>;

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Bench Profiles</h1><Button onClick={() => handleOpenSheet()}><UserPlus size={16} className="mr-2" />Add Candidate</Button></div>
        <div className="flex justify-between items-center mb-4">
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">Filter by Recruiter:</span>
    <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All</SelectItem>
        {[...new Set(profiles.map(p => p.created_by_user ? `${p.created_by_user.first_name} ${p.created_by_user.last_name}` : 'System'))].map(recruiter => (
          <SelectItem key={recruiter} value={recruiter}>
            {recruiter}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
        <Input placeholder="Search by name, email, or title..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        
        <div className="w-full overflow-x-auto rounded-md border">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap border border-purple-500">
                <TableHead className="sticky left-0 z-20 w-[200px] px-2 text-white">Name</TableHead>
                <TableHead className="sticky left-[200px] z-10 w-[180px] px-2 text-white">Suggested Title</TableHead>
                <TableHead className="w-[120px] px-2 text-white">Notice Period</TableHead>
                <TableHead className="w-[120px] px-2 text-white">Experience</TableHead>
                <TableHead className="w-[120px] px-2 text-white">Current Salary</TableHead>
                <TableHead className="w-[120px] px-2 text-white">Expected Salary</TableHead>
                <TableHead className="w-[120px] px-2 text-white">Location</TableHead>
                <TableHead className="w-[40px] text-center px-2 text-white">Added by</TableHead>
                <TableHead className="sticky right-0 z-20 w-[150px] px-2 text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.length > 0 ? paginatedProfiles.map((profile) => (
                <TableRow key={profile.id} className="align-top group bg-white hover:bg-slate-50 relative">
                  {/* --- Sticky Cell 1 (Name with Contacts) --- */}
                  <TableCell className="sticky left-0 z-20 px-2 bg-purple-50 group-hover:bg-slate-50 py-1">
                    <div className="flex items-start gap-2 h-full">
                      <div className="flex-1 min-w-0">
                        <Link to={`/talent-pool/${profile.talent_pool_id}`}>
                          <div className="truncate cursor-pointer text-black font-medium" title={profile.name}>
                            {profile.name}
                          </div>
                        </Link>
                        <span className="text-xs text-muted-foreground whitespace-nowrap block text-left">
                          {moment(profile.created_at).format("DD MMM YYYY")} ({moment(profile.created_at).fromNow()})
                        </span>
                      </div>
                      <div className="flex-shrink-0 self-stretch flex items-center justify-center">
                        <div className="flex space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200">
                          {profile.email && <ContactIcon type="email" value={profile.email} />}
                          {profile.phone && <ContactIcon type="phone" value={profile.phone} />}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* --- Sticky Cell 2 (Suggested Title) --- */}
                  <TableCell className="sticky left-[200px] z-10 px-2 bg-purple-50 group-hover:bg-slate-50 py-1">
                    {profile.suggested_title || 'N/A'}
                  </TableCell>

                  {/* --- Other Scrollable Cells --- */}
                  <TableCell className="px-2 py-1">{profile.notice_period || 'N/A'}</TableCell>
                  <TableCell className="px-2 py-1">{profile.experience || 'N/A'}</TableCell>
                  <TableCell className="px-2 text-sm py-1">{formatSalary(profile.current_salary)}</TableCell>
                  <TableCell className="px-2 text-sm py-1">{formatSalary(profile.expected_salary)}</TableCell>
                  <TableCell className="px-2 text-sm py-1">{profile.current_location || "N/A"}</TableCell>
                  <TableCell className="px-2 py-1 flex items-center justify-center">
                    <OwnerAvatarCell 
                      ownerName={profile.created_by_user ? `${profile.created_by_user.first_name} ${profile.created_by_user.last_name}` : 'System'} 
                      createdAt={profile.created_at} 
                      currentUserName={`${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`} 
                    />
                  </TableCell>
                  {/* --- Action Cell (Right Fixed) --- */}
                  <TableCell className="sticky right-0 z-20 px-2 bg-purple-50 group-hover:bg-slate-50 py-1">
                    <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200 w-fit justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleOpenSheet(profile)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-500 hover:bg-red-600 hover:text-white transition-colors" onClick={() => setDeletingProfile(profile)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={9} className="h-24 text-center">No profiles found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        
        {filteredProfiles.length > 0 && renderPagination()}
      </div>

      <AddBenchProfileSheet isOpen={isSheetOpen} onClose={handleCloseSheet} onSuccess={() => { handleCloseSheet(); refetch(); }} existingProfile={editingProfile}/>

      <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the profile for "{deletingProfile?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BenchProfilesPage;