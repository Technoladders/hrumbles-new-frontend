// src/pages/sales/CompanyDetailPage.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  Users,
  Globe,
  Linkedin,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CompanyApolloTab } from '@/components/sales/company-detail/CompanyApolloTab';
import type { CompanyDetail } from '@/types/company';

const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CompanyDetail;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-600">Company not found</p>
            <Link to="/companies">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Companies
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/companies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
        </Link>
      </div>

      {/* Company Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              {company.logo_url ? (
                <AvatarImage src={company.logo_url} alt={company.name} />
              ) : (
                <AvatarFallback className="text-2xl">
                  {company.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              {company.industry && (
                <p className="text-gray-600 mt-1">{company.industry}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-4">
                {company.employee_count && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {company.employee_count.toLocaleString()} employees
                  </div>
                )}
                {company.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {company.location}
                  </div>
                )}
                {company.website && (
                  
                    href={!company.website.startsWith('http') ? `https://${company.website}` : company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {company.linkedin && (
                  
                    href={!company.linkedin.startsWith('http') ? `https://${company.linkedin}` : company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="apollo">
            <Sparkles className="h-4 w-4 mr-2" />
            Apollo.io Data
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">About</h3>
              {company.about ? (
                <p className="text-gray-700">{company.about}</p>
              ) : (
                <p className="text-gray-400 italic">No description available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apollo">
          <CompanyApolloTab company={company} />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center py-12">
                Company contacts feature coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyDetailPage;