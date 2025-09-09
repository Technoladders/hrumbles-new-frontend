import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompanyDetails, useCompanyEmployees } from "@/hooks/use-companies";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ShadcnCardDescription } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
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
import { CandidateDetail } from "@/types/company";

const CompanyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companyId = parseInt(id || "0");

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/companies")} className="h-9 w-9 text-gray-600 hover:text-black">
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
            <Button variant="outline" onClick={() => setIsCompanyEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />Edit Company
            </Button>
          </div>
        </header>
      </div>

      <main className="max-w-screen-8xl mx-auto p-4 md:p-6 space-y-6">
        {/* --- TABS UI --- */}
        <div className="border-b border-gray-200 bg-white/50 backdrop-blur-sm rounded-t-lg p-2 sticky top-[73px] z-10">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Overview
            </button>
            <button onClick={() => setActiveTab('employees')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'employees' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Associate Employees ({employees.length})
            </button>
            <button onClick={() => setActiveTab('contacts')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'contacts' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Contacts ({contacts.length})
            </button>
            <button onClick={() => setActiveTab('locations')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'locations' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Locations
            </button>
          </nav>
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