// Hrumbles-Front-End_UI/src/pages/sales/CompanyDetail.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// UI Components & Icons
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, Edit, RefreshCw, ListPlus, Sparkles, Link2, MapPin } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Tab Content & Detail Components
import { CompanyPrimaryDetails } from "@/components/sales/CompanyPrimaryDetails";
import { CompanyOverviewTab } from "@/components/sales/company-detail/CompanyOverviewTab";
import EmployeesTab from "@/components/sales/EmployeesTab";

// Dialog Forms
import CompanyEditForm from "@/components/sales/CompanyEditForm";

const CompanyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); 
  const companyId = parseInt(id || "0");

  const user = useSelector((state: any) => state.auth.user);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);

  // Fetch company with all enrichment data
  const { data: company, isLoading, error: companyError, refetch: refetchCompany } = useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          enrichment_organizations(
            *,
            enrichment_org_departments(*),
            enrichment_org_technologies(*),
            enrichment_org_keywords(*),
            enrichment_org_funding_events(*)
          ),
          enrichment_org_raw_responses(*)
        `)
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  // Fetch ALL contacts associated with this company
  const { data: allContacts = [], isLoading: isLoadingContacts, error: contactsError, refetch: refetchContacts } = useQuery({
    queryKey: ['company-contacts-all', companyId, company?.apollo_org_id],
    queryFn: async () => {
      const { data: directContacts, error: directError } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(
            *,
            enrichment_person_metadata(*),
            enrichment_employment_history(*),
            enrichment_organizations(*)
          ),
          enrichment_contact_emails(*),
          enrichment_contact_phones(*),
          enrichment_raw_responses(*)
        `)
        .eq('company_id', companyId);
      
      if (directError) throw directError;

      let apolloContacts: any[] = [];
      if (company?.apollo_org_id) {
        const { data: enrichedPeople, error: enrichError } = await supabase
          .from('enrichment_people')
          .select(`
            *,
            contact:contact_id(
              *,
              enrichment_contact_emails(*),
              enrichment_contact_phones(*),
              enrichment_raw_responses(*)
            ),
            enrichment_person_metadata(*),
            enrichment_employment_history(*),
            enrichment_organizations(*)
          `)
          .eq('apollo_org_id', company.apollo_org_id)
          .not('contact_id', 'is', null);
        
        if (enrichError) throw enrichError;

        apolloContacts = (enrichedPeople || [])
          .filter((ep: any) => ep.contact)
          .map((ep: any) => ({
            ...ep.contact,
            enrichment_people: [ep],
            enrichment_contact_emails: ep.contact.enrichment_contact_emails,
            enrichment_contact_phones: ep.contact.enrichment_contact_phones,
            enrichment_raw_responses: ep.contact.enrichment_raw_responses,
            source_via_apollo: true
          }));
      }

      const contactMap = new Map();
      (directContacts || []).forEach((contact: any) => {
        contactMap.set(contact.id, contact);
      });
      apolloContacts.forEach((contact: any) => {
        if (!contactMap.has(contact.id)) {
          contactMap.set(contact.id, contact);
        }
      });
      
      return Array.from(contactMap.values()).map((contact: any) => ({
        ...contact,
        id: contact.id,
        name: contact.name || contact.full_name,
        email: contact.email,
        mobile: contact.mobile,
        phone_number: contact.phone_number,
        designation: contact.job_title || contact.designation,
        job_title: contact.job_title,
        linkedin: contact.linkedin_url,
        photo_url: contact.photo_url,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        contact_stage: contact.contact_stage,
        source_table: contact.source_table || 'contacts',
        source_via_apollo: contact.source_via_apollo || false,
        enrichment_people: contact.enrichment_people,
        enrichment_contact_emails: contact.enrichment_contact_emails,
        enrichment_contact_phones: contact.enrichment_contact_phones,
        enrichment_raw_responses: contact.enrichment_raw_responses
      }));
    },
    enabled: !!companyId && !!company
  });

  const employees = allContacts.filter(c => 
    c.source_table === 'employee_associations' || 
    (c.source_table === 'contacts' && !c.is_primary_contact)
  );
  
  const contacts = allContacts.filter(c => 
    c.source_table === 'contacts' && c.is_primary_contact
  );

  const employeesToShow = employees.length > 0 ? employees : allContacts;
  const contactsToShow = contacts.length > 0 ? contacts : [];

  useEffect(() => {
    if (companyError) toast({ title: "Error Loading Company", description: companyError.message, variant: "destructive" });
    if (contactsError) toast({ title: "Error Loading Contacts", description: contactsError.message, variant: "destructive" });
  }, [companyError, contactsError, toast]);

  const handleDataUpdate = () => {
    refetchCompany();
    refetchContacts();
  };

  const handleRefreshIntelligence = async () => {
    setIsSyncing(true);
    try {
      let error;
      
      if (company?.apollo_org_id) {
        const result = await supabase.functions.invoke('enrich-org-by-id', {
          body: { 
            apolloOrgId: company.apollo_org_id, 
            companyId: company.id,
            internalOrgId: company.organization_id
          }
        });
        error = result.error;
      } else if (company?.website || company?.domain) {
        const websiteUrl = company.website || company.domain;
        const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        
        const result = await supabase.functions.invoke('enrich-organization', {
          body: { domain, companyId: company.id }
        });
        error = result.error;
      } else {
        throw new Error("Cannot sync: Missing both Apollo ID and Website/Domain.");
      }

      if (error) throw error;

      await supabase
        .from('companies')
        .update({ intelligence_last_synced: new Date().toISOString() })
        .eq('id', companyId);
      
      toast({ title: "Success", description: "Company intelligence refreshed from Apollo.io" });
      refetchCompany();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (fetchError: any) {
      toast({ 
        title: "Intelligence Sync Failed", 
        description: fetchError.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !company) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-4">Loading company details...</p>
        </div>
      </div>
    );
  }

  const enrichment = company?.enrichment_organizations;
  const location = [
    enrichment?.city || company.location?.split(',')[0],
    enrichment?.country
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header - Apollo Style */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button 
              onClick={() => navigate('/companies')}
              className="hover:text-gray-700"
            >
              Companies
            </button>
            <span>›</span>
            <span className="text-gray-900">{company.name}</span>
          </div>
          
          {/* Company Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-gray-200">
                <AvatarImage src={company.logo_url || enrichment?.logo_url} alt={company.name} />
                <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                  {company.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ListPlus size={16} className="text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Link2 size={16} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>{enrichment?.industry || company.industry}</span>
                  {location && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {location}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-sm font-medium"
              >
                <ListPlus size={14} className="mr-1.5" />
                Add to list
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleRefreshIntelligence}
                disabled={isSyncing}
                className="h-9 px-4 bg-[#FFDE59] hover:bg-[#FFD633] text-gray-900 border border-[#E5C84F]"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={14} className="mr-1.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-1.5" />
                    Enrich Company
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - No tabs anymore */}
      <div className="flex">
        {/* Left Sidebar - Company Details + People */}
        <aside className="w-[360px] min-w-[360px] border-r border-gray-200 bg-white min-h-[calc(100vh-76px)] overflow-y-auto">
          <CompanyPrimaryDetails company={company} employees={employeesToShow}
    isLoadingEmployees={isLoadingContacts}
    companyId={companyId}
    companyName={company.name}
    onEditEmployee={(emp) => navigate(`/contacts/${emp.id}`)}
    onDataUpdate={handleDataUpdate} />
          
          {/* People / Employees section */}
          {/* <div className="border-t border-gray-200 mt-2">
            <EmployeesTab 
              employees={employeesToShow} 
              isLoading={isLoadingContacts} 
              companyId={companyId} 
              companyName={company.name} 
              onEditEmployee={(employee) => navigate(`/contacts/${employee.id}`)} 
              onDataUpdate={handleDataUpdate} 
              variant="sidebar"   // ← optional prop if you want to adjust layout/style
            />
          </div> */}
        </aside>

        {/* Main Content Area - Overview / Insights only */}
        <main className="flex-1 min-w-0 bg-white">
          <div className="p-6">
            <CompanyOverviewTab 
              company={company} 
              refetchParent={refetchCompany} 
              employees={employeesToShow}
      isLoadingEmployees={isLoadingContacts}
      onEditEmployee={(employee) => navigate(`/contacts/${employee.id}`)}
      refetchParent={refetchCompany}
            />
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Edit {company.name}</DialogTitle>
            <DialogDescription>Update company information.</DialogDescription>
          </DialogHeader>
          <CompanyEditForm 
            company={company} 
            onClose={() => { 
              setIsCompanyEditDialogOpen(false); 
              handleDataUpdate(); 
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDetail;