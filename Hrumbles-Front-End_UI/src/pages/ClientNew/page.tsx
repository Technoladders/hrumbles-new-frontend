// src/pages/ClientNew/page.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '@/config/supabaseClient';
import { useSelector } from 'react-redux';
import { useToast } from '@/components/ui/use-toast';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ClientEditDialog } from '@/components/clients-new/ClientEditDialog';
import { ContactFormDialog } from '@/components/clients-new/ContactFormDialog';
import { AddressEditDialog, EditingAddress } from '@/components/clients-new/AddressEditDialog';

import { Button } from '@/components/ui/button';
import OverviewTab from '@/components/clients-new/OverviewTab';
import CandidatesTab from '@/components/clients-new/CandidatesTab';
import EmployeesTab from '@/components/clients-new/EmployeesTab';
import AllCandidatesTab from '@/components/clients-new/AllCandidatesTab';
import { CheckCircle, HelpCircle, Loader2, MoreVertical, ArrowLeft } from 'lucide-react';
import { CompanyVerificationDialog } from '@/components/clients-new/CompanyVerificationDialog';
import { DateRangePickerField } from '@/components/ui/DateRangePickerField';
import { Client, ClientContact, ClientMetrics, Candidate, Employee, Job, TimeLog, MonthlyData, HiresByMonth, StatusMap, RecruiterPerformance, PipelineStage } from '@/components/clients-new/ClientTypes';

// --- CONSTANTS ---
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";
const OFFERED_STATUS_ID = "9d4e0b82-0774-4e3b-bb1e-96bc2743f96e"; // Assuming a typo fix from previous
const JOINED_SUB_STATUS_ID = "c9716374-3477-4606-877a-dfa5704e7680";
const OFFER_ISSUED_SUB_STATUS_ID = "bcc84d3b-fb76-4912-86cc-e95448269d6b";
const USD_TO_INR_RATE = 84;

