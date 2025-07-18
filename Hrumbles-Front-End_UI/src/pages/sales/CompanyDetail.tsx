
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCompanyDetails,
  useCompanyEmployees,
  useFetchCompanyDetails,
} from "@/hooks/use-companies";
import {
  Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft,
  RefreshCw, Search, UserPlus, Users as UsersIcon,
  DollarSign, TrendingUp, Briefcase, Lightbulb, Users2 as KeyPeopleIcon,
  Puzzle, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EmployeeTable from "@/components/sales/EmployeeTable";
import CompanyEditForm from "@/components/sales/CompanyEditForm";
import AddNewCandidateAndAssociationForm from "@/components/sales/AddNewCandidateAndAssociationForm";
import CandidateCompanyEditForm from "@/components/sales/CandidateCompanyEditForm";
import EmployeeAssociationEditForm from "@/components/sales/EmployeeAssociationEditForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CompanyDetail as CompanyDetailType, CandidateDetail } from "@/types/company";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSelector } from 'react-redux';

// Helper to format currency
const formatCurrency = (
  value: number | string | null | undefined,
  currencySymbol: string = '$'
): string => {
  if (value === null || value === undefined) return "N/A";
  let numericValue: number;
  if (typeof value === 'string') {
    try {
      let numStr = value.replace(/[$,€£¥₹,\s]/g, '');
      let multiplier = 1;
      const upperStr = numStr.toUpperCase();
      if (upperStr.endsWith('B')) { multiplier = 1e9; numStr = numStr.slice(0, -1); }
      else if (upperStr.endsWith('M')) { multiplier = 1e6; numStr = numStr.slice(0, -1); }
      else if (upperStr.endsWith('K')) { multiplier = 1e3; numStr = numStr.slice(0, -1); }
      if (numStr === '' || numStr.toUpperCase() === 'N/A') return "N/A";
      numericValue = parseFloat(numStr);
      if (isNaN(numericValue)) return "N/A";
      numericValue *= multiplier;
    } catch (e) {
      console.warn("Currency parsing error:", value, e);
      return "N/A";
    }
  } else if (typeof value === 'number') {
    if (isNaN(value)) return "N/A";
    numericValue = value;
  } else {
    return "N/A";
  }

  if (Math.abs(numericValue) >= 1_000_000_000) return `${currencySymbol}${(numericValue / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(numericValue) >= 1_000_000) return `${currencySymbol}${(numericValue / 1_000_000).toFixed(1)}M`;
  if (Math.abs(numericValue) >= 1_000) return `${currencySymbol}${(numericValue / 1_000).toFixed(0)}K`;
  return `${currencySymbol}${numericValue.toFixed(0)}`;
};

// Helper to format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (/^\d{4}$/.test(dateString)) return dateString;
      if (/^[A-Za-z]{3,}\s\d{1,2},\s\d{4}$/.test(dateString)) return dateString;
      return "N/A";
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    console.warn("Date formatting error:", dateString, e);
    return dateString;
  }
};

// Reusable Info Item Component
const InfoItem: React.FC<{ icon: React.ElementType, label: string, value?: string | React.ReactNode | null, className?: string }> = ({ icon: Icon, label, value, className }) => {
  const displayValue = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === 'string' && val.trim() === '') return "N/A";
    if (typeof val === 'number' && isNaN(val)) return "N/A";
    return val;
  };
  const finalValue = displayValue(value);
  const hasActualValue = finalValue !== "N/A";

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${hasActualValue ? 'text-primary' : 'text-muted-foreground/60'}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {React.isValidElement(finalValue) ? finalValue : <p className={`text-sm font-medium ${hasActualValue ? 'text-foreground' : 'text-muted-foreground'} break-words`}>{String(finalValue)}</p>}
      </div>
    </div>
  );
};

const CompanyDetail = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id || "0");
  const queryClient = useQueryClient();
    const user = useSelector((state: any) => state.auth.user);
      const currentUserId = user?.id || null;

  const { data: company, isLoading, error: companyError, refetch } = useCompanyDetails(companyId);
  const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useCompanyEmployees(companyId);
  const fetchCompanyDetailsAI = useFetchCompanyDetails();

  const [isFetchingAIDetails, setIsFetchingAIDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<CandidateDetail | null>(null);

  const handleCloseCompanyEditDialog = () => setIsCompanyEditDialogOpen(false);

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
        refetch();
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

  const handleAddEmployeeClick = () => setIsAddEmployeeDialogOpen(true);
  const handleCloseAddEmployeeDialog = () => setIsAddEmployeeDialogOpen(false);
  const handleEditEmployeeClick = (employee: CandidateDetail) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  };
  const handleCloseEditEmployeeDialog = () => {
    setIsEditEmployeeDialogOpen(false);
    setTimeout(() => setEditingEmployee(null), 300);
  };

  useEffect(() => {
    if (companyError) {
      toast({ title: "Error Loading Company", description: companyError.message, variant: "destructive" });
      console.error("Company error:", companyError);
    }
    if (employeesError) {
      toast({ title: "Error Loading Employees", description: employeesError.message, variant: "destructive" });
      console.error("Employees error:", employeesError);
    }
  }, [companyError, employeesError, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <p className="text-xl">Loading Company Details...</p>
      </div>
    );
  }
  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
          <Button asChild>
            <Link to="/companies">Back to Companies List</Link>
          </Button>
        </div>
      </div>
    );
  }

  const lastUpdated = company.last_updated ? formatDate(company.last_updated) : formatDate(company.created_at);
  const competitorsArray = company.competitors || [];
  const productsArray = company.products || [];
  const servicesArray = company.services || [];
  const keyPeople = company.key_people || "-";

  const filteredEmployees = employees.filter(emp =>
    (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild className="h-9 flex-shrink-0">
              <Link to="/companies">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                <AvatarFallback>{company.name?.charAt(0).toUpperCase() || 'C'}</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{company.name}</h1>
            </div>
          </div>
          <div className="flex gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              onClick={handleRefreshAIData}
              disabled={isFetchingAIDetails}
              className="h-9 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingAIDetails ? 'animate-spin' : ''}`} />
              {isFetchingAIDetails ? 'Refreshing...' : 'Refresh AI Data'}
            </Button>
            <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 flex items-center gap-2">
                  <Edit className="h-4 w-4" /> Edit Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                  <DialogTitle>Edit {company.name}</DialogTitle>
                  <ShadcnCardDescription>Update company information.</ShadcnCardDescription>
                </DialogHeader>
                <CompanyEditForm company={company} onClose={handleCloseCompanyEditDialog} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="company_info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex mb-6 bg-muted p-1 rounded-lg">
            <TabsTrigger
              value="company_info"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-1.5"
            >
              Company Information
            </TabsTrigger>
            <TabsTrigger
              value="employees"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-1.5"
            >
              Associated Employees ({employees?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Company Information Tab */}
          <TabsContent value="company_info">
            <Card className="shadow-lg border-border">
              <CardHeader className="border-b border-border pb-3 pt-4 px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <CardTitle className="text-lg flex items-center gap-2 font-semibold text-foreground">
                    <Briefcase className="h-5 w-5 text-primary" /> Company Information
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 sm:mt-0">Last updated: {lastUpdated}</p>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {(company.about && company.about.trim() !== "") && (
                  <div className="pb-4 border-b border-border">
                    <h3 className="text-base font-semibold mb-1.5 text-foreground">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {company.about}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 pt-2">
                  <div className="space-y-4">
                    <InfoItem icon={Building2} label="Industry" value={company.industry} />
                    <InfoItem
                      icon={Calendar}
                      label="Founded"
                      value={`${formatDate(company.start_date)}${company.founded_as ? ` (${company.founded_as})` : ''}`}
                    />
                    <InfoItem icon={DollarSign} label="Revenue" value={formatCurrency(company.revenue)} />
                    <InfoItem icon={TrendingUp} label="Cash Flow" value={formatCurrency(company.cashflow)} />
                    <InfoItem icon={User} label="Account Owner" value={company.account_owner} />
                  </div>
                  <div className="space-y-4">
                    <InfoItem
                      icon={UsersIcon}
                      label="Company Size"
                      value={`${company.employee_count?.toLocaleString() || "N/A"}${company.employee_count_date ? ` (as of ${formatDate(company.employee_count_date)})` : ''}`}
                    />
                    <InfoItem icon={MapPin} label="Headquarters" value={company.location || company.address} />
                    <InfoItem
                      icon={Globe}
                      label="Website"
                      value={
                        company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all"
                          >
                            {company.website}
                          </a>
                        ) : "N/A"
                      }
                    />
                    <InfoItem
                      icon={Linkedin}
                      label="LinkedIn"
                      value={
                        company.linkedin ? (
                          <a
                            href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all"
                          >
                            {company.linkedin}
                          </a>
                        ) : "N/A"
                      }
                    />
                  </div>
                </div>

                {competitorsArray.length > 0 && (
                  <div className="pt-5 border-t border-border mt-5">
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <Puzzle className="h-4 w-4 text-primary" /> Competitors
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {competitorsArray.map((item: string, index: number) => (
                        <Badge key={`${item}-${index}`} variant="secondary" className="font-normal text-xs px-2 py-0.5">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {productsArray.length > 0 && (
                  <div className="pt-5 border-t border-border mt-5">
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <Lightbulb className="h-4 w-4 text-primary" /> Products
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {productsArray.map((item: string, index: number) => (
                        <Badge key={`${item}-${index}`} variant="outline" className="font-normal text-xs px-2 py-0.5">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {servicesArray.length > 0 && (
                  <div className="pt-5 border-t border-border mt-5">
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <ListChecks className="h-4 w-4 text-primary" /> Services
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {servicesArray.map((item: string, index: number) => (
                        <Badge
                          key={`${item}-${index}`}
                          variant="outline"
                          className="font-normal text-xs px-2 py-0.5 bg-blue-50 border-blue-200 text-blue-700"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-5 border-t border-border mt-5">
                  <h3 className="text-base font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <KeyPeopleIcon className="h-4 w-4 text-primary" /> Key People
                  </h3>
                  {keyPeople === "-" ? (
                    <p className="text-sm text-muted-foreground">-</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {keyPeople.map((person: any, index: number) => (
                        <li key={`${person.name}-${index}`} className="text-sm">
                          <span className="font-medium text-foreground">{person.name}</span> –{' '}
                          <span className="text-muted-foreground">{person.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Associated Employees Tab */}
          <TabsContent value="employees">
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg">Associated Employees</CardTitle>
                  <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8" onClick={handleAddEmployeeClick}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add Association
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-6">
                      <DialogHeader>
                        <DialogTitle>Add New Candidate & Associate</DialogTitle>
                        <ShadcnCardDescription>Create/find candidate and link to {company?.name}.</ShadcnCardDescription>
                      </DialogHeader>
                      <AddNewCandidateAndAssociationForm companyId={companyId} onClose={handleCloseAddEmployeeDialog} />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingEmployees ? (
                  <div className="text-center py-10 text-muted-foreground">Loading employees...</div>
                ) : employeesError ? (
                  <div className="text-center py-10 text-red-600">Error: {employeesError.message}</div>
                ) : (
                  <EmployeeTable employees={filteredEmployees} onEdit={handleEditEmployeeClick} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Employee Association Modal */}
        <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Edit Employee Association</DialogTitle>
              <ShadcnCardDescription>
                Update details for {editingEmployee?.name ?? 'this employee'} at {company?.name}.
              </ShadcnCardDescription>
            </DialogHeader>
            {editingEmployee && (
              editingEmployee.source_table === 'employee_associations' ? (
                <EmployeeAssociationEditForm employee={editingEmployee} onClose={handleCloseEditEmployeeDialog} />
              ) : (
                <CandidateCompanyEditForm employee={editingEmployee} onClose={handleCloseEditEmployeeDialog} />
              )
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default CompanyDetail;