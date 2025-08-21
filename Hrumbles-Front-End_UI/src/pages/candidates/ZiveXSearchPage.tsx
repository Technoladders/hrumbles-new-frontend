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
const handleSearch = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    if (newFilters.keywords.length > 0) params.append('keywords', newFilters.keywords.join(','));
    if (newFilters.locations.length > 0) params.append('locations', newFilters.locations.join(','));
    if (newFilters.min_exp) params.append('min_exp', newFilters.min_exp.toString());
    if (newFilters.max_exp) params.append('max_exp', newFilters.max_exp.toString());
    if (newFilters.min_salary) params.append('min_salary', newFilters.min_salary.toString());
    if (newFilters.max_salary) params.append('max_salary', newFilters.max_salary.toString());
    
    // BUG FIX: Add the missing parameters
    if (newFilters.gender !== 'All candidates') params.append('gender', newFilters.gender);
    if (newFilters.notice_period !== 'Any') params.append('notice_period', newFilters.notice_period);
    if (newFilters.companies.length > 0) params.append('companies', newFilters.companies.join(','));
    if (newFilters.educations.length > 0) params.append('educations', newFilters.educations.join(','));
    
    // Use navigate with replace: true to avoid breaking the back button history
    navigate(`/zive-x-search/results?${params.toString()}`, { replace: true });
};
  return (
    <div className="p-4 md:p-8 max-w-8xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Search Candidates</h1>
        <p className="text-gray-500 mt-1">Find the perfect candidate from your unified talent pool.</p>
      </div>
      <CandidateSearchFilters onSearch={handleSearch} isSearching={false} />
    </div>
  );
};

export default ZiveXSearchPage;