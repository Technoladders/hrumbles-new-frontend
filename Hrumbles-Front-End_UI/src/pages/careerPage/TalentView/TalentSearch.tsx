import React from 'react';
import { Search, MapPin } from 'lucide-react';
import './talent-theme.css';

interface SearchProps {
  searchTerm: string;
  location: string;
  onSearchChange: (field: string, value: string) => void;
}

const TalentSearch: React.FC<SearchProps> = ({ searchTerm, location, onSearchChange }) => {
  return (
    <div className="bg-white border-b border-gray-200 py-6">
      <div className="talent-container">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Keyword Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-talent-gray h-5 w-5" />
            <input 
              type="text"
              placeholder="Job title, keywords, or company"
              className="talent-input pl-11"
              value={searchTerm}
              onChange={(e) => onSearchChange('searchTerm', e.target.value)}
            />
          </div>

          {/* Location Input */}
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-talent-gray h-5 w-5" />
            <input 
              type="text"
              placeholder="City, state, or 'Remote'"
              className="talent-input pl-11"
              value={location}
              onChange={(e) => onSearchChange('location', e.target.value)}
            />
          </div>

          {/* Search Button */}
          <button className="btn-talent-primary px-8 py-3 md:w-auto w-full shadow-md hover:shadow-lg">
            Find Jobs
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalentSearch;