// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/TopCompanies.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  ArrowRight, 
  ExternalLink,
  Users,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Company {
  id: number;
  name: string;
  logo_url?: string;
  industry?: string;
  stage?: string;
  website?: string;
  enrichment_organizations?: {
    estimated_num_employees?: number;
    industry?: string;
  };
}

interface TopCompaniesProps {
  companies: Company[];
  isLoading: boolean;
}

const STAGE_STYLES: Record<string, string> = {
  'Customer': 'bg-green-50 text-green-700 border-green-200',
  'Prospect': 'bg-blue-50 text-blue-700 border-blue-200',
  'Lead': 'bg-purple-50 text-purple-700 border-purple-200',
  'Partner': 'bg-amber-50 text-amber-700 border-amber-200',
  'Closed - Won': 'bg-green-50 text-green-700 border-green-200',
  'Closed - Lost': 'bg-red-50 text-red-700 border-red-200',
};

export const TopCompanies: React.FC<TopCompaniesProps> = ({ companies, isLoading }) => {
  const navigate = useNavigate();

  const formatEmployeeCount = (count?: number) => {
    if (!count) return null;
    if (count >= 10000) return `${(count / 1000).toFixed(0)}K+`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Companies</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your target accounts</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => navigate('/companies')}
        >
          View all
          <ArrowRight size={12} className="ml-1" />
        </Button>
      </div>

      {/* Content - Grid Layout */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="animate-pulse border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => {
              const enrichment = company.enrichment_organizations;
              const industry = enrichment?.industry || company.industry;
              const employees = enrichment?.estimated_num_employees;

              return (
                <div
                  key={company.id}
                  onClick={() => navigate(`/companies/${company.id}`)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <Avatar className="h-10 w-10 rounded-lg border border-gray-200">
                      <AvatarImage src={company.logo_url || undefined} className="object-contain p-1" />
                      <AvatarFallback className="bg-gray-50 rounded-lg text-gray-500 text-xs font-medium">
                        {company.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </p>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      
                      {industry && (
                        <p className="text-xs text-gray-500 truncate mt-0.5 capitalize">
                          {industry}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2">
                        {employees && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Users size={10} />
                            {formatEmployeeCount(employees)}
                          </span>
                        )}
                        {company.stage && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-5",
                              STAGE_STYLES[company.stage] || "bg-gray-50 text-gray-600 border-gray-200"
                            )}
                          >
                            {company.stage}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No companies yet</p>
            <p className="text-xs text-gray-500 mt-1">Add companies to track your accounts</p>
            <Button 
              size="sm" 
              className="mt-4"
              onClick={() => navigate('/companies')}
            >
              Add Company
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};