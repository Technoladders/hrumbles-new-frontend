import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut, FiList } from "react-icons/fi";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople, MdOutlineAccountBalance, MdMoreTime, MdPeopleAlt } from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";
import { AiOutlineProfile } from "react-icons/ai";
import { FaFileInvoiceDollar, FaSackDollar, FaArrowsDownToPeople, FaRegCalendarCheck, FaDropbox, FaFileLines } from "react-icons/fa6";
import { TbCheckbox } from "react-icons/tb";
import { GoOrganization } from "react-icons/go";
import { VscOrganization } from "react-icons/vsc";
import { GrDocumentTime } from "react-icons/gr";
import { LuCalendarPlus, LuUserSearch, LuCalendarCog } from "react-icons/lu";
import { BsShieldLock, BsShieldCheck, BsPin, BsGraphUpArrow } from "react-icons/bs";
import { FaUserShield, FaProjectDiagram, FaUserTie } from 'react-icons/fa';
import { RiCustomerService2Fill } from 'react-icons/ri';
import { TbDatabaseSearch } from "react-icons/tb";
import { LiaBusinessTimeSolid } from "react-icons/lia";
import { CgOrganisation } from "react-icons/cg";

import { BarChart3, TrendingUp, LayoutDashboard } from 'lucide-react';

const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";
const DEMO_ORGANIZATION_ID = "53989f03-bdc9-439a-901c-45b274eff506";
const RECRUITMENT_FIRM_ID = "87fd4bb2-dbaf-4775-954a-eb82f70ac961";

// Helper function to filter items
const filterRestrictedItems = (items, isPurelyPermanentOrg) => {
    if (!isPurelyPermanentOrg) return items;
    const restrictedLabels = ["Bench Pool", "Projects"];
    const filterItem = (item) => {
        if (restrictedLabels.includes(item.label)) return null;
        if (item.dropdown) {
            const filteredDropdown = item.dropdown.map(filterItem).filter(Boolean);
            if (filteredDropdown.length === 0) return null;
            return { ...item, dropdown: filteredDropdown };
        }
        return item;
    };
    return items.map(filterItem).filter(Boolean);
};

