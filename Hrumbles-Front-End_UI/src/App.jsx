// App.jsx (Corrected Structure)

import { useEffect, useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ReactGA from 'react-ga4';
import store from "./Redux/store";
import { useDispatch, useSelector } from "react-redux";
import supabase from "./config/supabaseClient"

// Import the Redux action and the utility
import { setOrganization } from "./Redux/organizationSlice";
import { getOrganizationSubdomain } from "./utils/subdomain";
import { fetchFirmOrganizationDetails } from "./Redux/firmOrganizationSlice";
import { fetchUserPermissions } from "./Redux/permissionSlice";


// Import the SessionExpiredModal   
import SessionExpiredModal from "./components/SessionExpiredModal";
import { showSessionExpiredModal } from "./Redux/uiSlice";
import { logout } from './Redux/authSlice';

// Import your pages
import DomainVerificationPage from "./pages/DomainVerificationPage";

import Login from "./pages/LoginPage";
import SignUp from "./pages/GlobalSuperAdmin";
import PrivateRoutes from "./utils/PrivateRoutes";

// 🎯 NEW: Profile Completion Components
import CompleteYourProfile from "./components/CompleteYourProfile"; // ✅ CORRECT
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ CORRECT

// Global Superadmin
import GlobalSuperadminDashboard from "./pages/Global_Dashboard";
import SingleOrganizationDashboard from "./components/global/SingleOrganizationDashboard";
import VerificationHubPage from "./pages/verifications/VerificationHubPage";
import VerificationTypeDashboardPage from "./pages/verifications/VerificationTypeDashboardPage";
import OrganizationVerificationReportPage from "./pages/verifications/OrganizationVerificationReportPage";
import DetailedResourceView from './components/global/DetailedResourceView';
import OrganizationTalentTrendsReport from "./components/global/OrganizationManagement/OrganizationTalentTrendsReport";
import GlobalInvoicesPage from "./components/global/invoices/GlobalInvoicesPage";


import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/dashboard";
import Employee from "./pages/Employee";
import UserManagement from "./pages/UserManagement";
import Clients from "./pages/Client";
import ClientDashboard from "./components/Client/ClientDashboard";
import ProjectDashboard from "./components/Client/ProjectDashboard";
import ProjectManagement from "./pages/clients/ProjectManagement";
import EmployeeProjectLogDetails from "./components/Client/EmployeeProjectLogDetails"; 
import Index from "./pages/Index";

// Password change
import PasswordChange from "./pages/ChangeEmployeePassword";
import SetPassword from "./pages/SetPassword"
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// import EmployeeProfile from "./pages/EmployeeProfile";
import ProfilePageEmployee from "./pages/ProfilePageEmployee";
import EmployeeList from "./pages/EmployeeList";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeOnboard from "./pages/EmployeeOnboard";
import EmployeeProfile from "./pages/EmployeeProfile";
import GoalPage from "./pages/goals/Index";
import GoalView from "./pages/goals/EmployeeView";
import GoalDetail from "./pages/goals/GoalDetail";
import EmployeeGoalView from "./components/goals/employee/EmployeeGoalDashboard"
import GoalDetailView from "./components/goals/dashboard/GoalDetailView";
import EmployeeGoalDetail from "./pages/goals/EmployeeGoalDetail";
import ProfileEditEmployee from "./pages/ProfileEditEmployee";
import MySubmissionsReport from "./pages/reports/MySubmissionsReport";

// New CLients
import ClientNew from "./pages/ClientNew/page";

// Jobs
import Jobs from "./pages/jobs/Jobs";
import JobView from "./pages/jobs/JobView";
import JobDescription from "./pages/jobs/JobDescription";
import Career from "./pages/careerPage/Index";
import TalentView from "./pages/careerPage/TalentView/Index";
import CareerJobDetail from "./pages/careerPage/JobDetail";
import JobDetailTalent from "./pages/careerPage/TalentView/JobDetailTalent.tsx";
import CareerJobApplication from "./pages/careerPage/JobApplication";
import StatusSettings from "./pages/jobs/StatusSettings";
import ResumeAnalysisDetailView from "./pages/jobs/ResumeAnalysisDetailView";
import SharedProfile from "./pages/jobs/SharedProfile"
import ReportsPage from "./pages/reports/Index";
import EmployeeProfilePage from "./components/MagicLinkView/EmployeeProfileDrawer";
import CandidateConsentPage from './components/MagicLinkView/CandidateConsentPage';
import CandidateProfileV2 from "./components/MagicLinkView/candidate-profile-v2/CandidateProfileV2";
import SharedProfileV2 from "./components/MagicLinkView/candidate-profile-v2/SharedProfileV2";


// Job Route Handler
import JobRouteHandler from "./components/jobs/JobRouteHandler";
import JobViewRouteHandler from "./components/jobs/JobViewRouteHandler";


// Background Verification
// import BgvVerificationSection from "./pages/bg-verification/BgvVerificationSection";
import BgvAnalyticsDashboard from "./pages/bg-verification/BgvAnalyticsDashboard.tsx";
import CandidateBgvProfilePage from "./pages/bg-verification/CandidateBgvProfilePage";
import AllCandidatesPage from "./pages/bg-verification/AllCandidatesPage";

// Candidates
import TalentPoolPage from "./pages/candidates/TalentPoolPage"; // Create this new page
import CandidateProfilePage from "./pages/candidates/CandidateProfilePage"; 

import MigratedTalentPoolPage from "./pages/candidates/MigratedTalentPoolPage";
import MigratedCandidateProfilePage from "./pages/candidates/MigratedCandidateProfilePage";

// Zive-X
import ZiveXSearchPage from "./pages/candidates/ZiveXSearchPage";
import ZiveXResultsPage from "./pages/candidates/ZiveXResultsPage";

// Finance & Accounts
import FinanceIndex from "./pages/finance/Index";
import PayrollEdit from "./pages/finance/PayrollEdit";
import InvoicesPage from "./pages/finance/accounts/InvoicesPage";
import ExpensesPage from "./pages/finance/accounts/ExpensesPage";
import Payroll from "./pages/payroll/index";
import AccountsOverview from "./pages/finance/accounts/AccountsOverview";
import PayrollRun from '././pages/payroll/index';
import PayrollDetails from './pages/payroll/PayrollDetails';
import PayrollHistoryDetails from './pages/payroll/PayrollHistoryDetails';
import TerminatedEmployeesPayroll from './pages/payroll/TerminatedEmployeesPayroll';
import ReconciliationPage from '@/components/accounts/ReconciliationPage';
import BankStatement from './pages/finance/accounts/BankStatement'; 
import StatementDetailPage from "./pages/finance/accounts/StatementDetailPage.tsx"; 

// Sales Companies and Contacts
import CompaniesPage from "./pages/sales/CompaniesPage";
import CompanyIntelligenceSearchPage from "./pages/sales/CompanyIntelligenceSearchPage";
import CompanyDetail from "./pages/sales/CompanyDetail";
import CompanyEdit from "./pages/sales/CompanyEdit";
import ContactsPage from "./pages/sales/ContactsPage";
import EditableContactsPage from './pages/sales/EditableContactsPage';
import TanstackContactsPage from './pages/sales/TanstackContactsPage';
import KanbanView from './pages/sales/KanbanBoard';
import ListsPage from './pages/sales/ListsPage';
import LeadsWorkspace from './pages/crm/LeadsWorkspace.tsx'
import ContactDetailPage from './pages/sales/ContactDetailPage.tsx'

import SalesDashboard from "./pages/sales/SalesDashboard";
import DiscoveryPage from "./pages/sales/DiscoveryPage";
import SyncReportsPage from "./pages/sales/SyncReportsPage";


// Clients
import ClientPage from "./pages/clients/ClientDashboard";
import ClientManagementDashboard from "./pages/client-dashboard/ClientManagementDashboard";
import ClientCandidatesView from "./pages/client-dashboard/ClientCandidatesView";
import ClientMetricsDashboard from "./pages/client-dashboard/ClientMetricsDashboard";

// TimeTracker, Timesheet, Attendance and Leave
// Employee routes
import TimeTracker from "./pages/TimeManagement/employee/TimeTracker";
import Timesheet from "./pages/TimeManagement/employee/Timesheet";
import Leave from "./pages/TimeManagement/employee/Leave";
import Attendance from "./pages/TimeManagement/employee/Attendance";
import Calendar from "./pages/TimeManagement/employee/Calendar";
import EmployeeRegularization from "./pages/TimeManagement/employee/Regularization";

import GlobalDialogs from "./components/TimeManagement/timesheet/GlobalDialogs";
import { useTimesheetStore } from '@/stores/timesheetStore';
import { useEmployeeContext } from './hooks/useEmployeeContext';

// Approval routes
import TimesheetApproval from "./pages/TimeManagement/approvals/TimesheetApproval";
import LeaveApproval from "./pages/TimeManagement/approvals/LeaveApproval";
import AutoTerminated from "./pages/TimeManagement/approvals/AutoTerminated";
import RegularizationApproval from "./pages/TimeManagement/approvals/RegularizationApproval";

// Admin routes
import LeavePolicies from "./pages/TimeManagement/admin/LeavePolicies";
import Holidays from "./pages/TimeManagement/admin/Holidays";
import Projects from "./pages/TimeManagement/admin/Projects";

// Bench Profiles
import BenchProfilesPage from "./pages/bench-profiles/BenchProfilesPage";

// reports detail page
import UserActivityDetailsPage from "./components/reports/UserActivityDetailsPage";

// --- Simple Loader for Organization Check ---
const FullScreenLoader = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

// --- Google Analytics Tracker ---
const RouteChangeTracker = () => {
  const location = useLocation();
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);
  return null;
};


