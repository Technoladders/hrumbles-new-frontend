// src/components/sales/contacts-table/LinkedInProfileTab.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Linkedin, 
  Briefcase, 
  RefreshCw,
  ExternalLink,
  Sparkles,
  Mail,
  Phone,
  Building2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { 
  enrichWithApollo, 
  getCachedApolloData, 
  type ApolloContact 
} from '@/services/apolloEnrichment';
import type { SimpleContact } from '@/types/simple-contact.types';

interface LinkedInProfileTabProps {
  contact: SimpleContact;
}

export const LinkedInProfileTab: React.FC<LinkedInProfileTabProps> = ({ contact }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch cached Apollo data
  const { data: apolloData, isLoading } = useQuery({
    queryKey: ['apolloProfile', contact.id],
    queryFn: () => getCachedApolloData(contact.id),
    enabled: !!contact.id,
  });

  // Enrich mutation
  const enrichMutation = useMutation({
    mutationFn: async () => {
      if (!contact.linkedin_url) {
        throw new Error('No LinkedIn URL available for this contact');
      }
      return enrichWithApollo(
        contact.linkedin_url, 
        contact.id, 
        organization_id,
        contact.email
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apolloProfile', contact.id] });
      toast({
        title: 'Profile Enriched! 🎉',
        description: 'LinkedIn data has been successfully fetched from Apollo.io.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Enrichment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEnrich = () => {
    enrichMutation.mutate();
  };

  // No LinkedIn URL
  if (!contact.linkedin_url) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Linkedin className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center mb-2">
            No LinkedIn profile linked to this contact
          </p>
          <p className="text-sm text-gray-400 text-center">
            Add a LinkedIn URL to enable profile enrichment
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // No data yet - show enrich button
  if (!apolloData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Linkedin className="h-16 w-16 text-blue-600 mb-4" />
          <p className="text-gray-700 font-medium text-center mb-2">
            LinkedIn Profile Available
          </p>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enrich this contact with detailed profile data from Apollo.io
          </p>
          <Button
            onClick={handleEnrich}
            disabled={enrichMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {enrichMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enrich with Apollo.io
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Uses your existing Apollo.io subscription
          </p>
        </CardContent>
      </Card>
    );
  }

  // Display enriched Apollo data
  return (
    <div className="space-y-6">
      {/* Header with Profile Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-blue-600 text-white text-2xl">
                {apolloData.first_name?.[0]}{apolloData.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {apolloData.name}
              </h2>
              <p className="text-gray-600 mt-1">{apolloData.title}</p>
              {apolloData.organization && (
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <Building2 className="h-4 w-4 mr-1" />
                  {apolloData.organization.name}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(contact.linkedin_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnrich}
                disabled={enrichMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${enrichMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            {apolloData.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href={`mailto:${apolloData.email}`} className="text-sm text-purple-600 hover:underline">
                    {apolloData.email}
                  </a>
                </div>
              </div>
            )}
            {apolloData.phone_numbers && apolloData.phone_numbers.length > 0 && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a href={`tel:${apolloData.phone_numbers[0].sanitized_number}`} className="text-sm text-gray-900">
                    {apolloData.phone_numbers[0].sanitized_number}
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment History */}
      {apolloData.employment_history && apolloData.employment_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apolloData.employment_history.slice(0, 5).map((job, index) => (
                <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{job.title}</h4>
                      <p className="text-sm text-gray-600">{job.organization_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {job.start_date} - {job.end_date || 'Present'}
                        {job.current && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}
                      </p>
                      {job.description && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      {apolloData.organization && (
        <Card>
          <CardHeader>
            <CardTitle>Current Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="font-medium text-gray-900">{apolloData.organization.name}</p>
              </div>
              {apolloData.organization.industry && (
                <div>
                  <p className="text-sm text-gray-500">Industry</p>
                  <p className="text-gray-900">{apolloData.organization.industry}</p>
                </div>
              )}
{apolloData.organization.website_url && (
  <div>
    <p className="text-sm text-gray-500">Website</p>
    <a href={apolloData.organization.website_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm">
      {apolloData.organization.website_url}
    </a>
  </div>
)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