// --- TEMPORARY MENU FOR ITECH ORGANIZATION --- (This remains unchanged)
const iTechOrgSuperAdminMenu = [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    // { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
    // { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" },
    { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
    // { icon: GoGoal, label: "Goals", path: "/goals" },
    // { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
];



const recruitmentFirmOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt, 
        items: [
           { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Employees", path: "/employee" },
  { icon: FiBriefcase, label: "Jobs", path: "/jobs" }, 
  { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool" },

  { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", beta: true },
  { icon: GoGoal, label: "Goals", path: "/goals" },
  { icon: ImProfile, label: "My Profile", path: "/profile" },
  { icon: AiOutlineProfile, label: "Reports", path: "/reports" },

  {
    icon: TbCheckbox,
    label: "Approvals",
    path: "#",
    dropdown: [
      { icon: TbCheckbox, label: "Timesheet", path: "/approvals/timesheet" },
      { icon: TbCheckbox, label: "Regularization", path: "/approvals/regularization" },
      // { icon: TbCheckbox , label:"Leave", path: "/approvals/leave"},
    ],
  },
  {
    icon: LuCalendarCog,
    label: "Leave Management",
    path: "#",
    dropdown: [
      { icon: TbCheckbox , label:"Leave Approval", path: "/approvals/leave"},
      { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
      // { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },

    ],
  },
  // {
  //   icon: FiSettings,
  //   label: "Settings",
  //   path: "#",
  //   dropdown: [
  //     { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
  //     { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },
  //   ],
  // },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },

        ],
    },
    {
        title: "PROJECT SUITE",
        icon: CgOrganisation, 
        items: [  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" }, 
        ],
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck, 
        items: [
            { icon: LuUserSearch, label: "Verification", path: "/all-candidates" },
        ],
    }
];

const verificationFirmOrgSuperAdminMenu = [

            { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
            { icon: LuUserSearch, label: "My Verifications", path: "/all-candidates" },
            { icon: BsGraphUpArrow, label: "Analytics", path: "/bg-verification/analytics" },
            
  // { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },


];

const AscendionOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt, 
        items: [
           { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
           
            { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  // { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },

        ],
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck, 
        items: [
            { icon: LuUserSearch, label: "Verification", path: "/all-candidates" },
        ],
    }
];

// 1. Map permission keys to their respective Suites
const SUITE_CONFIG = {
  general: { title: "GENERAL SUITE", icon: MdDashboardCustomize },
  recruitment: { title: "HIRING SUITE", icon: MdPeopleAlt },
  verification: { title: "VERIFICATION", icon: BsShieldCheck },
  sales: { title: "SALES SUITE", icon: RiCustomerService2Fill },
  finance: { title: "FINANCE SUITE", icon: MdOutlineAccountBalance }
};


export const getDynamicMenu = (userPermissions, orgFeatures = {}, role) => {
  if (role === 'global_superadmin') return [];

  const categorizedMenu = [];

  Object.keys(SUITE_CONFIG).forEach(suiteKey => {
    const config = SUITE_CONFIG[suiteKey];
    
    // Check if Global Admin enabled this suite (General is always on)
    const isSuiteEnabled = suiteKey === 'general' || orgFeatures[`${suiteKey}_suite`] !== false;

    if (isSuiteEnabled) {
      const suiteItems = masterMenuItems.filter(item => {
        const matchesSuite = item.suite === suiteKey.toUpperCase();
        
        // Check permissions for item or its sub-dropdowns
        if (item.dropdown) {
           const hasSubPerm = item.dropdown.some(sub => userPermissions.includes(sub.permission));
           return matchesSuite && hasSubPerm;
        }
        return matchesSuite && userPermissions.includes(item.permission);
      }).map(item => {
        if (item.dropdown) {
          return { ...item, dropdown: item.dropdown.filter(sub => userPermissions.includes(sub.permission)) };
        }
        return item;
      });

      if (suiteItems.length > 0) {
        categorizedMenu.push({
          title: config.title,
          icon: config.icon,
          items: suiteItems
        });
      }
    }
  });

  return categorizedMenu;
};

// 2. Define the Master Menu with Permission Requirements
const masterMenuItems = [
  // --- GENERAL SUITE ---
  { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard", suite: "GENERAL", permission: "view_dashboard" },
  { icon: FiUsers, label: "Employees", path: "/employee", suite: "GENERAL", permission: "access_employees" },
  { icon: GoGoal, label: "Goals", path: "/goals", suite: "GENERAL", permission: "view_goals" },
  { icon: ImProfile, label: "My Profile", path: "/profile", suite: "GENERAL", permission: "view_profile" },
  { icon: AiOutlineProfile, label: "Reports", path: "/reports", suite: "GENERAL", permission: "view_reports" },
  { icon: GrDocumentTime, label: "Time Sheet", path: "/employee/timesheet", suite: "GENERAL", permission: "access_timesheet" },
  { icon: MdMoreTime, label: "Regularization", path: "/employee/regularization", suite: "GENERAL", permission: "access_regularization" },
  { icon: LuCalendarPlus, label: "Leave", path: "/employee/leave", suite: "GENERAL", permission: "access_leave" },
  { icon: FaRegCalendarCheck, label: "Attendance", path: "/employee/attendance", suite: "GENERAL", permission: "access_attendance" },
  { icon: IoCalendarNumberOutline, label: "Calendar", path: "/employee/calendar", suite: "GENERAL", permission: "access_calendar" },
  {
    icon: TbCheckbox, label: "Approvals", path: "#", suite: "GENERAL",
    dropdown: [
      { icon: TbCheckbox, label: "Timesheet", path: "/approvals/timesheet", permission: "approve_timesheet" },
      { icon: TbCheckbox, label: "Regularization", path: "/approvals/regularization", permission: "approve_regularization" },
    ],
  },
  {
    icon: LuCalendarCog, label: "Leave Management", path: "#", suite: "GENERAL",
    dropdown: [
      { icon: TbCheckbox, label: "Leave Approval", path: "/approvals/leave", permission: "approve_leave" },
      { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies", permission: "manage_leave_policies" },
    ],
  },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management", suite: "GENERAL", permission: "access_user_management" },
  {
    icon: FiSettings, label: "Settings", path: "#", suite: "GENERAL",
    dropdown: [
      { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays", permission: "manage_holidays" },
      { icon: BsShieldLock, label: "Password", path: "/password", permission: "change_password" },
    ],
  },

  // --- RECRUIT & PROJECT SUITE ---
  { icon: FiBriefcase, label: "Jobs", path: "/jobs", suite: "RECRUITMENT", permission: "access_jobs" },
  { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool", suite: "RECRUITMENT", permission: "view_talent_pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool", suite: "RECRUITMENT", permission: "view_bench_pool" },
  { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", suite: "RECRUITMENT", permission: "access_zive_x", beta: true },
  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients", suite: "RECRUITMENT", permission: "access_client_management" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects", suite: "RECRUITMENT", permission: "access_project_management" },

  // --- VERIFICATION SUITE ---
  { icon: LuUserSearch, label: "Verification", path: "/all-candidates", suite: "VERIFICATION", permission: "access_verifications" },
  { icon: BsGraphUpArrow, label: "Analytics", path: "/bg-verification/analytics", suite: "VERIFICATION", permission: "view_bgv_analytics" },

  // --- SALES SUITE ---
  { icon: GoOrganization, label: "Companies", path: "/companies", suite: "SALES", permission: "access_companies" },
  { icon: VscOrganization, label: "People", path: "/contacts", suite: "SALES", permission: "access_people" },
  { icon: FiList, label: "Lists", path: "/lists", suite: "SALES", permission: "access_lists" },
  { icon: FaDropbox, label: "Kanban", path: "/sales/kanban", suite: "SALES", permission: "access_kanban" },

  // --- FINANCE SUITE ---
  { icon: MdOutlineAccountBalance, label: "Finance", path: "/finance", suite: "FINANCE", permission: "access_finance" },
  { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices", suite: "FINANCE", permission: "access_invoices" },
  { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses", suite: "FINANCE", permission: "access_expenses" },
  { icon: FiBriefcase, label: "Payroll", path: "/payroll", suite: "FINANCE", permission: "access_payroll" },
  { icon: FaFileLines, label: "Bank Statement", path: "/bank-statement", suite: "FINANCE", permission: "access_bank_statement" },
];

/**
 * NEW DYNAMIC MENU GENERATOR
 * @param {Array} userPermissions - Array of strings from Redux (e.g., ['view_dashboard', 'access_jobs'])
 * @param {Object} orgFeatures - subscription_features from hr_organizations
 * @param {string} role - The user role
 * @param {string|null} departmentName - Optional department filter for admin role
 */



export const menuItemsByRole = {
    global_superadmin: [
        { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
        { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
        { icon: BsShieldCheck, label: "Verifications", path: "/verifications" },
        { icon: FaFileInvoiceDollar, label: "Invoices", path: "/organization/invoices" },
        {
            icon: BarChart3,
            label: "Reports",
            path: "/reports",
            dropdown: [
                { icon: TrendingUp, label: "Org. Talent Trends", path: "/reports/organization-talent-trends" },
            ],
        },
        { icon: FiSettings, label: "Settings", path: "/settings" },
    ],
    organization_superadmin: (organizationId, organization, isPurelyPermanentOrg, userPermissions) => {
        const orgFeatures = organization?.subscription_features || {};
        let rawMenu = getDynamicMenu(userPermissions, orgFeatures, 'organization_superadmin');
        return rawMenu.map(suite => ({
            ...suite,
            items: filterRestrictedItems(suite.items, isPurelyPermanentOrg)
        })).filter(suite => suite.items.length > 0);
    },
    admin: (departmentName, isPurelyPermanentOrg, userPermissions) => {
        const orgFeatures = { hiring_suite: true, project_suite: true, finance_suite: true, sales_suite: true, verification_suite: true };
        let rawMenu = getDynamicMenu(userPermissions, orgFeatures, 'admin');
        return rawMenu.map(suite => ({
            ...suite,
            items: filterRestrictedItems(suite.items, isPurelyPermanentOrg)
        })).filter(suite => suite.items.length > 0);
    },
    employee: (departmentName, designationName, userId, isPurelyPermanentOrg, userPermissions) => {
        const orgFeatures = { hiring_suite: true, project_suite: true, finance_suite: true, sales_suite: true, verification_suite: true };
        let rawMenu = getDynamicMenu(userPermissions, orgFeatures, 'employee');
        return rawMenu.map(suite => ({
            ...suite,
            items: filterRestrictedItems(suite.items, isPurelyPermanentOrg)
        })).filter(suite => suite.items.length > 0);
    }
};

export const extraMenuItems = [
  { icon: FiLogOut, label: "Logout", action: "logout" },
];
// New layout change