// 1. All logic, hooks, and rendering are moved into this new component.
function AppContent() {
  const location = useLocation(); // This now works perfectly!
  const dispatch = useDispatch();
  const organizationSubdomain = getOrganizationSubdomain();
  const organizationId = useSelector((state) => state.auth.organization_id);
  const firmOrgStatus = useSelector((state) => state.firmOrganization.status);
  const reduxUser = useSelector((state) => state.auth.user);
  const isLoggingOut = useSelector((state) => state.auth.isLoggingOut);

 const [isOrgValidated, setIsOrgValidated] = useState(null); 
  
  // --- Define Public Routes ---
  const publicPaths = [
    '/login', '/signup', '/set-password', '/forgot-password',
    '/careers', '/job/', '/share/', '/share-v2/', '/consent/', '/talentcareers', '/'
  ];



    // --- 2. Organization Validation Logic ---
useEffect(() => {
    const validateOrganization = async () => {
      let subdomain = getOrganizationSubdomain();
      console.log(`[Org Check] Detected subdomain: '${subdomain}'`);

      // 🛡️ SECURITY: Explicitly block 'app' and 'www' if the utility file misses it
      if (subdomain === 'app' || subdomain === 'www') {
          console.warn(`[Org Check] '${subdomain}' is a reserved platform domain. Blocking.`);
          subdomain = null;
      }

      // Case A: No subdomain found (e.g. app.xrilic.ai, localhost)
      if (!subdomain) {
        console.log("[Org Check] No valid subdomain. Setting invalid.");
        setIsOrgValidated(false);
        return;
      }

      // Case B: Verify existence in Supabase
      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .single();

        if (error || !data) {
          console.warn(`[Org Check] Subdomain '${subdomain}' not found in DB.`);
          setIsOrgValidated(false);
        } else {
          console.log(`[Org Check] Organization '${subdomain}' verified.`);
          dispatch(setOrganization(subdomain));
          setIsOrgValidated(true);
        }
      } catch (err) {
        console.error("[Org Check] Error validating organization:", err);
        setIsOrgValidated(false);
      }
    };

    validateOrganization();
  }, [dispatch]);

 // --- Session Validation Logic ---
