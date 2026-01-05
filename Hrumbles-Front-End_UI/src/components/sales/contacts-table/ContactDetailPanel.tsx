// src/components/sales/contacts-table/ContactDetailPanel.tsx
import React from 'react';
import { X, Mail, Phone, MapPin, Briefcase, Calendar, ExternalLink, Edit, Trash2, Building2, Users, Activity, Plus, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SimpleContact } from '@/types/simple-contact.types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddNoteDialog } from './AddNoteDialog';
import { AddActivityDialog } from './AddActivityDialog';
import { LinkedInProfileTab } from './LinkedInProfileTab';

interface ContactDetailPanelProps {
  contact: SimpleContact | null;
  onClose: () => void;
  onEdit?: (contact: SimpleContact) => void;
  onDelete?: (contactId: string) => void;
}

export const ContactDetailPanel: React.FC<ContactDetailPanelProps> = ({
  contact,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isAddNoteOpen, setIsAddNoteOpen] = React.useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = React.useState(false);

  if (!contact) return null;

  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['contactCompany', contact.company_id],
    queryFn: async () => {
      if (!contact.company_id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', contact.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contact.company_id,
  });

  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['contactActivities', contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_activities')
        .select('*, created_by_employee:hr_employees(first_name, last_name)')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact.id,
  });

  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['contactNotes', contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_notes')
        .select('*, created_by_employee:hr_employees(first_name, last_name)')
        .eq('contact_id', contact.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact.id,
  });

  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['contactDeals', contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, owner:hr_employees(first_name, last_name), company:companies(name)')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact.id,
  });

  const { data: similarContacts, isLoading: isLoadingSimilar } = useQuery({
    queryKey: ['similarContacts', contact.id, contact.company_id],
    queryFn: async () => {
      if (!contact.company_id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', contact.company_id)
        .neq('id', contact.id)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact.company_id,
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'cold': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-yellow-100 text-yellow-800',
      'qualified': 'bg-purple-100 text-purple-800',
      'proposal': 'bg-orange-100 text-orange-800',
      'negotiation': 'bg-pink-100 text-pink-800',
      'closed_won': 'bg-green-100 text-green-800',
      'closed_lost': 'bg-gray-100 text-gray-800',
      'Prospect': 'bg-blue-100 text-blue-800',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'email': <Mail className="h-4 w-4" />,
      'call': <Phone className="h-4 w-4" />,
      'meeting': <Calendar className="h-4 w-4" />,
      'task': <Activity className="h-4 w-4" />,
    };
    return icons[type] || <Activity className="h-4 w-4" />;
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-purple-600 text-white text-lg">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
                <p className="text-gray-600 mt-1">{contact.job_title || 'No job title'}</p>
                {contact.company_id && companyData && (
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Building2 className="h-4 w-4 mr-1" />
                    {companyData.name}
                  </div>
                )}
                {contact.contact_stage && (
                  <Badge className={`mt-2 ${getStageColor(contact.contact_stage)}`}>
                    {contact.contact_stage.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" onClick={() => onDelete(contact.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activities">
                  Activities
                  {activities && activities.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{activities.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes">
                  Notes
                  {notes && notes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{notes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deals">
                  Deals
                  {deals && deals.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{deals.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="similar">Similar</TabsTrigger>
                <TabsTrigger value="linkedin">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
{/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contact.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <a href={`mailto:${contact.email}`} className="text-purple-600 hover:underline">
                            {contact.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.mobile && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Mobile</p>
                          <a href={`tel:${contact.mobile}`} className="text-gray-900">
                            {contact.mobile}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.alt_mobile && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Alternate Mobile</p>
                          <a href={`tel:${contact.alt_mobile}`} className="text-gray-900">
                            {contact.alt_mobile}
                          </a>
                        </div>
                      </div>
                    )}
  {contact.linkedin_url && (
  <div className="flex items-center space-x-3">
    <ExternalLink className="h-5 w-5 text-gray-400" />
    <div>
      <p className="text-sm text-gray-500">LinkedIn</p>
      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
        View Profile
      </a>
    </div>
  </div>
)}
                    {(contact.city || contact.state || contact.country) && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="text-gray-900">
                            {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {contact.timezone && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Timezone</p>
                          <p className="text-gray-900">{contact.timezone}</p>
                        </div>
                      </div>
                    )}
                    {contact.medium && (
                      <div className="flex items-center space-x-3">
                        <Activity className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Source Medium</p>
                          <p className="text-gray-900">{contact.medium}</p>
                        </div>
                      </div>
                    )}
                    {contact.contact_owner && (
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Contact Owner</p>
                          <p className="text-gray-900">{contact.contact_owner}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Company Information */}
            {/* Company Information */}
                {contact.company_id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Company Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingCompany ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : companyData ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500">Company Name</p>
                            <p className="text-gray-900 font-medium">{companyData.name}</p>
                          </div>
                          {companyData.industry && (
                            <div>
                              <p className="text-sm text-gray-500">Industry</p>
                              <p className="text-gray-900">{companyData.industry}</p>
                            </div>
                          )}
                          {companyData.website && (
                            <div>
                              <p className="text-sm text-gray-500">Website</p>
                              <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                {companyData.website}
                              </a>
                            </div>
                          )}
                          {companyData.employee_count && (
                            <div>
                              <p className="text-sm text-gray-500">Employee Count</p>
                              <p className="text-gray-900">{companyData.employee_count}</p>
                            </div>
                          )}
                          {companyData.ceo && (
                            <div>
                              <p className="text-sm text-gray-500">CEO</p>
                              <p className="text-gray-900">{companyData.ceo}</p>
                            </div>
                          )}
                          {companyData.linkedin && (
                            <div>
                              <p className="text-sm text-gray-500">LinkedIn</p>
                              <a href={companyData.linkedin} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                View Company Profile
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No company data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Custom Fields */}
                {contact.custom_data && Object.keys(contact.custom_data).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(contact.custom_data).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-gray-900">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Record Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Created At</p>
                      <p className="text-gray-900">
                        {format(new Date(contact.created_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="text-gray-900">
                        {format(new Date(contact.updated_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Activity Timeline</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsAddActivityOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Log Activity
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivities ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : activities && activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity: any) => (
                          <div key={activity.id} className="flex space-x-3 border-l-2 border-purple-200 pl-4 py-2">
                            <div className="mt-1">{getActivityIcon(activity.activity_type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900 capitalize">
                                    {activity.activity_type.replace('_', ' ')}
                                  </p>
                                  {activity.metadata?.subject && (
                                    <p className="text-sm text-gray-600 mt-0.5">{activity.metadata.subject}</p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(activity.created_at), 'MMM dd, h:mm a')}
                                </p>
                              </div>
                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              )}
                              {activity.metadata?.duration && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Duration: {activity.metadata.duration} minutes
                                </p>
                              )}
                              {activity.metadata?.outcome && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {activity.metadata.outcome.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No activities yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Log your first activity to track interactions
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setIsAddActivityOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Log Activity
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Notes</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsAddNoteOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoadingNotes ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : notes && notes.length > 0 ? (
                      <div className="space-y-4">
                        {notes.map((note: any) => (
                          <div
                            key={note.id}
                            className={`border rounded-lg p-4 ${
                              note.is_pinned ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  {note.created_by_employee
                                    ? `${note.created_by_employee.first_name} ${note.created_by_employee.last_name}`
                                    : 'System'}
                                </p>
                                {note.is_pinned && (
                                  <Badge variant="secondary" className="text-xs">Pinned</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {format(new Date(note.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-900">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No notes yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setIsAddNoteOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Associated Deals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDeals ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : deals && deals.length > 0 ? (
                      <div className="space-y-3">
                        {deals.map((deal: any) => (
                          <div key={deal.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{deal.title}</p>
                                <p className="text-sm text-gray-500 mt-1 capitalize">
                                  {deal.stage.replace('_', ' ')}
                                </p>
                                {deal.owner && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Owner: {deal.owner.first_name} {deal.owner.last_name}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-purple-600">
                                  {deal.currency} {deal.value?.toLocaleString()}
                                </p>
                                {deal.probability !== null && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {deal.probability}% probability
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No deals associated</p>
                        <Button variant="outline" size="sm" className="mt-3">
                          Add Deal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Similar Contacts Tab */}
              <TabsContent value="similar" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Similar People</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      From the same company
                    </p>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSimilar ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : similarContacts && similarContacts.length > 0 ? (
                      <div className="space-y-3">
                        {similarContacts.map((similar: any) => (
                          <div
                            key={similar.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {getInitials(similar.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{similar.name}</p>
                              <p className="text-sm text-gray-500 truncate">{similar.job_title}</p>
                            </div>
                            {similar.email && (
                              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No similar contacts found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LinkedIn Tab - THIS IS THE NEW SECTION */}
              <TabsContent value="linkedin" className="mt-6">
                <LinkedInProfileTab contact={contact} />
              </TabsContent>

            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Dialogs */}
      <AddNoteDialog
        open={isAddNoteOpen}
        onOpenChange={setIsAddNoteOpen}
        contact={contact}
      />
      <AddActivityDialog
        open={isAddActivityOpen}
        onOpenChange={setIsAddActivityOpen}
        contact={contact}
      />
    </>
  );
};