import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, UserPlus, Mail, Phone, Linkedin, MapPin, 
  Briefcase, Eye, LayoutGrid, LayoutList 
} from 'lucide-react';
import AddNewCandidateAndAssociationForm from '@/components/sales/AddNewCandidateAndAssociationForm';
import { CandidateDetail } from '@/types/company';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmployeesTabProps {
  employees: CandidateDetail[];
  isLoading: boolean;
  companyId: number;
  companyName: string;
  onEditEmployee: (employee: CandidateDetail) => void;
  onDataUpdate: () => void;
}

const EmployeesTab: React.FC<EmployeesTabProps> = ({ 
  employees, 
  isLoading, 
  companyId, 
  companyName, 
  onEditEmployee, 
  onDataUpdate 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Fetch enrichment data for all employees
  const { data: enrichedEmployees = [] } = useQuery({
    queryKey: ['employees-enriched', companyId, employees.map(e => e.id)],
    queryFn: async () => {
      if (!employees.length) return [];
      
      const contactIds = employees.map(e => e.id).filter(Boolean);
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
    enabled: employees.length > 0
  });

  // Merge employees with enrichment data
  const mergedEmployees = employees.map(emp => {
    const enriched = enrichedEmployees.find(e => e.id === emp.id);
    const enrichmentPerson = enriched?.enrichment_people?.[0];
    const metadata = enrichmentPerson?.enrichment_person_metadata;
    const employmentHistory = enrichmentPerson?.enrichment_employment_history || [];
    const currentJob = employmentHistory.find((h: any) => h.current || h.is_current);
    
    return {
      ...emp,
      // Enrichment data
      photoUrl: enrichmentPerson?.photo_url || emp.photo_url,
      headline: enrichmentPerson?.headline,
      seniority: metadata?.seniority || enrichmentPerson?.seniority,
      city: enrichmentPerson?.city || emp.city,
      state: enrichmentPerson?.state || emp.state,
      country: enrichmentPerson?.country || emp.country,
      linkedinUrl: enrichmentPerson?.linkedin_url || emp.linkedin,
      // Current position
      currentTitle: currentJob?.title || emp.designation || emp.job_title,
      currentCompany: currentJob?.organization_name,
      // Contact methods from enrichment
      primaryEmail: enriched?.enrichment_contact_emails?.find((e: any) => e.is_primary)?.email || emp.email,
      allEmails: enriched?.enrichment_contact_emails || [],
      primaryPhone: enriched?.enrichment_contact_phones?.find((p: any) => p.is_primary)?.sanitized_number || emp.mobile,
      allPhones: enriched?.enrichment_contact_phones || [],
      // Metadata
      hasEnrichment: !!enrichmentPerson
    };
  });
  
  const filteredEmployees = mergedEmployees.filter(emp =>
    (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.primaryEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.currentTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.seniority?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">
                  People at {companyName}
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-medium">
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? 'person' : 'people'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1.5 transition-colors",
                    viewMode === 'table' ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Table View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 transition-colors",
                    viewMode === 'grid' ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <Button 
                size="sm" 
                onClick={() => setIsAddEmployeeDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 h-7 text-[11px] px-2"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input 
              placeholder="Search by name, title, seniority..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs border-slate-200"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading...</p>
          </CardContent>
        </Card>
      ) : filteredEmployees.length > 0 ? (
        viewMode === 'table' ? (
          /* TABLE VIEW */
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Person</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Title</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Contact</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Location</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow 
                      key={employee.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/contacts/${employee.id}`)}
                    >
                      {/* Person */}
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-slate-200">
                            <AvatarImage src={employee.photoUrl} alt={employee.name} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs font-bold">
                              {employee.name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 truncate">{employee.name}</p>
                              {employee.source_via_apollo && (
                                <Badge className="bg-blue-100 text-blue-700 text-[7px] px-1 py-0 h-3.5 border-blue-200" title="Found via Apollo.io organization match">
                                  Apollo
                                </Badge>
                              )}
                            </div>
                            {employee.seniority && (
                              <Badge className="bg-indigo-100 text-indigo-700 text-[8px] px-1 py-0 h-3.5 mt-0.5">
                                {employee.seniority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Title */}
                      <TableCell className="py-2">
                        <div className="max-w-[200px]">
                          <p className="text-xs text-slate-700 font-medium truncate">
                            {employee.currentTitle || '—'}
                          </p>
                          {employee.currentCompany && (
                            <p className="text-[10px] text-slate-500 truncate">{employee.currentCompany}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="py-2">
                        <div className="space-y-0.5">
                          {employee.primaryEmail ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span className="text-[11px] text-slate-600 truncate max-w-[150px]">
                                {employee.primaryEmail}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] text-slate-400">No email</span>
                            </div>
                          )}
                          {employee.primaryPhone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="text-[11px] text-slate-600">{employee.primaryPhone}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] text-slate-400">No phone</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-2">
                        {(employee.city || employee.state || employee.country) ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
                              {[employee.city, employee.state].filter(Boolean).join(', ') || employee.country}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          {employee.linkedinUrl && (
                            <a
                              href={employee.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-blue-50 rounded transition-colors"
                              title="LinkedIn"
                            >
                              <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/${employee.id}`);
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
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmployees.map((employee) => (
              <Card 
                key={employee.id}
                className="border-none shadow-sm hover:shadow-md transition-all group cursor-pointer"
                onClick={() => navigate(`/contacts/${employee.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarImage src={employee.photoUrl} alt={employee.name} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs font-bold">
                        {employee.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900 truncate">{employee.name}</h4>
                          {employee.source_via_apollo && (
                            <Badge className="bg-blue-100 text-blue-700 text-[7px] px-1 py-0 h-3" title="Via Apollo org">
                              Apollo
                            </Badge>
                          )}
                        </div>
                        {employee.hasEnrichment && (
                          <Badge className="bg-green-100 text-green-700 text-[7px] px-1 py-0 h-3">✓</Badge>
                        )}
                      </div>
                      
                      {employee.currentTitle && (
                        <p className="text-[10px] text-slate-600 font-medium truncate mb-1">{employee.currentTitle}</p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        <Mail className={cn("w-3 h-3", employee.primaryEmail ? "text-blue-500" : "text-slate-200")} />
                        <Phone className={cn("w-3 h-3", employee.primaryPhone ? "text-green-500" : "text-slate-200")} />
                        {employee.linkedinUrl && <Linkedin className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12 text-center">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 mb-1">No People Found</p>
            <p className="text-[10px] text-slate-500">
              {searchTerm ? 'Try different search terms' : 'Add your first person'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Person to {companyName}</DialogTitle>
            <DialogDescription className="text-xs">Create or link a person to this company.</DialogDescription>
          </DialogHeader>
          <AddNewCandidateAndAssociationForm 
            companyId={companyId} 
            onClose={() => { 
              setIsAddEmployeeDialogOpen(false); 
              onDataUpdate(); 
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesTab;