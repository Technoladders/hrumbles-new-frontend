// src/pages/candidates/MigratedTalentPoolPage.tsx

import { useState, useMemo, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import Loader from '@/components/ui/Loader';

// Strongly-typed interface for the list view
export interface MigratedCandidateSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roll_name: string | null;
  mongo_created_at: string;
  source: string | null;
}

const MigratedTalentPoolPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: candidates = [], isLoading } = useQuery<MigratedCandidateSummary[]>({
    queryKey: ['migratedCandidatesList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mongo_candidates')
        .select(`id, first_name, last_name, email, roll_name, mongo_created_at, source`)
        .order('mongo_created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
  });

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(searchTerm.toLowerCase()) ||
        (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    });
  }, [candidates, searchTerm]);

  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  if (isLoading) {
    return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} /></div>;
  }

  // The rest of the component's JSX is the same...
  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div>
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3"><Database /> Migrated Talent Pool</h1>
        <p className="text-gray-500">A read-only view of candidates migrated from the legacy system.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search by name or email"
          className="pl-10 h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="table-header-cell">Candidate</th>
                <th scope="col" className="table-header-cell">Role / Title</th>
                <th scope="col" className="table-header-cell">Original Import Date</th>
                <th scope="col" className="table-header-cell">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCandidates.map((candidate) => {
                const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unnamed Candidate';
                return (
                  <tr key={candidate.id} className="hover:bg-gray-50 transition">
                    <td className="table-cell">
                      <Link to={`/migrated-talent-pool/${candidate.id}`} className="font-medium text-primary hover:underline">{fullName}</Link>
                      <span className="block text-xs text-gray-500">{candidate.email || 'No email'}</span>
                    </td>
                    <td className="table-cell">{candidate.roll_name || <span className="text-gray-400">Not specified</span>}</td>
                    <td className="table-cell">{moment(candidate.mongo_created_at).format("DD MMM YYYY")}</td>
                    <td className="table-cell">{candidate.source || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {filteredCandidates.length > 0 && (
         <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <span className="text-sm text-gray-600">Total {filteredCandidates.length} candidates</span>
        </div>
      )}
    </div>
  );
};

export default MigratedTalentPoolPage;