import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadcnCardDescription } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Edit, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// --- Tab Content & Detail Components ---
import { CompanyPrimaryDetails } from "@/components/sales/CompanyPrimaryDetails";
import { CompanyOverviewTab } from "@/components/sales/company-detail/CompanyOverviewTab";
import EmployeesTab from "@/components/sales/EmployeesTab";
import ContactsTab from "@/components/sales/ContactsTab";

// --- Dialog Forms ---
import CompanyEditForm from "@/components/sales/CompanyEditForm";
import { CandidateDetail } from "@/types/company";

const CompanyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); 
  const companyId = parseInt(id || "0");

  const user = useSelector((state: any) => state.auth.user);
  const currentUserId = user?.id || null;
  const [isSyncing, setIsSyncing] = useState(false);

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
  // Includes: direct company_id links + apollo_org_id matches
  const { data: allContacts = [], isLoading: isLoadingContacts, error: contactsError, refetch: refetchContacts } = useQuery({
    queryKey: ['company-contacts-all', companyId, company?.apollo_org_id],
    queryFn: async () => {
      // Method 1: Get contacts directly linked to this company
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

      // Method 2: If company has apollo_org_id, get contacts via enrichment_people match
      let apolloContacts: any[] = [];
      if (company?.apollo_org_id) {
        // Get enrichment_people records with matching apollo_org_id
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

        // Transform enriched people to contact format
        apolloContacts = (enrichedPeople || [])
          .filter((ep: any) => ep.contact) // Only include if contact exists
          .map((ep: any) => ({
            ...ep.contact,
            // Merge with enrichment_people data
            enrichment_people: [ep],
            enrichment_contact_emails: ep.contact.enrichment_contact_emails,
            enrichment_contact_phones: ep.contact.enrichment_contact_phones,
            enrichment_raw_responses: ep.contact.enrichment_raw_responses,
            source_via_apollo: true // Flag to identify source
          }));
      }

      // Merge both sources, removing duplicates by contact.id
      const contactMap = new Map();
      
      // Add direct contacts first (priority)
      (directContacts || []).forEach((contact: any) => {
        contactMap.set(contact.id, contact);
      });
      
      // Add apollo contacts (skip if already exists)
      apolloContacts.forEach((contact: any) => {
        if (!contactMap.has(contact.id)) {
          contactMap.set(contact.id, contact);
        }
      });
      
      // Transform to CandidateDetail interface
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
        // Include enrichment data
        enrichment_people: contact.enrichment_people,
        enrichment_contact_emails: contact.enrichment_contact_emails,
        enrichment_contact_phones: contact.enrichment_contact_phones,
        enrichment_raw_responses: contact.enrichment_raw_responses
      }));
    },
    enabled: !!companyId && !!company
  });

  // Separate employees from general contacts
  const employees = allContacts.filter(c => 
    c.source_table === 'employee_associations' || 
    c.source_table === 'contacts' && !c.is_primary_contact
  );
  
  const contacts = allContacts.filter(c => 
    c.source_table === 'contacts' && c.is_primary_contact
  );

  // If no is_primary_contact flag, show all in employees tab
  const employeesToShow = employees.length > 0 ? employees : allContacts;
  const contactsToShow = contacts.length > 0 ? contacts : [];

  const [activeTab, setActiveTab] = useState('overview');
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);

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
      
      // Check if we should use ID or Domain
      if (company?.apollo_org_id) {
        // USE ID-BASED ENRICHMENT
        const result = await supabase.functions.invoke('enrich-org-by-id', {
          body: { 
            apolloOrgId: company.apollo_org_id, 
            companyId: company.id,
            internalOrgId: company.organization_id
          }
        });
        error = result.error;
      } else if (company?.website || company?.domain) {
        // USE DOMAIN-BASED ENRICHMENT
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

      // Update intelligence_last_synced timestamp
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
      <div className="p-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-slate-500 mt-4">Loading company details...</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CompanyOverviewTab company={company} refetchParent={refetchCompany} />;
      case 'employees':
        return (
          <EmployeesTab 
            employees={employeesToShow} 
            isLoading={isLoadingContacts} 
            companyId={companyId} 
            companyName={company.name} 
            onEditEmployee={(employee) => {
              // Navigate to contact detail for editing
              navigate(`/contacts/${employee.id}`);
            }} 
            onDataUpdate={handleDataUpdate} 
          />
        );
      case 'contacts':
        return <ContactsTab contacts={contactsToShow} isLoading={isLoadingContacts} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50/70 min-h-screen">
      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b sticky top-0 z-20">
        <header className="max-w-screen-2xl mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="h-9 w-9 text-gray-600 hover:text-black"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                <AvatarFallback>{company.name?.charAt(0).toUpperCase() || 'C'}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">{company.name}</h1>
                {company.intelligence_last_synced && (
                  <p className="text-xs text-slate-500">
                    Last synced: {new Date(company.intelligence_last_synced).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshIntelligence}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isSyncing ? 'Syncing...' : 'Refresh Intelligence'}
            </Button>
            <Button variant="default" onClick={() => setIsCompanyEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </Button>
          </div>
        </header>
      </div>

      <main className="max-w-screen-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* --- TABS UI (Pill Format) --- */}
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-1.5 shadow-sm inline-flex items-center space-x-1 border">
            {[
              { id: 'overview', label: 'Company Intelligence', icon: <Sparkles className="h-4 w-4" /> },
              { id: 'employees', label: 'People', count: employeesToShow.length },
              { id: 'contacts', label: 'Key Contacts', count: contactsToShow.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500
                  ${activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-purple-50'
                  }
                `}
              >
                {tab.icon && tab.icon}
                {tab.label}
                {typeof tab.count === 'number' && (
                  <span className={`
                    w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold
                    ${activeTab === tab.id
                      ? 'bg-white/25 text-white'
                      : 'bg-gray-200 text-purple-700'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* --- TWO-COLUMN LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <CompanyPrimaryDetails company={company} />
          </div>
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* --- DIALOGS --- */}
      <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Edit {company.name}</DialogTitle>
            <ShadcnCardDescription>Update company information.</ShadcnCardDescription>
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