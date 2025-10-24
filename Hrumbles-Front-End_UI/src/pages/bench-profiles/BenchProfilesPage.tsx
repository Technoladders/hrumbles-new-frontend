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
import { UserPlus, Search, ChevronLeft, ChevronRight, Edit, Trash2, Loader2 } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import { AddBenchProfileSheet } from '@/components/bench-profiles/AddBenchProfileSheet';

interface BenchProfile {
  id: string;
  name: string;
  email: string | null;
  experience: string | null;
  suggested_title: string | null;
  notice_period: string | null;
  created_at: string;
  created_by_user: { first_name: string; last_name: string; } | null;
}

const BenchProfilesPage = () => {
  const { organization_id } = useSelector((state: any) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  // MODIFICATION: State initialized from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get("limit") || "10", 10));

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const filteredProfiles = useMemo(() => profiles.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.suggested_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [profiles, searchTerm]);

  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProfiles, currentPage, itemsPerPage]);

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

  if (isLoading) return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Bench Profiles</h1><Button onClick={() => handleOpenSheet()}><UserPlus size={16} className="mr-2" />Add Candidate</Button></div>
      <Input placeholder="Search by name, email, or title..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
      
      <div className="rounded-lg border overflow-hidden bg-white">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Suggested Title</TableHead><TableHead>Notice Period</TableHead><TableHead>Recruiter</TableHead><TableHead className="text-center sticky right-0 bg-slate-50">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedProfiles.length > 0 ? paginatedProfiles.map((profile) => (
              <TableRow key={profile.id}>
                <Link to={`/talent-pool/${profile.talent_pool_id}`}>
                <TableCell className="font-medium"><div>{profile.name}</div><div className="text-xs text-gray-500">{profile.email}</div></TableCell>
                </Link>
                <TableCell>{profile.suggested_title || 'N/A'}</TableCell>
                <TableCell>{profile.notice_period || 'N/A'}</TableCell>
                <TableCell>
                    <TooltipProvider><Tooltip><TooltipTrigger>
                        <Avatar className="h-8 w-8 text-xs"><AvatarFallback className="bg-purple-100 text-purple-700">{profile.created_by_user ? `${profile.created_by_user.first_name?.[0]}${profile.created_by_user.last_name?.[0]}` : 'S'}</AvatarFallback></Avatar>
                    </TooltipTrigger><TooltipContent><p>{profile.created_by_user ? `${profile.created_by_user.first_name} ${profile.created_by_user.last_name}` : 'System'}<br/>{moment(profile.created_at).format("DD MMM YYYY")}</p></TooltipContent></Tooltip></TooltipProvider>
                </TableCell>
                <TableCell className="text-center sticky right-0 bg-white"><div className="flex justify-center"><div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenSheet(profile)}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit</p></TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeletingProfile(profile)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip></TooltipProvider>
                </div></div></TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No profiles found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2"><span className="text-sm">Show</span><Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1);}}><SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
         </div>
      )}

      <AddBenchProfileSheet isOpen={isSheetOpen} onClose={handleCloseSheet} onSuccess={() => { handleCloseSheet(); refetch(); }} existingProfile={editingProfile}/>

      <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the profile for "{deletingProfile?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BenchProfilesPage;