// Inside App.jsx -> AppContent component

// --- Session Validation Logic (CORRECTED) ---
  const validateCurrentSession = useCallback(async () => {
    // 1. CRITICAL: Identify if we are on a public path
    const isPublic = publicPaths.some(p => {
        if (p === '/') return location.pathname === '/';
        return location.pathname.startsWith(p);
    });

    // 2. If on a public path (like /login), STOP immediately.
    // Do not check session, do not show modal.
    if (isPublic) return;

    // 3. Check direct store state for 'isLoggingOut'.
    // This prevents stale closure issues during the logout transition.
    const currentLoggingOutState = store.getState().auth.isLoggingOut;
    if (currentLoggingOutState) return;

    // 4. If org is not validated yet, wait.
    if (isOrgValidated !== true) return; 

    // 5. Check Session
    const { data: { session } } = await supabase.auth.getSession();
    
    // 6. No Session + Not Public + Not Logging Out = EXPIRED
    if (!session) {
       dispatch(showSessionExpiredModal());
       return;
    }

    if (session?.user?.id) {
       const { data, error } = await supabase
         .from('hr_employees')
         .select(`
            status, 
            role_id,
            hr_roles (name),
            hr_organizations!inner (
                subscription_status
            )
         `)
         .eq('id', session.user.id)
         .single();
         
       if (data) {
          const rawRole = data.hr_roles;
          const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
          const userStatus = data.status;
          const subStatus = data.hr_organizations?.subscription_status;

          if (userStatus !== 'active') {
              await supabase.auth.signOut();
              dispatch(logout());
              window.location.href = "/login";
              return;
          }

          const isExpired = subStatus === 'expired' || subStatus === 'inactive' || subStatus === 'canceled';
          if (isExpired) {
              if (roleName === 'organization_superadmin' || roleName === 'global_superadmin') {
                  return; 
              }
              await supabase.auth.signOut();
              dispatch(logout());
              window.location.href = "/login";
          }
       }
    }
  }, [dispatch, location.pathname, isOrgValidated]); // Removed isLoggingOut dependency to use store state

  useEffect(() => {
    validateCurrentSession();
    
    const handleStorageChange = (e) => (e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) && validateCurrentSession();
    const handleVisibilityChange = () => (document.visibilityState === 'visible') && validateCurrentSession();
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Direct store check for logout flag
      const loggingOut = store.getState().auth.isLoggingOut;
      if (loggingOut) return; 

      if (event === 'SIGNED_OUT') {
        // Double check we aren't mistakenly showing it on public routes
        const isPublicRoute = publicPaths.some(path => window.location.pathname.startsWith(path));
        if (!isPublicRoute) {
          dispatch(showSessionExpiredModal());
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateCurrentSession, dispatch]);

  // --- Firm Organization Fetch Logic ---
  useEffect(() => {
    if (organizationId && firmOrgStatus === 'idle') {
      dispatch(fetchFirmOrganizationDetails(organizationId));
    }
  }, [organizationId, firmOrgStatus, dispatch]);
  
  // --- Your existing subdomain logic ---
  useEffect(() => {
    if (organizationSubdomain) {
      dispatch(setOrganization(organizationSubdomain));
    }
  }, [organizationSubdomain, dispatch]);

  useEffect(() => {
  // Dispatched whenever we have a valid user and organizationId
  if (reduxUser?.id && organizationId) {
    // Assuming you store role_id and department_id in your auth state or employee profile
    // If not currently in state, you might need to fetch them first or use the data 
    // from the validateCurrentSession logic
    
    const fetchPerms = async () => {
        // We get the specific employee data to get role/dept for the RPC
        const { data } = await supabase
            .from('hr_employees')
            .select('role_id, department_id')
            .eq('id', reduxUser.id)
            .single();

        if (data) {
            dispatch(fetchUserPermissions({
                userId: reduxUser.id,
                roleId: data.role_id,
                departmentId: data.department_id,
                organizationId: organizationId
            }));
        }
    };
    
    fetchPerms();
  }
}, [reduxUser?.id, organizationId, dispatch]);

  // --- 3. RENDER LOGIC ---

  // A. Loading state while checking DB
  if (isOrgValidated === null) {
    return <FullScreenLoader />;
  }

  // B. Invalid Organization -> Show Verification Page
  if (isOrgValidated === false) {
    return (
      <>
        <RouteChangeTracker />
        <Routes>
          <Route path="*" element={<DomainVerificationPage />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <SessionExpiredModal />
      <RouteChangeTracker />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/signup" element={<SignUp />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* career page */}
        <Route path="/careers" element={<Career />} />
        <Route path="/talentcareers" element={<TalentView />} />
        <Route path="/job/:jobId" element={<JobDetailTalent />} />
        <Route path="/job/:jobId/apply" element={<CareerJobApplication />} />

        {/* Candidate Profile Magic Link */}
        <Route path="/share/:shareId" element={<SharedProfile />} />
        <Route path="/share-v2/:shareId" element={<SharedProfileV2 />} />

        <Route path="/consent/:consentId" element={<CandidateConsentPage />} />

        {/* Protected Routes */}
        <Route
          element={
            <PrivateRoutes
              allowedRoles={[
                "global_superadmin",
                "organization_superadmin",
                "admin",
                "employee",
              ]}
            />
          }
        >
          {/* ========================================
              🎯 NEW: Profile Completion Route
              ======================================== */}
          {/* This route requires authentication but doesn't require profile completion */}
          <Route path="/complete-profile" element={<CompleteYourProfile />} /> {/* ✅ CORRECT */}
          <Route path="employee/:id" element={<EmployeeOnboard />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
                // Change this line:
                   <Route path="profile/edit/:id" element={<ProfileEditEmployee />} />
              {/* Password Change */}
              <Route path="/password" element={<PasswordChange />} />

              {/* Global Super Admin */}
              <Route path="/organization" element={<GlobalSuperadminDashboard />} />
              <Route path="/organization/:organizationId" element={<SingleOrganizationDashboard />} />
              <Route path="/verifications" element={<VerificationHubPage />} />
              <Route path="/verifications/:verificationType" element={<VerificationTypeDashboardPage />} />
              <Route path="/verifications/:verificationType/:organizationId" element={<OrganizationVerificationReportPage />} />
              <Route path="/organization/:organizationId/users" element={<DetailedResourceView resourceType="users" />} />
              <Route path="/organization/:organizationId/talent" element={<DetailedResourceView resourceType="talent" />} /> 
              <Route path="/organization/:organizationId/roles" element={<DetailedResourceView resourceType="roles" />} />
              <Route path="/organization/:organizationId/jobs" element={<DetailedResourceView resourceType="jobs" />} />
              <Route path="/organization/:organizationId/clients" element={<DetailedResourceView resourceType="clients" />} />
              <Route path="/reports/organization-talent-trends" element={<OrganizationTalentTrendsReport />} />
              <Route path="/organization/invoices" element={<GlobalInvoicesPage />} />
              
              <Route path="/projects" element={<ProjectManagement />} />
              <Route path="/client/:id" element={<ClientDashboard />} />
              <Route path="/projects/:id" element={<ProjectDashboard />} />
              <Route
                path="/projects/:projectId/employee/:employeeId/details"
                element={<EmployeeProjectLogDetails />}
              />

              {/* User management */}
              <Route path="/user-management" element={<UserManagement />} />
             
              {/* Employee */}
              <Route path="employee" element={<EmployeeList />} />
              <Route path="employee/new" element={<EmployeeForm />} />
              <Route path="employee/profile/:id" element={<EmployeeProfile />} />

              {/* Employee Dashboard Routes */}
              <Route path="/profile" element={<ProfilePageEmployee />} />

              {/* Clients */}
              {/* Client Dashboard (New) */}
              <Route path="/clients" element={<ClientManagementDashboard />} />
              <Route path="/clients/:clientName/candidates" element={<ClientNew />} />
              <Route path="/client-metrics" element={<ClientMetricsDashboard />} />

              {/* Goals */}
              <Route path="/goals" element={<GoalPage />} />
              <Route path="/goals/:goalId" element={<GoalDetail />} />
              <Route path="/my-goals/:id" element={<EmployeeGoalDetail />} />
              <Route path="/goalsview" element={<GoalView />} />
              <Route path="goalview" element={<EmployeeGoalView/>} />
              <Route path="/goals/:goalId/:goalType?" element={<GoalDetailView />} />

              {/* Jobs */}
              <Route path="/jobs" element={<JobRouteHandler />} />
              <Route path="/jobs/:id" element={<JobViewRouteHandler />} />
              <Route path="/resume-analysis/:jobId/:candidateId" element={<ResumeAnalysisDetailView />} />
              <Route path="/jobs/:id/description" element={<JobDescription />} />
              <Route path="/jobs/edit/:id" element={<JobDescription />} />
              <Route path="/jobstatuses" element={<StatusSettings />} />
              <Route path="/jobs/candidateprofile/:candidateId/:jobId" element={<CandidateProfileV2 />} />
              <Route path="/candidate-v2/:candidateId/:jobId" element={<EmployeeProfilePage />} />
              {/* Background Verification */}
              <Route path="/jobs/:jobId/candidate/:candidateId/bgv" element={<CandidateBgvProfilePage />} />
              <Route path="/all-candidates" element={<AllCandidatesPage />} /> 
        
              <Route path="/bg-verification/analytics" element={<BgvAnalyticsDashboard />} />



              <Route path="/my-submission" element={<MySubmissionsReport />} />

              {/* Candidates */}
              <Route path="/talent-pool" element={<TalentPoolPage />} />
              <Route path="/talent-pool/:candidateId" element={<CandidateProfilePage />} />

              <Route path="/migrated-talent-pool" element={<MigratedTalentPoolPage />} />
              <Route path="/migrated-talent-pool/:candidateId" element={<MigratedCandidateProfilePage />} />

              {/* Zive-X */}
              <Route path="/zive-x" element={<ZiveXSearchPage />} />
              <Route path="/zive-x-search/results" element={<ZiveXResultsPage />} />

              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />
               <Route path="/user-activity-details/:employeeId" element={<UserActivityDetailsPage />}  />

              {/* Finance & Accounts */}
              <Route path="/finance" element={<FinanceIndex />} />
              <Route path="/payroll/:id/edit" element={<PayrollEdit />} />
              <Route path="/accounts/invoices" element={<InvoicesPage />} />
              <Route path="/accounts/expenses" element={<ExpensesPage />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/accounts/overall" element={<AccountsOverview />} />
              <Route path="/payrollrun" element={<PayrollRun />} />
              <Route path="/payroll/:year/:month" element={<PayrollDetails />} />
              <Route path="/payroll/history/:year/:month" element={<PayrollHistoryDetails />} />
              <Route path="/payroll/terminated/:year/:month/:employeeId" element={<TerminatedEmployeesPayroll />} />
              <Route path="/bank-statement" element={<BankStatement />} />
              <Route path="/bank-statement/accounts/:statementId" element={<StatementDetailPage />} />
              <Route path="/accounts/reconciliation" element={<ReconciliationPage />} />


              {/* Sales Companies and Contacts */}

          <Route path="/sales/dashboard" element={<SalesDashboard />} />


              <Route path="/companies" element={<CompanyIntelligenceSearchPage />} />
              <Route path="/lists/companies/file/:fileId" element={<CompanyIntelligenceSearchPage />} />
              <Route path="/contacts" element={<TanstackContactsPage />} />
              <Route path="/sales/kanban" element={<KanbanView />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/companies/:id/edit" element={<CompanyEdit />} />
              <Route path="/lists" element={<ListsPage />} />
              <Route path="/lists/contacts/file/:fileId" element={<TanstackContactsPage />} />
              <Route path="/lead" element={<LeadsWorkspace />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/discovery" element={<DiscoveryPage />} />
              <Route path="/sales/reports" element={<SyncReportsPage />} />



              {/* TimeTracker, Timesheet, Attendance and Leave */}
              {/* Employee routes */}
              <Route path="/employee/time-tracker" element={<TimeTracker />} />
              <Route path="/employee/timesheet" element={<Timesheet />} />
              <Route path="/employee/regularization" element={<EmployeeRegularization />} />
              <Route path="/employee/leave" element={<Leave />} />
              <Route path="/employee/attendance" element={<Attendance />} />
              <Route path="/employee/calendar" element={<Calendar />} />
              
              {/* Approval routes */}
              <Route path="/approvals/timesheet" element={<TimesheetApproval />} />
              <Route path="/approvals/regularization" element={<RegularizationApproval />} />
              <Route path="/approvals/leave" element={<LeaveApproval />} />
              <Route path="/approvals/auto-terminated" element={<AutoTerminated />} />
              
              {/* Admin routes */}
              <Route path="/admin/leave-policies" element={<LeavePolicies />} />
              <Route path="/admin/holidays" element={<Holidays />} />
              <Route path="/admin/projects" element={<Projects />} />

              {/* Bench Profiles */}
              <Route path="/bench-pool" element={<BenchProfilesPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}


// 2. The main App component now ONLY sets up the Router context.
function App() {
  return (
    <Router>
      <AppContent />
      <GlobalDialogs />

    </Router>
  );
}

export default App;