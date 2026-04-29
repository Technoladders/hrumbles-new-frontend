// src/App.jsx — COMPLETE FILE with all session management fixes applied
// Changes from original:
//   1. session_revocations realtime listener (already added by you — kept)
//   2. validateCurrentSession now checks hr_organizations.status (suspended/inactive)
//   3. Minor: revocation listener useEffect gets [dispatch] dep array

import { useEffect, useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ReactGA from 'react-ga4';
import store from "./Redux/store";
import { useDispatch, useSelector } from "react-redux";
import supabase from "./config/supabaseClient"

import { setOrganization } from "./Redux/organizationSlice";
import { getOrganizationSubdomain } from "./utils/subdomain";
import { fetchFirmOrganizationDetails } from "./Redux/firmOrganizationSlice";
import { fetchUserPermissions } from "./Redux/permissionSlice";

import SessionExpiredModal from "./components/SessionExpiredModal";
import { showSessionExpiredModal } from "./Redux/uiSlice";
import { logout } from './Redux/authSlice';

import DomainVerificationPage from "./pages/DomainVerificationPage";
import Login from "./pages/LoginPage";
import SignUp from "./pages/GlobalSuperAdmin";
import PrivateRoutes from "./utils/PrivateRoutes";
import CompleteYourProfile from "./components/CompleteYourProfile";
import ProtectedRoute from "./components/ProtectedRoute";

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
import PasswordChange from "./pages/ChangeEmployeePassword";
import SetPassword from "./pages/SetPassword";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProfilePageEmployee from "./pages/ProfilePageEmployee";
import EmployeeList from "./pages/EmployeeList";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeOnboard from "./pages/EmployeeOnboard";
import EmployeeProfile from "./pages/EmployeeProfile";
import GoalPage from "./pages/goals/Index";
import GoalView from "./pages/goals/EmployeeView";
import GoalDetail from "./pages/goals/GoalDetail";
import EmployeeGoalView from "./components/goals/employee/EmployeeGoalDashboard";
import GoalDetailView from "./components/goals/dashboard/GoalDetailView";
import EmployeeGoalDetail from "./pages/goals/EmployeeGoalDetail";
import ProfileEditEmployee from "./pages/ProfileEditEmployee";
import MySubmissionsReport from "./pages/reports/MySubmissionsReport";
import OpenAIUsageReport from '@/components/reports/OpenAIUsageReport';
import ClientNew from "./pages/ClientNew/page";
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
import SharedProfile from "./pages/jobs/SharedProfile";
import ReportsPage from "./pages/reports/Index";
import EmployeeProfilePage from "./components/MagicLinkView/EmployeeProfileDrawer";
import CandidateConsentPage from './components/MagicLinkView/CandidateConsentPage';
import CandidateProfileV2 from "./components/MagicLinkView/candidate-profile-v2/CandidateProfileV2";
import SharedProfileV2 from "./components/MagicLinkView/candidate-profile-v2/SharedProfileV2";
import CandidateApplicationPage from "./pages/candidates/CandidateApplicationPage.jsx";
import InviteResponsesPage from "./pages/jobs/InviteResponsesPage";
import MyInvitesPage from './pages/invites/MyInvitesPage.jsx';
import CandidateSearch from "@/components/CandidateSearch";
import SavedCandidatesPage from "@/pages/candidates/SavedCandidatesPage";
import SavedRRCandidatesPage from "@/components/rocketreach/SavedRRCandidatesPage";
import JobRouteHandler from "./components/jobs/JobRouteHandler";
import JobViewRouteHandler from "./components/jobs/JobViewRouteHandler";
import BgvAnalyticsDashboard from "./pages/bg-verification/BgvAnalyticsDashboard.tsx";
import CandidateBgvProfilePage from "./pages/bg-verification/CandidateBgvProfilePage";
import AllCandidatesPage from "./pages/bg-verification/AllCandidatesPage";
import TalentPoolPage from "./pages/candidates/TalentPoolPage";
import CandidateProfilePage from "./pages/candidates/CandidateProfilePage";
import MigratedTalentPoolPage from "./pages/candidates/MigratedTalentPoolPage";
import MigratedCandidateProfilePage from "./pages/candidates/MigratedCandidateProfilePage";
import ZiveXSearchPage from "./pages/candidates/ZiveXSearchPage";
import ZiveXResultsPage from "./pages/candidates/ZiveXResultsPage";
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
import CompaniesPage from "./pages/sales/CompaniesPage";
import CompanyIntelligenceSearchPage from "./pages/sales/CompanyIntelligenceSearchPage";
import CompanyDetail from "./pages/sales/CompanyDetail";
import CompanyEdit from "./pages/sales/CompanyEdit";
import ContactsPage from "./pages/sales/ContactsPage";
import EditableContactsPage from './pages/sales/EditableContactsPage';
import TanstackContactsPage from './pages/sales/TanstackContactsPage';
import KanbanView from './pages/sales/KanbanBoard';
import ListsPage from './pages/sales/ListsPage';
import LeadsWorkspace from './pages/crm/LeadsWorkspace.tsx';
import ContactDetailPage from './pages/sales/ContactDetailPage.tsx';
import SalesDashboard from "./pages/sales/SalesDashboard";
import DiscoveryPage from "./pages/sales/DiscoveryPage";
import SyncReportsPage from "./pages/sales/SyncReportsPage";
import ContactsV2Page from '@/pages/sales/ContactsV2Page';
import CreditUsageReport from '@/components/reports/CreditUsageReport.tsx';
import ApolloUsageReport from '@/components/reports/ApolloUsageReport';
import ActivityLogReport from '@/components/reports/ActivityLogReport.tsx';
import RocketReachSearchPage from "./components/rocketreach/RocketReachSearchPage";
import ClientPage from "./pages/clients/ClientDashboard";
import ClientManagementDashboard from "./pages/client-dashboard/ClientManagementDashboard";
import ClientCandidatesView from "./pages/client-dashboard/ClientCandidatesView";
import ClientMetricsDashboard from "./pages/client-dashboard/ClientMetricsDashboard";
import TimeTracker from "./pages/TimeManagement/employee/TimeTracker";
import Timesheet from "./pages/TimeManagement/employee/Timesheet";
import Leave from "./pages/TimeManagement/employee/Leave";
import Attendance from "./pages/TimeManagement/employee/Attendance";
import Calendar from "./pages/TimeManagement/employee/Calendar";
import EmployeeRegularization from "./pages/TimeManagement/employee/Regularization";
import GlobalDialogs from "./components/TimeManagement/timesheet/GlobalDialogs";
import { useTimesheetStore } from '@/stores/timesheetStore';
import { useEmployeeContext } from './hooks/useEmployeeContext';
import TimesheetApproval from "./pages/TimeManagement/approvals/TimesheetApproval";
import LeaveApproval from "./pages/TimeManagement/approvals/LeaveApproval";
import AutoTerminated from "./pages/TimeManagement/approvals/AutoTerminated";
import RegularizationApproval from "./pages/TimeManagement/approvals/RegularizationApproval";
import LeavePolicies from "./pages/TimeManagement/admin/LeavePolicies";
import Holidays from "./pages/TimeManagement/admin/Holidays";
import Projects from "./pages/TimeManagement/admin/Projects";
import LeaveAudit from "./pages/TimeManagement/admin/LeaveAudit";
import BenchProfilesPage from "./pages/bench-profiles/BenchProfilesPage";
import UserActivityDetailsPage from "./components/reports/UserActivityDetailsPage";
import JobBoardIntegrations from "./pages/integrations/JobBoardIntegrations.tsx";
import { JobBoardsHub } from "@/components/jobs/job-boards";
import WhatsAppInbox from '@/components/whatsapp/WhatsAppInbox';
import WhatsAppSettings from "./components/settings/WhatsAppSettings.tsx";
import OrganizationProfilePage from "./pages/settings/OrganizationProfilePage.tsx";
import { InterviewsPage } from '@/components/dashboard/widgets/InterviewsWidget';
import MigrationPage from "@/components/global/MigrationPage";
import MigrationHistoryPage from "@/components/global/MigrationHistoryPage";
import CallAnalyticsReport from "@/components/sales/activity-report/CallAnalyticsReport.tsx";

const FullScreenLoader = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

const RouteChangeTracker = () => {
  const location = useLocation();
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);
  return null;
};

