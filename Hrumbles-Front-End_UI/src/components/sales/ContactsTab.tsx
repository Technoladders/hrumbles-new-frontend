import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CandidateDetail } from '@/types/company';
import { 
  Mail, Phone, Linkedin, MapPin, Search, Eye, Users, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ContactsTabProps {
  contacts: CandidateDetail[];
  isLoading: boolean;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ contacts, isLoading }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch enrichment for contacts
  const { data: enrichedContacts = [] } = useQuery({
    queryKey: ['contacts-enriched', contacts.map(c => c.id)],
    queryFn: async () => {
      if (!contacts.length) return [];
      
      const contactIds = contacts.map(c => c.id).filter(Boolean);
      const { data } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(
            *,
            enrichment_employment_history(*),
            enrichment_person_metadata(*)
          ),
          enrichment_contact_emails(*),
          enrichment_contact_phones(*)
        `)
        .in('id', contactIds);
      
      return data || [];
    },
    enabled: contacts.length > 0
  });

  // Merge contacts with enrichment
  const mergedContacts = contacts.map(contact => {
    const enriched = enrichedContacts.find(e => e.id === contact.id);
    const enrichmentPerson = enriched?.enrichment_people?.[0];
    const metadata = enrichmentPerson?.enrichment_person_metadata;
    const employmentHistory = enrichmentPerson?.enrichment_employment_history || [];
    const currentJob = employmentHistory.find((h: any) => h.current || h.is_current);
    
    return {
      ...contact,
      photoUrl: enrichmentPerson?.photo_url || contact.photo_url,
      headline: enrichmentPerson?.headline,
      seniority: metadata?.seniority || enrichmentPerson?.seniority,
      city: enrichmentPerson?.city || contact.city,
      state: enrichmentPerson?.state || contact.state,
      country: enrichmentPerson?.country || contact.country,
      linkedinUrl: enrichmentPerson?.linkedin_url || contact.linkedin,
      currentTitle: currentJob?.title || contact.designation || contact.job_title,
      currentCompany: currentJob?.organization_name,
      primaryEmail: enriched?.enrichment_contact_emails?.find((e: any) => e.is_primary)?.email || contact.email,
      primaryPhone: enriched?.enrichment_contact_phones?.find((p: any) => p.is_primary)?.sanitized_number || contact.phone_number || contact.mobile,
      hasEnrichment: !!enrichmentPerson
    };
  });
  
  const filteredContacts = mergedContacts.filter(contact =>
    (contact.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (contact.primaryEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (contact.currentTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading contacts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-600 rounded-lg">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Key Contacts
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-medium">
                  {filteredContacts.length} decision {filteredContacts.length === 1 ? 'maker' : 'makers'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Search */}
          {contacts.length > 0 && (
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input 
                placeholder="Search contacts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs border-slate-200"
              />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Contacts Table */}
      {filteredContacts.length > 0 ? (
        <>
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Contact</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Position</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Email</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Phone</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Location</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow 
                      key={contact.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      {/* Contact */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-slate-200">
                            <AvatarImage src={contact.photoUrl} alt={contact.name} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs font-bold">
                              {contact.name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                              {contact.source_via_apollo && (
                                <Badge className="bg-blue-100 text-blue-700 text-[7px] px-1 py-0 h-3.5 border-blue-200" title="Found via Apollo.io organization match">
                                  Apollo
                                </Badge>
                              )}
                            </div>
                            {contact.seniority && (
                              <Badge className="bg-purple-100 text-purple-700 text-[8px] px-1 py-0 h-3.5 mt-0.5">
                                {contact.seniority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Position */}
                      <TableCell className="py-2">
                        <div className="max-w-[180px]">
                          <p className="text-xs text-slate-700 font-medium truncate">
                            {contact.currentTitle || contact.designation || '—'}
                          </p>
                          {contact.currentCompany && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                              <p className="text-[10px] text-slate-500 truncate">{contact.currentCompany}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-2">
                        {contact.primaryEmail ? (
                          <a
                            href={`mailto:${contact.primaryEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 hover:text-blue-600 transition-colors max-w-[180px]"
                          >
                            <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">{contact.primaryEmail}</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] text-slate-400">Not available</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="py-2">
                        {contact.primaryPhone ? (
                          <a
                            href={`tel:${contact.primaryPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600">{contact.primaryPhone}</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] text-slate-400">Not available</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-2">
                        {(contact.city || contact.state || contact.country) ? (
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">
                              {[contact.city, contact.state].filter(Boolean).join(', ') || contact.country}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-blue-50 rounded transition-colors"
                              title="LinkedIn Profile"
                            >
                              <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-bold text-purple-600 hover:bg-purple-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/${contact.id}`);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="border-none shadow-sm bg-gradient-to-r from-slate-50 to-purple-50">
            <CardContent className="p-3">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-lg font-black text-slate-900">{filteredContacts.length}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total</p>
                </div>
                <div>
                  <p className="text-lg font-black text-blue-600">
                    {filteredContacts.filter(c => c.primaryEmail).length}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">With Email</p>
                </div>
                <div>
                  <p className="text-lg font-black text-green-600">
                    {filteredContacts.filter(c => c.primaryPhone).length}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">With Phone</p>
                </div>
                <div>
                  <p className="text-lg font-black text-purple-600">
                    {filteredContacts.filter(c => c.hasEnrichment).length}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Enriched</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 mb-1">
              {searchTerm ? 'No Contacts Found' : 'No Contacts Yet'}
            </p>
            <p className="text-[10px] text-slate-500">
              {searchTerm ? 'Try different search terms' : 'Contacts will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContactsTab;