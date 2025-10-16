// src/components/candidates/zive-x/RecentSearches.tsx

import { FC, useEffect, useState } from 'react'; // NEW: Import hooks to make it dynamic
import { History } from 'lucide-react';

interface RecentSearchesProps {
  onSelectSearch: (searchQuery: string) => void;
}

const RecentSearches: FC<RecentSearchesProps> = ({ onSelectSearch }) => {
  // NEW: Use state to ensure the component re-renders when localStorage changes
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // This effect runs when the component mounts and ensures we have the latest data
    setRecentSearches(JSON.parse(localStorage.getItem('recentSearches') || '[]'));
  }, []);

  const handleFillSearch = (query: string) => {
    // This ensures that when a search is re-filled, it's moved to the top of the list
    const updatedSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const filtered = updatedSearches.filter((q: string) => q !== query);
    filtered.unshift(query);
    localStorage.setItem('recentSearches', JSON.stringify(filtered.slice(0, 5)));
    setRecentSearches(filtered.slice(0, 5));
    
    onSelectSearch(query);
  };

  // NEW: The corrected function that understands the new URL structure
  const getSearchDisplayName = (params: URLSearchParams) => {
    const allKeywords = [
      ...(params.get('mandatory_keywords')?.split(',') || []),
      ...(params.get('optional_keywords')?.split(',') || []),
      ...(params.get('mandatory_skills')?.split(',') || []),
      ...(params.get('optional_skills')?.split(',') || [])
    ].filter(Boolean); // Filter out any empty strings

    const allLocations = [
      ...(params.get('mandatory_locations')?.split(',') || []),
      ...(params.get('optional_locations')?.split(',') || [])
    ].filter(Boolean);

    const keywordsText = allKeywords.slice(0, 3).join(', ');
    const locationText = allLocations.length > 0 ? `in ${allLocations.join(', ')}` : '';

    // Provide a fallback if no keywords or locations are used
    if (!keywordsText && !locationText) {
      const company = params.get('optional_current_company') || params.get('mandatory_current_company');
      if (company) return `company: ${company}`;
      
      const exp = params.get('min_exp');
      if (exp) return `Experience: ${exp}+ years`;

      return "Refined Search"; // A better generic fallback
    }

    const fullText = `${keywordsText} ${locationText}`.trim();
    return fullText || "Recent Search"; // Final fallback
  };

  if (recentSearches.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center mb-4">
          <History className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Searches</h3>
        </div>
        <p className="text-sm text-gray-500">Your recent searches will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center mb-4">
        <History className="h-5 w-5 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Recent Searches</h3>
      </div>
      <div className="space-y-3">
        {recentSearches.map((query: string, index: number) => (
          <div key={index}>
            <p className="text-sm font-medium text-gray-800 truncate" title={getSearchDisplayName(new URLSearchParams(query))}>
              {getSearchDisplayName(new URLSearchParams(query))}
            </p>
            <button
              onClick={() => handleFillSearch(query)}
              className="text-sm text-blue-600 hover:underline"
            >
              Fill this search
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentSearches;