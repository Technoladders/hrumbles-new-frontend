import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyDetails, useCompanyEmployees, useFetchCompanyDetails } from "@/hooks/use-companies";
import { supabase } from "@/integrations/supabase/client";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadcnCardDescription } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Edit, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// --- Tab Content & Detail Components ---
import CompanyPrimaryDetails from "@/components/sales/CompanyPrimaryDetails";
import CompanyFinancials from "@/components/sales/CompanyFinancials";
import EmployeesTab from "@/components/sales/EmployeesTab";
import ContactsTab from "@/components/sales/ContactsTab";
import LocationsTab from "@/components/sales/LocationsTab";

// --- Dialog Forms ---
import CompanyEditForm from "@/components/sales/CompanyEditForm";
import EmployeeAssociationEditForm from "@/components/sales/EmployeeAssociationEditForm";
import CandidateCompanyEditForm from "@/components/sales/CandidateCompanyEditForm";
import { CandidateDetail, CompanyDetail as CompanyDetailType } from "@/types/company";

const CompanyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); 
  const companyId = parseInt(id || "0");

  const fetchCompanyDetailsAI = useFetchCompanyDetails();
  const user = useSelector((state: any) => state.auth.user);
  const currentUserId = user?.id || null;
  const [isFetchingAIDetails, setIsFetchingAIDetails] = useState(false);

  const { data: company, isLoading, error: companyError, refetch: refetchCompany } = useCompanyDetails(companyId);
  const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError, refetch: refetchEmployees } = useCompanyEmployees(companyId);

  const [activeTab, setActiveTab] = useState('overview');
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<CandidateDetail | null>(null);

  useEffect(() => {
    if (companyError) toast({ title: "Error Loading Company", description: companyError.message, variant: "destructive" });
    if (employeesError) toast({ title: "Error Loading Employees", description: employeesError.message, variant: "destructive" });
  }, [companyError, employeesError, toast]);

  const handleDataUpdate = () => {
    refetchCompany();
    refetchEmployees();
  };

  const handleRefreshAIData = async () => {
    if (!company?.name) {
      toast({ title: "Error", description: "Company name is required for AI fetch.", variant: "destructive" });
      return;
    }
    setIsFetchingAIDetails(true);
    try {
      const detailsFromAI = await fetchCompanyDetailsAI(company.name);
      const updatesToApply: Partial<CompanyDetailType> = {};

      if (detailsFromAI.name && detailsFromAI.name !== company.name) updatesToApply.name = detailsFromAI.name;
      if (detailsFromAI.start_date) updatesToApply.start_date = detailsFromAI.start_date;
      if (detailsFromAI.founded_as) updatesToApply.founded_as = detailsFromAI.founded_as;
      if (typeof detailsFromAI.employee_count === 'number') updatesToApply.employee_count = detailsFromAI.employee_count;
      if (detailsFromAI.employee_count_date) updatesToApply.employee_count_date = detailsFromAI.employee_count_date;
      if (detailsFromAI.address) updatesToApply.address = detailsFromAI.address;
      if (detailsFromAI.website) updatesToApply.website = detailsFromAI.website;
      if (detailsFromAI.linkedin) updatesToApply.linkedin = detailsFromAI.linkedin;
      if (detailsFromAI.industry) updatesToApply.industry = detailsFromAI.industry;
      if (detailsFromAI.location) updatesToApply.location = detailsFromAI.location;
      if (detailsFromAI.stage) updatesToApply.stage = detailsFromAI.stage;
      if (detailsFromAI.about) updatesToApply.about = detailsFromAI.about;
      if (detailsFromAI.logo_url && typeof detailsFromAI.logo_url === 'string' && detailsFromAI.logo_url.trim() !== '') {
        updatesToApply.logo_url = detailsFromAI.logo_url;
      }
      if (typeof detailsFromAI.revenue === 'string') updatesToApply.revenue = detailsFromAI.revenue;
      const cashFlowValue = detailsFromAI.cashflow;
      if (typeof cashFlowValue === 'number') updatesToApply.cashflow = cashFlowValue;
      if (Array.isArray(detailsFromAI.competitors) && detailsFromAI.competitors.length > 0) updatesToApply.competitors = detailsFromAI.competitors;
      if (Array.isArray(detailsFromAI.products) && detailsFromAI.products.length > 0) updatesToApply.products = detailsFromAI.products;
      if (Array.isArray(detailsFromAI.services) && detailsFromAI.services.length > 0) updatesToApply.services = detailsFromAI.services;
      if (detailsFromAI.key_people === "-" || (Array.isArray(detailsFromAI.key_people) && detailsFromAI.key_people.length > 0)) {
        updatesToApply.key_people = detailsFromAI.key_people;
      }

      if (Object.keys(updatesToApply).length > 0) {
        updatesToApply.updated_by = currentUserId;
        updatesToApply.updated_at = new Date().toISOString(); 
        
        const { error: updateError } = await supabase.from('companies').update(updatesToApply).eq('id', companyId);
        if (updateError) throw updateError;
        
        refetchCompany();
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        toast({ title: "Success", description: "Company details refreshed from AI." });
      } else {
        toast({ title: "No New Data", description: "AI did not provide new or different details to update." });
      }
    } catch (fetchError: any) {
      toast({ title: "AI Fetch Error", description: `Operation failed: ${fetchError.message}`, variant: "destructive" });
    } finally {
      setIsFetchingAIDetails(false);
    }
  };
  
  const handleEditEmployeeClick = (employee: CandidateDetail) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  };
  
  const handleCloseEditEmployeeDialog = () => {
    setIsEditEmployeeDialogOpen(false);
    setTimeout(() => setEditingEmployee(null), 300);
  };

  if (isLoading || !company) {
    return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  const contacts = employees.filter(e => e.source_table === 'contacts');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CompanyFinancials company={company} />;
      case 'employees':
        return <EmployeesTab employees={employees} isLoading={isLoadingEmployees} companyId={companyId} companyName={company.name} onEditEmployee={handleEditEmployeeClick} onDataUpdate={handleDataUpdate} />;
      case 'contacts':
        return <ContactsTab contacts={contacts} isLoading={isLoadingEmployees} />;
      case 'locations':
        return <LocationsTab company={company} />;
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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-gray-600 hover:text-black">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                <AvatarFallback>{company.name?.charAt(0).toUpperCase() || 'C'}</AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-semibold text-gray-800">{company.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button
              variant="outline"
              onClick={handleRefreshAIData}
              disabled={isFetchingAIDetails}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingAIDetails ? 'animate-spin' : ''}`} />
              {isFetchingAIDetails ? 'Refreshing...' : 'Refresh AI Data'}
            </Button>
            <Button variant="default" onClick={() => setIsCompanyEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />Edit Company
            </Button>
          </div>
        </header>
      </div>

      <main className="max-w-screen-2xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* --- TABS UI (Pill Format) --- */}
        <div className="flex justify-center">
            <div className="bg-white rounded-full p-1.5 shadow-sm inline-flex items-center space-x-1 border">
                {[
                { id: 'overview', label: 'Overview' },
                { id: 'employees', label: 'Associate Employees', count: employees.length },
                { id: 'contacts', label: 'Contacts', count: contacts.length },
                { id: 'locations', label: 'Locations' },
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
          <CompanyEditForm company={company} onClose={() => { setIsCompanyEditDialogOpen(false); handleDataUpdate(); }} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditEmployeeDialogOpen} onOpenChange={handleCloseEditEmployeeDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Edit Employee Association</DialogTitle>
            <ShadcnCardDescription>Update details for {editingEmployee?.name} at {company?.name}.</ShadcnCardDescription>
          </DialogHeader>
          {editingEmployee && (
            editingEmployee.source_table === 'employee_associations' ? (
              <EmployeeAssociationEditForm employee={editingEmployee} onClose={() => { handleCloseEditEmployeeDialog(); handleDataUpdate(); }} />
            ) : (
              <CandidateCompanyEditForm employee={editingEmployee} onClose={() => { handleCloseEditEmployeeDialog(); handleDataUpdate(); }} />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDetail;