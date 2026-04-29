// src/pages/ClientNew/page.tsx
// Light mode — bg-[#F7F7F8], white header, violet accent
// dateRange defaults to null (all data)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '@/config/supabaseClient';
import { useSelector } from 'react-redux';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ClientEditDialog } from '@/components/clients-new/ClientEditDialog';
import { ContactFormDialog } from '@/components/clients-new/ContactFormDialog';
import { AddressEditDialog, EditingAddress } from '@/components/clients-new/AddressEditDialog';
import OverviewTab from '@/components/clients-new/OverviewTab';
import CandidatesTab from '@/components/clients-new/CandidatesTab';
import EmployeesTab from '@/components/clients-new/EmployeesTab';
import AllCandidatesTab from '@/components/clients-new/AllCandidatesTab';
import { CheckCircle, HelpCircle, Loader2, ArrowLeft, Building2, Users, Briefcase, LayoutGrid, CalendarDays, X } from 'lucide-react';
import { CompanyVerificationDialog } from '@/components/clients-new/CompanyVerificationDialog';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { Client, ClientContact, ClientMetrics, Candidate, Employee, Job, TimeLog, MonthlyData, HiresByMonth, RecruiterPerformance, PipelineStage } from '@/components/clients-new/ClientTypes';

interface DateRange { startDate: Date | null; endDate: Date | null; }

const STATUS_CONFIG = {
  default: { OFFERED_STATUS_ID: "9d48d0f9-8312-4f60-aaa4-bafdce067417", OFFER_ISSUED_SUB_STATUS_ID: "bcc84d3b-fb76-4912-86cc-e95448269d6b", JOINED_STATUS_ID: "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e", JOINED_SUB_STATUS_ID: "c9716374-3477-4606-877a-dfa5704e7680" },
  demo: { OFFERED_STATUS_ID: "0557a2c9-6c27-46d5-908c-a826b82a6c47", OFFER_ISSUED_SUB_STATUS_ID: "7ad5ab45-21ab-4af1-92b9-dd0cb1d52887", JOINED_STATUS_ID: "5ab8833c-c409-46b8-a6b0-dbf23591827b", JOINED_SUB_STATUS_ID: "247ef818-9fbe-41ee-a755-a446d620ebb6" }
};
const DEMO_ORGANIZATION_ID = '53989f03-bdc9-439a-901c-45b274eff506';
const USD_TO_INR_RATE = 84;

const TAB_CONFIG = [
  { value: 'overview',          label: 'Overview',             icon: LayoutGrid },
  { value: 'hired_candidates',  label: 'FTE Staffing',         icon: Users },
  { value: 'employees',         label: 'Contractual Staffing', icon: Briefcase },
  { value: 'all_candidates',    label: 'Engaged',              icon: Users },
];

const ClientViewPage = () => {
  const { clientName: clientNameParam } = useParams<{ clientName: string }>();
  const clientName = decodeURIComponent(clientNameParam || '');
  const navigate = useNavigate();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const auth_user_id = useSelector((state: any) => state.auth.user.id);
  const statusIds = useMemo(() => organization_id === DEMO_ORGANIZATION_ID ? STATUS_CONFIG.demo : STATUS_CONFIG.default, [organization_id]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isClientEditDialogOpen, setClientEditDialogOpen] = useState(false);
  const [isContactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [isAddressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<EditingAddress | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics>({ candidateRevenue: 0, candidateProfit: 0, employeeRevenueINR: 0, employeeProfitINR: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [hiresByMonth, setHiresByMonth] = useState<HiresByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default: null = all data
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);

  // --- ALL CALCULATION LOGIC UNCHANGED ---
  const parseSalary = (salaryStr?: string): number => {
    if (!salaryStr) return 0;
    const isUSD = salaryStr.startsWith('$');
    const parts = salaryStr.replace(/[$,₹]/g, '').trim().split(' ');
    let amount = parseFloat(parts[0]) || 0;
    const bt = parts[1]?.toLowerCase() || 'lpa';
    if (isUSD) amount *= USD_TO_INR_RATE;
    if (bt === 'monthly') amount *= 12; else if (bt === 'hourly') amount *= 2016;
    return amount;
  };
  const calculateCandidateProfit = (candidate: Candidate, job: Job, clientData: Client): number => {
    let commissionValue = clientData.commission_value || 0;
    const salaryAmount = parseSalary(candidate.ctc);
    if (clientData.currency === 'USD' && clientData.commission_type === 'fixed') commissionValue *= USD_TO_INR_RATE;
    if (job.job_type_category === 'Internal') return parseSalary(candidate.accrual_ctc) - salaryAmount;
    if (clientData.commission_type === 'percentage') return (salaryAmount * commissionValue) / 100;
    if (clientData.commission_type === 'fixed') return commissionValue;
    return 0;
  };
  const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]) =>
    timeLogs.filter(log => log.employee_id === employeeId).reduce((acc, log) => acc + (log.project_time_data?.projects?.find(p => p.projectId === projectId)?.hours || 0), 0);
  const calculateEmployeeRevenue = (employee: Employee, projectId: string, timeLogs: TimeLog[]): number => {
    const hours = calculateEmployeeHours(employee.id, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let clientBilling = Number(employee.client_billing) || 0;
    if (employee.currency === 'USD') clientBilling *= USD_TO_INR_RATE;
    let hourlyRate = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const hrs = employee.working_hours || 8;
    switch (employee.billing_type?.toLowerCase()) { case 'monthly': hourlyRate = (clientBilling * 12) / (avg * hrs); break; case 'lpa': hourlyRate = clientBilling / (avg * hrs); break; case 'hourly': hourlyRate = clientBilling; break; }
    return hours * (hourlyRate || 0);
  };
  const calculateEmployeeProfit = (employee: Employee, projectId: string, timeLogs: TimeLog[]): number => {
    const revenue = calculateEmployeeRevenue(employee, projectId, timeLogs);
    const hours = calculateEmployeeHours(employee.id, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let salary = Number(employee.salary) || 0;
    if (employee.salary_currency === 'USD') salary *= USD_TO_INR_RATE;
    let hourlySalaryRate = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const hrs = employee.working_hours || 8;
    switch (employee.salary_type?.toLowerCase()) { case 'monthly': hourlySalaryRate = (salary * 12) / (avg * hrs); break; case 'lpa': hourlySalaryRate = salary / (avg * hrs); break; case 'hourly': hourlySalaryRate = salary; break; }
    return revenue - (hours * (hourlySalaryRate || 0));
  };

  const fetchDashboardData = useCallback(async () => {
    if (!clientName || !organization_id) return;
    setLoading(true); setError(null);
    try {
      const { data: clientData, error: clientError } = await supabase.from('hr_clients').select('*').eq('client_name', clientName).eq('organization_id', organization_id).single();
      if (clientError) throw new Error('Client not found.');
      setClient(clientData);
      const { data: contactsData } = await supabase.from('hr_client_contacts').select('*').eq('client_id', clientData.id);
      setContacts(contactsData || []);
      let totalCandidateRevenue = 0, totalCandidateProfit = 0, totalEmployeeRevenue = 0, totalEmployeeProfit = 0;
      const monthlyAggregates: { [k: string]: { revenue: number; profit: number } } = {};
      const hiresAggregates: { [k: string]: number } = {};
      const { data: jobsData } = await supabase.from('hr_jobs').select('id, title, job_type_category').eq('client_owner', clientName);
      if (jobsData) {
        let query = supabase.from('hr_job_candidates').select('*').in('job_id', jobsData.map(j => j.id)).or(`main_status_id.eq.${statusIds.JOINED_STATUS_ID},main_status_id.eq.${statusIds.OFFERED_STATUS_ID}`).in('sub_status_id', [statusIds.JOINED_SUB_STATUS_ID, statusIds.OFFER_ISSUED_SUB_STATUS_ID]);
        if (dateRange?.startDate && dateRange?.endDate) {
          query = query.gte('joining_date', format(dateRange.startDate, 'yyyy-MM-dd')).lte('joining_date', format(dateRange.endDate, 'yyyy-MM-dd'));
        }
        const { data: candidatesData } = await query;
        const processedCandidates = candidatesData?.map(c => {
          const job = jobsData.find(j => j.id === c.job_id)!;
          const profit = calculateCandidateProfit(c, job, clientData);
          const revenue = job.job_type_category === 'Internal' ? parseSalary(c.accrual_ctc) : profit;
          totalCandidateRevenue += revenue; totalCandidateProfit += profit;
          if (c.joining_date) { const mk = format(new Date(c.joining_date), 'MMM yyyy'); if (!monthlyAggregates[mk]) monthlyAggregates[mk] = { revenue: 0, profit: 0 }; monthlyAggregates[mk].revenue += revenue; monthlyAggregates[mk].profit += profit; if (!hiresAggregates[mk]) hiresAggregates[mk] = 0; hiresAggregates[mk]++; }
          return { ...c, job_title: job.title, profit };
        }) || [];
        setCandidates(processedCandidates);
      }
      const { data: projectsData } = await supabase.from('hr_projects').select('id, name').eq('client_id', clientData.id);
      if (projectsData) {
        let timeLogsQuery = supabase.from('time_logs').select('*').eq('is_approved', true);
        if (dateRange?.startDate && dateRange?.endDate) { timeLogsQuery = timeLogsQuery.gte('date', format(dateRange.startDate, 'yyyy-MM-dd')).lte('date', format(dateRange.endDate, 'yyyy-MM-dd')); }
        const { data: timeLogsData } = await timeLogsQuery;
        const { data: employeesData } = await supabase.from('hr_project_employees').select(`*, hr_employees:assign_employee(first_name, last_name)`).eq('client_id', clientData.id);
        const processedEmployees = employeesData?.map(e => {
          const baseEmployee: Employee = { id: e.assign_employee, employee_name: `${e.hr_employees.first_name} ${e.hr_employees.last_name}`, project_id: e.project_id, project_name: projectsData.find(p => p.id === e.project_id)?.name || 'Unknown', salary: e.salary, salary_type: e.salary_type, salary_currency: e.salary_currency, client_billing: e.client_billing, billing_type: e.billing_type, currency: clientData.currency, working_hours: e.working_hours, working_days_config: e.working_days_config, actual_revenue_inr: 0, actual_profit_inr: 0, status: e.status };
          const revenue = calculateEmployeeRevenue(baseEmployee, e.project_id, timeLogsData || []);
          const profit = calculateEmployeeProfit(baseEmployee, e.project_id, timeLogsData || []);
          totalEmployeeRevenue += revenue; totalEmployeeProfit += profit;
          (timeLogsData || []).forEach(log => {
            const pe = log.project_time_data?.projects?.find((p: any) => p.projectId === e.project_id);
            if (log.employee_id === e.assign_employee && pe) {
              const mk = format(new Date(log.date), 'MMM yyyy');
              if (!monthlyAggregates[mk]) monthlyAggregates[mk] = { revenue: 0, profit: 0 };
              const config = e.working_days_config || 'all_days'; const dWH = e.working_hours || 8;
              const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
              let hr = 0; let cb = Number(e.client_billing) || 0; if (clientData.currency === 'USD') cb *= USD_TO_INR_RATE;
              switch (e.billing_type?.toLowerCase()) { case 'monthly': hr = (cb * 12) / (avg * dWH); break; case 'lpa': hr = cb / (avg * dWH); break; case 'hourly': hr = cb; break; }
              let hc = 0; let sal = Number(e.salary) || 0; if (e.salary_currency === 'USD') sal *= USD_TO_INR_RATE;
              switch (e.salary_type?.toLowerCase()) { case 'monthly': hc = (sal * 12) / (avg * dWH); break; case 'lpa': hc = sal / (avg * dWH); break; case 'hourly': hc = sal; break; }
              monthlyAggregates[mk].revenue += pe.hours * hr;
              monthlyAggregates[mk].profit += (pe.hours * hr) - (pe.hours * hc);
            }
          });
          return { ...baseEmployee, actual_revenue_inr: revenue, actual_profit_inr: profit };
        }) || [];
        setEmployees(processedEmployees);
      }
      setMetrics({ candidateRevenue: totalCandidateRevenue, candidateProfit: totalCandidateProfit, employeeRevenueINR: totalEmployeeRevenue, employeeProfitINR: totalEmployeeProfit });
      setMonthlyData(Object.keys(monthlyAggregates).map(k => ({ month: k, ...monthlyAggregates[k] })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()));
      setHiresByMonth(Object.keys(hiresAggregates).map(k => ({ month: k, hires: hiresAggregates[k] })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()));
    } catch (err: any) { setError(err.message); toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [clientName, organization_id, toast, dateRange, statusIds]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleVerifyClick = async () => {
    if (!client) return; setIsVerifying(true); setVerificationDialogOpen(true); setVerificationResults([]);
    try { const { data, error } = await supabase.functions.invoke('verify-company-name', { body: { companyName: client.client_name, organizationId: organization_id, userId: auth_user_id } }); if (error) throw new Error(error.message); if (data.data?.companies) setVerificationResults(data.data.companies); else { setVerificationResults([]); toast({ title: data.data?.message || 'No results found' }); } }
    catch (err: any) { toast({ title: 'Verification Error', description: err.message, variant: 'destructive' }); setVerificationDialogOpen(false); }
    finally { setIsVerifying(false); }
  };
  const handleSelectCompany = async (selectedCompany: any) => {
    if (!client) return;
    try { const { error } = await supabase.from('hr_clients').update({ verification_status: 'Verified', verified_company_id: selectedCompany.company_id, verified_company_name: selectedCompany.name, verified_incorporation_date: selectedCompany.incorporation_date, verified_state: selectedCompany.state }).eq('id', client.id); if (error) throw error; toast({ title: 'Client Verified!' }); setVerificationDialogOpen(false); fetchDashboardData(); }
    catch (err: any) { toast({ title: 'Update Error', description: err.message, variant: 'destructive' }); }
  };
  const renderVerificationBadge = () => {
    if (!client?.verification_status || client.verification_status === 'Not Verified') return (<button onClick={handleVerifyClick} disabled={isVerifying} className="ml-2 flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors">{isVerifying ? <Loader2 size={11} className="animate-spin" /> : <HelpCircle size={11} />}Verify</button>);
    if (client.verification_status === 'Verified') return (<div className="ml-2 flex items-center gap-1 text-[10px] text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"><CheckCircle size={10} />Verified</div>);
    return null;
  };
  const handleAddContact = () => { setEditingContact(null); setContactDialogOpen(true); };
  const handleEditContact = (contact: ClientContact) => { setEditingContact(contact); setContactDialogOpen(true); };
  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Delete this contact?')) return;
    try { const { error } = await supabase.from('hr_client_contacts').delete().eq('id', contactId); if (error) throw error; toast({ title: 'Contact deleted.' }); fetchDashboardData(); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };
  const handleEditAddress = (type: 'billing_address' | 'shipping_address') => {
    if (!client) return; setEditingAddress({ data: client[type], type }); setAddressDialogOpen(true);
  };

  if (loading && !client) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /><p className="text-sm text-gray-400">Loading…</p></div>
    </div>
  );
  if (error) return <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center"><p className="text-red-500 text-sm">Error: {error}</p></div>;
  if (!client) return <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center"><p className="text-gray-400 text-sm">Client not found.</p></div>;

  const visibleTabs = TAB_CONFIG.filter(t => t.value !== 'employees' || client.service_type?.includes('contractual'));
  const hasDateFilter = !!(dateRange.startDate || dateRange.endDate);

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* ── Sticky Header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/clients')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><ArrowLeft size={16} /></button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #7B43F1, #6D28D9)' }}>{client.client_name.charAt(0).toUpperCase()}</div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-800">{clientName}</span>
                {!loading && renderVerificationBadge()}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${client.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{client.status}</span>
            </div>
          </div>
          <button onClick={() => setClientEditDialogOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-all bg-white">
            Edit Client
          </button>
        </div>

        {/* Tab bar + Date range in header */}
        <div className="max-w-screen-2xl mx-auto px-5 py-2 flex items-center justify-between gap-4 border-t border-gray-100">
          <div className="flex gap-0.5">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              const count = tab.value === 'hired_candidates' ? candidates.length : tab.value === 'employees' ? employees.length : undefined;
              return (
                <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>
                  <Icon size={12} />
                  {tab.label}
                  {count !== undefined && (
                    <span className={`text-[10px] px-1 py-0.5 rounded-full font-bold ${isActive ? 'bg-purple-50 text-purple-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="text-gray-400" />
            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
            {hasDateFilter && (
              <button onClick={() => setDateRange({ startDate: null, endDate: null })} className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all">
                <X size={10} />Clear
              </button>
            )}
            {!hasDateFilter && <span className="text-[10px] text-gray-400 italic">All time</span>}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-5 py-5">
        {activeTab === 'overview' && (
          <OverviewTab client={client} contacts={contacts} metrics={metrics} monthlyData={monthlyData} hiresByMonth={hiresByMonth} loading={loading} onAddContact={handleAddContact} onEditContact={handleEditContact} onDeleteContact={handleDeleteContact} onEditAddress={handleEditAddress} allCandidatesCount={0} recruiterPerformance={[]} pipelineStages={[]} />
        )}
        {activeTab === 'hired_candidates' && <CandidatesTab candidates={candidates} loading={loading} onUpdate={fetchDashboardData} />}
        {client.service_type?.includes('contractual') && activeTab === 'employees' && <EmployeesTab employees={employees} loading={loading} />}
        {activeTab === 'all_candidates' && <AllCandidatesTab clientName={clientName} dateRange={dateRange} />}
      </div>

      <CompanyVerificationDialog isOpen={isVerificationDialogOpen} onOpenChange={setVerificationDialogOpen} isLoading={isVerifying} results={verificationResults} searchTerm={client?.client_name || ''} onSelectCompany={handleSelectCompany} />
      <ClientEditDialog isOpen={isClientEditDialogOpen} onOpenChange={setClientEditDialogOpen} client={client} onSave={fetchDashboardData} />
      <ContactFormDialog isOpen={isContactDialogOpen} onOpenChange={setContactDialogOpen} contact={editingContact} clientId={client.id} organizationId={organization_id} onSave={fetchDashboardData} />
      <AddressEditDialog isOpen={isAddressDialogOpen} onOpenChange={setAddressDialogOpen} editingAddress={editingAddress} clientId={client.id} onSave={fetchDashboardData} />
    </div>
  );
};

export default ClientViewPage;