const ClientViewPage = () => {
    const { clientName: clientNameParam } = useParams<{ clientName: string }>();
    const clientName = decodeURIComponent(clientNameParam || "");
    const navigate = useNavigate();
    const { toast } = useToast();
    const organization_id = useSelector((state: any) => state.auth.organization_id);
    const auth_user_id = useSelector((state: any) => state.auth.user.id);

    const [activeTab, setActiveTab] = useState('overview');
   const [isClientEditDialogOpen, setClientEditDialogOpen] = useState(false); // For main client details
    const [isContactDialogOpen, setContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
    const [isAddressDialogOpen, setAddressDialogOpen] = useState(false); // New state for address dialog
    const [editingAddress, setEditingAddress] = useState<EditingAddress | null>(null); // New state for address 
    
    const [client, setClient] = useState<Client | null>(null);
    const [contacts, setContacts] = useState<ClientContact[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [metrics, setMetrics] = useState<ClientMetrics>({ candidateRevenue: 0, candidateProfit: 0, employeeRevenueINR: 0, employeeProfitINR: 0 });
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
    const [hiresByMonth, setHiresByMonth] = useState<HiresByMonth[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
   // Update the initial dateRange state
const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null; key: string } | null>(null);

    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [verificationResults, setVerificationResults] = useState<any[]>([]);

    // --- CALCULATION LOGIC (No changes, remains correct) ---
    // ... (parseSalary, calculateCandidateProfit, etc. all remain here) ...
     const parseSalary = (salaryStr?: string): number => {
        if (!salaryStr) return 0;
        const isUSD = salaryStr.startsWith('$');
        const parts = salaryStr.replace(/[$,₹]/g, "").trim().split(" ");
        let amount = parseFloat(parts[0]) || 0;
        const budgetType = parts[1]?.toLowerCase() || "lpa";
        if (isUSD) amount *= USD_TO_INR_RATE;
        if (budgetType === "monthly") amount *= 12; else if (budgetType === "hourly") amount *= 2016;
        return amount;
    };
    const calculateCandidateProfit = (candidate: Candidate, job: Job, clientData: Client): number => {
        let commissionValue = clientData.commission_value || 0;
        const salaryAmount = parseSalary(candidate.ctc);
        if (clientData.currency === "USD" && clientData.commission_type === "fixed") commissionValue *= USD_TO_INR_RATE;
        if (job.job_type_category === "Internal") return parseSalary(candidate.accrual_ctc) - salaryAmount;
        if (clientData.commission_type === "percentage") return (salaryAmount * commissionValue) / 100;
        if (clientData.commission_type === "fixed") return commissionValue;
        return 0;
    };
    const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]) => timeLogs.filter(log => log.employee_id === employeeId).reduce((acc, log) => acc + (log.project_time_data?.projects?.find(p => p.projectId === projectId)?.hours || 0), 0);
    const convertToHourly = (amount: number, type: string, currency: string) => {
        if (currency === "USD") amount *= USD_TO_INR_RATE;
        if (type === "LPA") return amount / (365 * 8);
        if (type === "Monthly") return (amount * 12) / (365 * 8);
        return amount;
    };
    const calculateEmployeeRevenue = (employee: Employee, projectId: string, timeLogs: TimeLog[]) => calculateEmployeeHours(employee.id, projectId, timeLogs) * convertToHourly(employee.client_billing, employee.billing_type, employee.currency);
    const calculateEmployeeProfit = (employee: Employee, projectId: string, timeLogs: TimeLog[]) => calculateEmployeeRevenue(employee, projectId, timeLogs) - (calculateEmployeeHours(employee.id, projectId, timeLogs) * convertToHourly(employee.salary, employee.salary_type, employee.salary_currency));


    // --- DATA FETCHING & PROCESSING (Updated for new charts) ---
// Update fetchDashboardData to handle null dateRange
const fetchDashboardData = useCallback(async () => {
    if (!clientName || !organization_id) return;
    setLoading(true);
    setError(null);
    try {
        const { data: clientData, error: clientError } = await supabase.from('hr_clients').select('*').eq('client_name', clientName).eq('organization_id', organization_id).single();
        if (clientError) throw new Error("Client not found.");
        setClient(clientData);

        const { data: contactsData } = await supabase.from('hr_client_contacts').select('*').eq('client_id', clientData.id);
        setContacts(contactsData || []);

        let totalCandidateRevenue = 0, totalCandidateProfit = 0, totalEmployeeRevenue = 0, totalEmployeeProfit = 0;
        const monthlyAggregates: { [key: string]: { revenue: number, profit: number } } = {};
        const hiresAggregates: { [key: string]: number } = {};

        const { data: jobsData } = await supabase.from('hr_jobs').select('id, title, job_type_category').eq('client_owner', clientName);
        if (jobsData) {
            // Remove date filtering when dateRange is null
            let query = supabase.from("hr_job_candidates").select(`*`).in("job_id", jobsData.map(j => j.id)).or(`main_status_id.eq.${JOINED_STATUS_ID},main_status_id.eq.${OFFERED_STATUS_ID}`).in("sub_status_id", [JOINED_SUB_STATUS_ID, OFFER_ISSUED_SUB_STATUS_ID]);
            if (dateRange?.startDate && dateRange?.endDate) {
                query = query.gte('joining_date', format(dateRange.startDate, 'yyyy-MM-dd')).lte('joining_date', format(dateRange.endDate, 'yyyy-MM-dd'));
            }
            const { data: candidatesData } = await query;

            const processedCandidates = candidatesData?.map(c => {
                const job = jobsData.find(j => j.id === c.job_id)!;
                const profit = calculateCandidateProfit(c, job, clientData);
                const revenue = job.job_type_category === "Internal" ? parseSalary(c.accrual_ctc) : profit;
                totalCandidateRevenue += revenue; totalCandidateProfit += profit;
                const monthKey = format(new Date(c.joining_date), 'MMM yyyy');
                if (!monthlyAggregates[monthKey]) monthlyAggregates[monthKey] = { revenue: 0, profit: 0 };
                monthlyAggregates[monthKey].revenue += revenue; monthlyAggregates[monthKey].profit += profit;
                if (!hiresAggregates[monthKey]) hiresAggregates[monthKey] = 0;
                hiresAggregates[monthKey]++;
                return { ...c, job_title: job.title, profit };
            }) || [];
            setCandidates(processedCandidates);
        }

        const { data: projectsData } = await supabase.from('hr_projects').select('id, name').eq('client_id', clientData.id);
        if (projectsData) {
            // Remove date filtering for timeLogs when dateRange is null
            let timeLogsQuery = supabase.from("time_logs").select("*").eq("is_approved", true);
            if (dateRange?.startDate && dateRange?.endDate) {
                timeLogsQuery = timeLogsQuery.gte('date', format(dateRange.startDate, 'yyyy-MM-dd')).lte('date', format(dateRange.endDate, 'yyyy-MM-dd'));
            }
            const { data: timeLogsData } = await timeLogsQuery;
            const { data: employeesData } = await supabase.from('hr_project_employees').select(`*, hr_employees:assign_employee(first_name, last_name)`).eq('client_id', clientData.id);

            const processedEmployees = employeesData?.map(e => {
                const baseEmployee: Employee = { id: e.assign_employee, employee_name: `${e.hr_employees.first_name} ${e.hr_employees.last_name}`, project_id: e.project_id, project_name: projectsData.find(p => p.id === e.project_id)?.name || 'Unknown', salary: e.salary, salary_type: e.salary_type, salary_currency: e.salary_currency, client_billing: e.client_billing, billing_type: e.billing_type, currency: clientData.currency, actual_revenue_inr: 0, actual_profit_inr: 0 };
                const revenue = calculateEmployeeRevenue(baseEmployee, e.project_id, timeLogsData || []);
                const profit = calculateEmployeeProfit(baseEmployee, e.project_id, timeLogsData || []);
                totalEmployeeRevenue += revenue; totalEmployeeProfit += profit;
                (timeLogsData || []).forEach(log => {
                    const projectEntry = log.project_time_data?.projects?.find(p => p.projectId === e.project_id);
                    if (log.employee_id === e.assign_employee && projectEntry) {
                        const monthKey = format(new Date(log.date), 'MMM yyyy');
                        if (!monthlyAggregates[monthKey]) monthlyAggregates[monthKey] = { revenue: 0, profit: 0 };
                        const hourlyRate = convertToHourly(e.client_billing, e.billing_type, clientData.currency);
                        const hourlyCost = convertToHourly(e.salary, e.salary_type, e.salary_currency);
                        monthlyAggregates[monthKey].revenue += projectEntry.hours * hourlyRate;
                        monthlyAggregates[monthKey].profit += (projectEntry.hours * hourlyRate) - (projectEntry.hours * hourlyCost);
                    }
                });
                return { ...baseEmployee, actual_revenue_inr: revenue, actual_profit_inr: profit };
            }) || [];
            setEmployees(processedEmployees);
        }

        setMetrics({ candidateRevenue: totalCandidateRevenue, candidateProfit: totalCandidateProfit, employeeRevenueINR: totalEmployeeRevenue, employeeProfitINR: totalEmployeeProfit });
        const chartData = Object.keys(monthlyAggregates).map(key => ({ month: key, ...monthlyAggregates[key] })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        setMonthlyData(chartData);
        const hiresData = Object.keys(hiresAggregates).map(key => ({ month: key, hires: hiresAggregates[key] })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        setHiresByMonth(hiresData);

    } catch (err: any) {
        setError(err.message);
        toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
}, [clientName, organization_id, toast, dateRange]);
    
    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    // --- VERIFICATION LOGIC (No changes, remains correct) ---
    // ... (handleVerifyClick, handleSelectCompany, renderVerificationBadge all remain here) ...
    const handleVerifyClick = async () => {
        if (!client) return;
        setIsVerifying(true);
        setVerificationDialogOpen(true);
        setVerificationResults([]);
        try {
            const { data, error } = await supabase.functions.invoke('verify-company-name', { body: { companyName: client.client_name, organizationId: organization_id, userId: auth_user_id }});
            if (error) throw new Error(error.message);
            if (data.data?.companies) { setVerificationResults(data.data.companies); } else { setVerificationResults([]); toast({ title: data.data?.message || "No results found" }); }
        } catch (err: any) {
            toast({ title: "Verification Error", description: err.message, variant: "destructive" });
            setVerificationDialogOpen(false);
        } finally {
            setIsVerifying(false);
        }
    };
    const handleSelectCompany = async (selectedCompany: any) => {
        if (!client) return;
        try {
            const { error } = await supabase.from('hr_clients').update({ verification_status: 'Verified', verified_company_id: selectedCompany.company_id, verified_company_name: selectedCompany.name, verified_incorporation_date: selectedCompany.incorporation_date, verified_state: selectedCompany.state }).eq('id', client.id);
            if (error) throw error;
            toast({ title: "Client Verified!", description: `${selectedCompany.name} has been linked.` });
            setVerificationDialogOpen(false);
            fetchDashboardData();
        } catch (err: any) {
            toast({ title: "Update Error", description: err.message, variant: "destructive" });
        }
    };
    const renderVerificationBadge = () => {
        if (!client?.verification_status || client.verification_status === 'Not Verified') {
            return ( <Button variant="link" size="sm" onClick={handleVerifyClick} disabled={isVerifying} className="h-auto p-0 ml-2 text-sm text-gray-500 hover:text-purple-600"> {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <HelpCircle className="mr-1 h-4 w-4" />} Verify Company </Button> );
        }
        if (client.verification_status === 'Verified') {
            return ( <div className="ml-2 flex items-center text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full"> <CheckCircle className="mr-1 h-3 w-3" /> Verified ({client.verified_company_id}) </div> );
        }
        return null;
    };

    // Contacts
    const handleAddContact = () => {
        setEditingContact(null);
        setContactDialogOpen(true);
    };
    const handleEditContact = (contact: ClientContact) => {
        setEditingContact(contact);
        setContactDialogOpen(true);
    };
    const handleDeleteContact = async (contactId: string) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            try {
                const { error } = await supabase.from('hr_client_contacts').delete().eq('id', contactId);
                if (error) throw error;
                toast({ title: "Contact deleted successfully." });
                fetchDashboardData();
            } catch (err: any) {
                toast({ title: "Error deleting contact", description: err.message, variant: "destructive" });
            }
        }
    };

    // This is the new handler for triggering the address dialog
    const handleEditAddress = (type: 'billing_address' | 'shipping_address') => {
        if (!client) return;
        setEditingAddress({
            data: client[type], // e.g., client.billing_address
            type: type
        });
        setAddressDialogOpen(true);
    };

    if (loading && !client) return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div>;
    if (error) return <div className="p-10 text-center text-red-600">Error: {error}</div>;
    if (!client) return <div className="p-10 text-center">Client not found.</div>;

    return (
        <div className="bg-white min-h-screen">
            {/* NEW HEADER SECTION */}
            <div className="bg-gray-50/50">
                <header className="max-w-screen-2xl mx-auto p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="h-9 w-9 text-gray-600 hover:text-black">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-800">{clientName}</h1>
                            {!loading && client && renderVerificationBadge()}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setClientEditDialogOpen(true)}>Edit</Button>
                        {/* <Button className="bg-purple-600 hover:bg-purple-700 text-white">New Transaction</Button>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button> */}
                    </div>
                </header>
            </div>
            
            <main className="max-w-screen-2xl mx-auto p-4 md:p-6 space-y-6">
                {/* <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">{clientName}</h2>
                    <DateRangePickerField dateRange={dateRange} onDateRangeChange={(range) => setDateRange(range)} onApply={fetchDashboardData} />
                </div> */}

                {/* NEW TABS UI */}
               <div className="border-b border-gray-200 flex justify-between items-center">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Overview
                        </button>
                        {/* Renamed the original 'Candidates' tab to be more specific */}
                        <button onClick={() => setActiveTab('hired_candidates')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'hired_candidates' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            FTE Staffing ({candidates.length})

                        </button>
                        {/* --- ADDED: The new tab for ALL candidates --- */}
                        
                        {client.service_type?.includes('contractual') && (
                            <button onClick={() => setActiveTab('employees')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'employees' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Contractual Staffing ({employees.length})
                            </button>
                        )}
                        <button onClick={() => setActiveTab('all_candidates')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'all_candidates' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            All Candidates
                        </button>
                    </nav>
                     <DateRangePickerField dateRange={dateRange} onDateRangeChange={(range) => setDateRange(range)} onApply={fetchDashboardData} />
                </div>

                {/* CONDITIONAL CONTENT */}
                <div className="mt-6">
                    {activeTab === 'overview' && 
                    <OverviewTab 
                        client={client} 
                        contacts={contacts} 
                        metrics={metrics} 
                        monthlyData={monthlyData} 
                        hiresByMonth={hiresByMonth} 
                        loading={loading}
                        // Pass down the handlers
                        onAddContact={handleAddContact}
                        onEditContact={handleEditContact}
                        onDeleteContact={handleDeleteContact}
                        onEditAddress={handleEditAddress} 
                    />
                 }
                    {activeTab === 'hired_candidates' && <CandidatesTab candidates={candidates} loading={loading} onUpdate={fetchDashboardData} />}
                    {client.service_type?.includes('contractual') && activeTab === 'employees' && <EmployeesTab employees={employees} loading={loading} />}
                    {activeTab === 'all_candidates' && <AllCandidatesTab clientName={clientName} dateRange={dateRange} />}
                </div>
            </main>

            <CompanyVerificationDialog isOpen={isVerificationDialogOpen} onOpenChange={setVerificationDialogOpen} isLoading={isVerifying} results={verificationResults} searchTerm={client?.client_name || ''} onSelectCompany={handleSelectCompany}/>
            {/* RENDER ALL DIALOGS HERE */}
             <ClientEditDialog 
                isOpen={isClientEditDialogOpen} 
                onOpenChange={setClientEditDialogOpen} 
                client={client} 
                onSave={fetchDashboardData} 
            />
            <ContactFormDialog 
                isOpen={isContactDialogOpen} 
                onOpenChange={setContactDialogOpen} 
                contact={editingContact} 
                clientId={client.id} 
                organizationId={organization_id} 
                onSave={fetchDashboardData} 
            />
            <AddressEditDialog
                isOpen={isAddressDialogOpen}
                onOpenChange={setAddressDialogOpen}
                editingAddress={editingAddress}
                clientId={client.id}
                onSave={fetchDashboardData}
            />
        </div>
    );
};

export default ClientViewPage;