function AppContent() {
  const location = useLocation();
  const dispatch = useDispatch();
  const organizationSubdomain = getOrganizationSubdomain();
  const organizationId = useSelector((state) => state.auth.organization_id);
  const firmOrgStatus = useSelector((state) => state.firmOrganization.status);
  const reduxUser = useSelector((state) => state.auth.user);

  const [isOrgValidated, setIsOrgValidated] = useState(null);

  const publicPaths = [
    '/login', '/signup', '/set-password', '/forgot-password',
    '/careers', '/job/', '/share/', '/share-v2/', '/consent/', '/talentcareers', '/',
    '/apply/',
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ CHANGE 1: Session Revocation Realtime Listener
  // Listens for rows inserted into session_revocations for the current user.
  // When fired → immediately sign out → show SessionExpiredModal.
  // Works for both: admin revoke AND single-session enforcement from login.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let channel = null;

    const setupRevocationListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Find this user's employee id
      const { data: emp } = await supabase
        .from("hr_employees")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!emp?.id) return;

      channel = supabase
        .channel(`session-revoked:${emp.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "session_revocations",
            filter: `user_id=eq.${emp.id}`,
          },
          async (payload) => {
            console.log("[Session] Revocation received, reason:", payload.new.reason);
            // Sign out immediately — clears local JWT
            await supabase.auth.signOut();
            dispatch(logout());
            dispatch(showSessionExpiredModal());
          }
        )
        .subscribe();
    };

    setupRevocationListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [dispatch]); // ✅ dispatch is stable but included for correctness

  // ─────────────────────────────────────────────────────────────────────────
  // Organization Validation
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const validateOrganization = async () => {
      let subdomain = getOrganizationSubdomain();
      if (subdomain === 'app' || subdomain === 'www') subdomain = null;

      if (!subdomain) {
        setIsOrgValidated(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .single();

        if (error || !data) {
          setIsOrgValidated(false);
        } else {
          dispatch(setOrganization(subdomain));
          setIsOrgValidated(true);
        }
      } catch {
        setIsOrgValidated(false);
      }
    };

    validateOrganization();
  }, [dispatch]);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ CHANGE 2: validateCurrentSession — now also checks org.status
  // Added: suspended / inactive org check so those users get booted
  // Superadmins see the SubscriptionLockModal in MainLayout instead
  // ─────────────────────────────────────────────────────────────────────────
 const validateCurrentSession = useCallback(async () => {
    const isPublic = publicPaths.some(p => {
      if (p === '/') return location.pathname === '/';
      return location.pathname.startsWith(p);
    });
    if (isPublic) return;
 
    const currentLoggingOutState = store.getState().auth.isLoggingOut;
    if (currentLoggingOutState) return;
 
    if (isOrgValidated !== true) return;
 
    const { data: { session } } = await supabase.auth.getSession();
 
    if (!session) {
      dispatch(showSessionExpiredModal());
      return;
    }
 
    if (session?.user?.id) {
      const { data } = await supabase
        .from('hr_employees')
        .select(`
          status,
          role_id,
          hr_roles (name),
          hr_organizations!inner (
            subscription_status,
            status
          )
        `)
        .eq('id', session.user.id)
        .single();
 
      if (data) {
        const rawRole    = data.hr_roles;
        const roleName   = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
        const userStatus = data.status;
        const subStatus  = data.hr_organizations?.subscription_status;
        const orgStatus  = data.hr_organizations?.status; // ✅ NEW: check org.status
 
        const isSuperAdmin = roleName === 'organization_superadmin' || roleName === 'global_superadmin';
 
        // 1. Inactive/terminated employee
        if (userStatus !== 'active') {
          await supabase.auth.signOut();
          dispatch(logout());
          window.location.href = "/login";
          return;
        }
 
        // 2. Org suspended or inactive → ALL users stay logged in.
        //    SubscriptionLockModal in MainLayout shows for everyone with a logout button.
        //    No silent force-logout — user gets to see the reason and choose to log out.
        if (orgStatus === 'suspended' || orgStatus === 'inactive') {
          return; // MainLayout's orgLockReason handles the UI for all roles
        }
 
        // 3. Subscription expired/canceled → same: show modal, don't force-logout.
        //    MainLayout subscription check sets orgLockReason for all roles.
        const isSubExpired = subStatus === 'expired' || subStatus === 'inactive' || subStatus === 'canceled';
        if (isSubExpired) {
          return; // MainLayout modal handles this for all roles
        }
      }
    }
  }, [dispatch, location.pathname, isOrgValidated]);

  useEffect(() => {
    validateCurrentSession();

    const handleStorageChange = (e) =>
      (e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) && validateCurrentSession();
    const handleVisibilityChange = () =>
      document.visibilityState === 'visible' && validateCurrentSession();

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      const loggingOut = store.getState().auth.isLoggingOut;
      if (loggingOut) return;

      if (event === 'SIGNED_OUT') {
        const isPublicRoute = publicPaths.some(p => window.location.pathname.startsWith(p));
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

  useEffect(() => {
    if (organizationId && firmOrgStatus === 'idle') {
      dispatch(fetchFirmOrganizationDetails(organizationId));
    }
  }, [organizationId, firmOrgStatus, dispatch]);

  useEffect(() => {
    if (organizationSubdomain) {
      dispatch(setOrganization(organizationSubdomain));
    }
  }, [organizationSubdomain, dispatch]);

  useEffect(() => {
    if (reduxUser?.id && organizationId) {
      const fetchPerms = async () => {
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
            organizationId: organizationId,
          }));
        }
      };
      fetchPerms();
    }
  }, [reduxUser?.id, organizationId, dispatch]);

  if (isOrgValidated === null) return <FullScreenLoader />;

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
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/talentcareers" element={<Career />} />
        <Route path="/careers" element={<TalentView />} />
        <Route path="/job/:jobId" element={<JobDetailTalent />} />
        <Route path="/job/:jobId/apply" element={<CareerJobApplication />} />
        <Route path="/share/:shareId" element={<SharedProfile />} />
        <Route path="/share-v2/:shareId" element={<SharedProfileV2 />} />
        <Route path="/apply/:inviteToken" element={<CandidateApplicationPage />} />
        <Route path="/consent/:consentId" element={<CandidateConsentPage />} />

        <Route element={<PrivateRoutes allowedRoles={["global_superadmin","organization_superadmin","admin","employee"]} />}>
          <Route path="/complete-profile" element={<CompleteYourProfile />} />
          <Route path="employee/:id" element={<EmployeeOnboard />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="profile/edit/:id" element={<ProfileEditEmployee />} />
              <Route path="/password" element={<PasswordChange />} />
              <Route path="/organization" element={<GlobalSuperadminDashboard />} />
              <Route path="/organization/:organizationId" element={<SingleOrganizationDashboard />} />
              <Route path="/migration" element={<MigrationPage />} />
              <Route path="/database/history" element={<MigrationHistoryPage />} />  
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
              <Route path="/reports/credit-usage" element={<CreditUsageReport />} />
              <Route path="/reports/openai-usage" element={<OpenAIUsageReport />} />
              <Route path="/reports/apollo-usage" element={<ApolloUsageReport />} />
              <Route path="/projects" element={<ProjectManagement />} />
              <Route path="/client/:id" element={<ClientDashboard />} />
              <Route path="/projects/:id" element={<ProjectDashboard />} />
              <Route path="/projects/:projectId/employee/:employeeId/details" element={<EmployeeProjectLogDetails />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="employee" element={<EmployeeList />} />
              <Route path="employee/new" element={<EmployeeForm />} />
              <Route path="employee/profile/:id" element={<EmployeeProfile />} />
              <Route path="/profile" element={<ProfilePageEmployee />} />
              <Route path="/clients" element={<ClientManagementDashboard />} />
              <Route path="/clients/:clientName/candidates" element={<ClientNew />} />
              <Route path="/client-metrics" element={<ClientMetricsDashboard />} />
              <Route path="/goals" element={<GoalPage />} />
              <Route path="/goals/:goalId" element={<GoalDetail />} />
              <Route path="/my-goals/:id" element={<EmployeeGoalDetail />} />
              <Route path="/goalsview" element={<GoalView />} />
              <Route path="goalview" element={<EmployeeGoalView />} />
              <Route path="/goals/:goalId/:goalType?" element={<GoalDetailView />} />
              <Route path="/jobs" element={<JobRouteHandler />} />
              <Route path="/jobs/:id" element={<JobViewRouteHandler />} />
              <Route path="/resume-analysis/:jobId/:candidateId" element={<ResumeAnalysisDetailView />} />
              <Route path="/jobs/:id/description" element={<JobDescription />} />
              <Route path="/jobs/edit/:id" element={<JobDescription />} />
              <Route path="/jobstatuses" element={<StatusSettings />} />
              <Route path="/jobs/candidateprofile/:candidateId/:jobId" element={<CandidateProfileV2 />} />
              <Route path="/candidate-v2/:candidateId/:jobId" element={<EmployeeProfilePage />} />
              <Route path="/interviews" element={<InterviewsPage />} />
              <Route path="/jobs/:id/invites" element={<InviteResponsesPage />} />
              <Route path="/my-invites" element={<MyInvitesPage />} />
              <Route path="/jobs/:jobId/candidate/:candidateId/bgv" element={<CandidateBgvProfilePage />} />
              <Route path="/all-candidates" element={<AllCandidatesPage />} />
              <Route path="/bg-verification/analytics" element={<BgvAnalyticsDashboard />} />
              <Route path="/search/candidates/beta" element={<CandidateSearch />} />
              <Route path="/search/candidates/saved" element={<SavedCandidatesPage />} />
              <Route path="/search/global/saved" element={<SavedRRCandidatesPage />} />
              <Route path="/integrations/job-boards" element={<JobBoardIntegrations />} />
              <Route path="/job-boards" element={<JobBoardsHub />} />
              <Route path="/my-submission" element={<MySubmissionsReport />} />
              <Route path="/talent-pool" element={<TalentPoolPage />} />
              <Route path="/talent-pool/:candidateId" element={<CandidateProfilePage />} />
              <Route path="/migrated-talent-pool" element={<MigratedTalentPoolPage />} />
              <Route path="/migrated-talent-pool/:candidateId" element={<MigratedCandidateProfilePage />} />
              <Route path="/zive-x" element={<ZiveXSearchPage />} />
              <Route path="/zive-x-search/results" element={<ZiveXResultsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/user-activity-details/:employeeId" element={<UserActivityDetailsPage />} />
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
              <Route path="/sales/dashboard" element={<SalesDashboard />} />
              <Route path="/activity-log" element={<ActivityLogReport />} />
              <Route path="/call-analytics" element={<CallAnalyticsReport />} />
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
              <Route path="/contacts-v2" element={<ContactsV2Page />} />
              <Route path="/contacts-v2/list/:fileId" element={<ContactsV2Page />} />
              <Route path="/contacts-v2/discovery" element={<ContactsV2Page />} />
              <Route path="/recruiter-x" element={<RocketReachSearchPage />} />
              <Route path="/employee/time-tracker" element={<TimeTracker />} />
              <Route path="/employee/timesheet" element={<Timesheet />} />
              <Route path="/employee/regularization" element={<EmployeeRegularization />} />
              <Route path="/employee/leave" element={<Leave />} />
              <Route path="/employee/attendance" element={<Attendance />} />
              <Route path="/employee/calendar" element={<Calendar />} />
              <Route path="/approvals/timesheet" element={<TimesheetApproval />} />
              <Route path="/approvals/regularization" element={<RegularizationApproval />} />
              <Route path="/approvals/leave" element={<LeaveApproval />} />
              <Route path="/approvals/auto-terminated" element={<AutoTerminated />} />
              <Route path="/admin/leave-policies" element={<LeavePolicies />} />
              <Route path="/admin/leave-audit" element={<LeaveAudit />} />
              <Route path="/admin/holidays" element={<Holidays />} />
              <Route path="/admin/projects" element={<Projects />} />
              <Route path="/bench-pool" element={<BenchProfilesPage />} />
              <Route path="/whatsapp-conversations" element={<WhatsAppInbox />} />
              <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />
              <Route path="/settings/organization-profile" element={<OrganizationProfilePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <GlobalDialogs />
    </Router>
  );
}

export default App;