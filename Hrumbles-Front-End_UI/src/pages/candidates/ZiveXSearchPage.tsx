// src/pages/candidates/ZiveXSearchPage.tsx

import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters } from '@/types/candidateSearch'; // We'll create this file next

const ZiveXSearchPage: FC = () => {
  const navigate = useNavigate();

// In ZiveXSearchPage.tsx
// In ZiveXSearchPage.tsx
// In ZiveXSearchPage.tsx
const handleSearch = (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.keywords.length > 0) params.append('keywords', filters.keywords.join(','));
    if (filters.locations.length > 0) params.append('locations', filters.locations.join(','));
    if (filters.min_exp) params.append('min_exp', filters.min_exp.toString());
    if (filters.max_exp) params.append('max_exp', filters.max_exp.toString());
    if (filters.min_salary) params.append('min_salary', filters.min_salary.toString());
    if (filters.max_salary) params.append('max_salary', filters.max_salary.toString());
    if (filters.gender !== 'All candidates') params.append('gender', filters.gender);
    if (filters.notice_period !== 'Any') params.append('notice_period', filters.notice_period);
    if (filters.companies.length > 0) params.append('companies', filters.companies.join(','));
    if (filters.educations.length > 0) params.append('educations', filters.educations.join(','));
    
    navigate(`/zive-x-search/results?${params.toString()}`);
};
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Search Candidates</h1>
        <p className="text-gray-500 mt-1">Find the perfect candidate from your unified talent pool.</p>
      </div>
      <CandidateSearchFilters onSearch={handleSearch} isSearching={false} />
    </div>
  );
};

export default ZiveXSearchPage;