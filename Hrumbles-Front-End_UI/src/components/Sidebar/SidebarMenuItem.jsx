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
import { LuCalendarPlus, LuUserSearch } from "react-icons/lu";
import { BsShieldLock, BsShieldCheck, BsPin } from "react-icons/bs";
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

// --- START: organization_superadmin categorization logic ---

// 1. Define all items for the role in one place
const orgSuperAdminAllItems = [
  { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Employees", path: "/employee" },
  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" },
  { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  { icon: LuUserSearch, label: "All Candidates", path: "/all-candidates" },
  { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool" },
  { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", beta: true },
  { icon: GoGoal, label: "Goals", path: "/goals" },
  { icon: ImProfile, label: "My Profile", path: "/profile" },
  { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
  { icon: MdOutlineAccountBalance, label: "Finance", path: "/finance",  },
  
            { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices",  },
            { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses",  },
            { icon: FiBriefcase, label: "Payroll", path: "/payroll",  },
            { icon: FaFileLines, label: "Bank Statement", path: "/finance/bank-statement" },
  {
    icon: TbCheckbox,
    label: "Approvals",
    path: "#",
    dropdown: [
      { icon: TbCheckbox, label: "Timesheet", path: "/approvals/timesheet" },
      { icon: TbCheckbox, label: "Regularization", path: "/approvals/regularization" },
      { icon: TbCheckbox , label:"Leave", path: "/approvals/leave"},
      { icon: TbCheckbox, label: "Auto-Terminated Timesheets", path: "/approvals/auto-terminated" },
    ],
  },
  { icon: GoOrganization, label: "Companies", path: "/companies" },
  { icon: VscOrganization, label: "People", path: "/contacts" },
  { icon: FiList, label: "Lists", path: "/lists" },
  { icon: FaDropbox, label: "Kanban", path: "/contacts/kanban" },
  {
    icon: FiSettings,
    label: "Settings",
    path: "#",
    dropdown: [
      { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
      { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },
      { icon: BsShieldLock, label: "Password", path: "/password" },
    ],
  },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
];


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

const demoOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt, // Using the same icon for consistency
        items: [
           { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Employees", path: "/employee" },
  { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool" },

  // { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", beta: true },
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
      { icon: TbCheckbox , label:"Leave", path: "/approvals/leave"},
      { icon: TbCheckbox, label: "Auto-Terminated Timesheets", path: "/approvals/auto-terminated" },
    ],
  },
  {
    icon: FiSettings,
    label: "Settings",
    path: "#",
    dropdown: [
      { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
      { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },
      { icon: BsShieldLock, label: "Password", path: "/password" },
    ],
  },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },

        ],
    },
    {
        title: "PROJECT SUITE",
        icon: CgOrganisation, // Using the same icon for consistency
        items: [  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" }, 
        ],
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck, // Using the same icon for consistency
        items: [
            { icon: LuUserSearch, label: "Verification", path: "/all-candidates" },
        ],
    }
];

const recruitmentFirmOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt, // Using the same icon for consistency
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
      { icon: TbCheckbox , label:"Leave", path: "/approvals/leave"},
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
        icon: CgOrganisation, // Using the same icon for consistency
        items: [  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" }, 
        ],
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck, // Using the same icon for consistency
        items: [
            { icon: LuUserSearch, label: "Verification", path: "/all-candidates" },
        ],
    }
];

const AscendionOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt, // Using the same icon for consistency
        items: [
           { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
           
            { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  // { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
  { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },

        ],
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck, // Using the same icon for consistency
        items: [
            { icon: LuUserSearch, label: "Verification", path: "/all-candidates" },
        ],
    }
];
// 2. Define the items for each suite
const projectSuiteLabels = ["Clients", "Projects"];
const salesSuiteLabels = ["Companies", "People", "Lists", "Kanban"];
const financeSuiteLabels = ["Finance", "Invoices", "Expenses", "Payroll", "Bank Statement"];
const verificationSuiteLabels = ["All Candidates"];

const projectSuiteItems = orgSuperAdminAllItems.filter(item => projectSuiteLabels.includes(item.label));
const salesSuiteItems = orgSuperAdminAllItems.filter(item => salesSuiteLabels.includes(item.label));
const financeSuiteItems = orgSuperAdminAllItems.filter(item => financeSuiteLabels.includes(item.label));
const verificationSuiteItems = orgSuperAdminAllItems.filter(item => verificationSuiteLabels.includes(item.label));

// 3. The HR suite contains everything else
const hrSuiteItems = orgSuperAdminAllItems.filter(
  item => !projectSuiteLabels.includes(item.label) && !salesSuiteLabels.includes(item.label) && !financeSuiteLabels.includes(item.label) && !verificationSuiteLabels.includes(item.label)
);

// 4. Structure the final menu data with categories AND ICONS
const categorizedOrgSuperAdminMenu = [
    {
        title: "HIRING SUITE",
        icon: MdPeopleAlt,
        items: hrSuiteItems,
    },
    {
        title: "PROJECT SUITE",
        icon: CgOrganisation,
        items: projectSuiteItems,
    },
    {
        title: "VERIFICATION SUITE",
        icon: BsShieldCheck,
        items: verificationSuiteItems,
    },
    {
        title: "SALES SUITE",
        icon: RiCustomerService2Fill,
        items: salesSuiteItems,
    },
    {
        title: "FINANCE SUITE",
        icon: MdOutlineAccountBalance,
        items: financeSuiteItems,
    }
];
// --- END: organization_superadmin logic ---


// --- START: New logic for admin categorization ---

// 1. Define all possible items for an Admin in one place
const adminAllItems = [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee", department: "Human Resource", },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool" },

  { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", department:"Human Resource", beta: true },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: GrDocumentTime, label: "Time Sheet", path: "/employee/timesheet" },
    { icon: MdMoreTime, label: "Regularization", path: "/employee/regularization" },
    { icon: LuCalendarPlus, label: "Leave", path: "/employee/leave" },
    { icon: FaRegCalendarCheck, label: "Attendance", path: "/employee/attendance" },
    { icon: IoCalendarNumberOutline, label: "Calendar", path: "/employee/calendar" },
    { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
    { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" }, // Using a different icon to avoid confusion
    // Department-specific items below
    { icon: GoOrganization, label: "Companies", path: "/companies", department: "Sales & Marketing" },
    { icon: VscOrganization, label: "People", path: "/contacts", department: "Sales & Marketing" },
    { icon: FiList, label: "Lists", path: "/lists", department: "Sales & Marketing" },
    { icon: FaDropbox, label: "Kanban", path: "/contacts/kanban", department: "Sales & Marketing" },
            { icon: MdOutlineAccountBalance, label: "Finance", path: "/finance",  department: "Human Resource", },
  
            { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices",  department: "Human Resource", },
            { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses",  department: "Human Resource", },
            { icon: FiBriefcase, label: "Payroll", path: "/payroll",  department: "Human Resource", },
      
  
    {
        icon: FiSettings,
        label: "Settings",
        path: "#",
        department: "Human Resource",
        dropdown: [
            { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
            { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },
        ],
    },
];

// 2. Define labels for each suite for the Admin role
const adminHrSuiteLabels = ["Dashboard", "Employees", "Jobs", "Talent Pool", "Bench Pool", "Zive-X", "Goals", "Reports", "My Profile", "Time Sheet", "Regularization", "Leave", "Attendance", "Calendar", "Settings"];
const adminProjectSuiteLabels = ["Clients", "Projects"];
const adminSalesSuiteLabels = ["Companies", "People", "Lists", "Kanban"];
const adminFinanceSuiteLabels = ["Finance", "Invoices", "Expenses", "Payroll"];

// 3. Create a function to generate the categorized menu for an Admin
const createCategorizedAdminMenu = (departmentName) => {
    // A. Filter the master list to get only items visible to this department
    const visibleItems = adminAllItems.filter(item =>
        !item.department || item.department === departmentName
    );

    // B. Group the visible items into their respective suites
    const hrItems = visibleItems.filter(item => adminHrSuiteLabels.includes(item.label));
    const projectItems = visibleItems.filter(item => adminProjectSuiteLabels.includes(item.label));
    const salesItems = visibleItems.filter(item => adminSalesSuiteLabels.includes(item.label));
    const financeItems = visibleItems.filter(item => adminFinanceSuiteLabels.includes(item.label));

    // C. Build the final categorized menu, only including suites that have items
    const categorizedMenu = [];

    if (hrItems.length > 0) {
        categorizedMenu.push({
            title: "HR Suite",
            icon: MdPeopleAlt,
            items: hrItems,
        });
    }
    if (projectItems.length > 0) {
        categorizedMenu.push({
            title: "PROJECT SUITE",
            icon: CgOrganisation,
            items: projectItems,
        });
    }
    if (salesItems.length > 0) {
        categorizedMenu.push({
            title: "SALES SUITE",
            icon: RiCustomerService2Fill,
            items: salesItems,
        });
    }
    if (financeItems.length > 0) {
        categorizedMenu.push({
            title: "FINANCE SUITE",
            icon: MdOutlineAccountBalance,
            items: financeItems,
        });
    }

    return categorizedMenu;
};

// --- END: admin categorization logic ---


export const menuItemsByRole = {
  global_superadmin: [
    // ... remains the same
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
     { icon: BsShieldCheck, label: "Verifications", path: "/verifications" },
     {
    icon: BarChart3, // Using BarChart3 from lucide-react
    label: "Reports",
    path: "/reports", // Parent path
    dropdown: [
      { icon: TrendingUp, label: "Org. Talent Trends", path: "/reports/organization-talent-trends" },
      // Add other reports specific to an organization here
    ],
  },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
organization_superadmin: (organizationId, organization) => {

   if (organization.is_recruitment_firm) {
      return recruitmentFirmOrgSuperAdminMenu;
    }
   if (ITECH_ORGANIZATION_ID.includes(organizationId)) {
      return iTechOrgSuperAdminMenu; // Return the simple menu for iTech
    } else if (organizationId === ASCENDION_ORGANIZATION_ID) {
      return AscendionOrgSuperAdminMenu; // Return the simple menu for Ascendion
    }
    else if (organizationId === DEMO_ORGANIZATION_ID) {
      return demoOrgSuperAdminMenu; // Return the simple menu for demo
    }
   
    return categorizedOrgSuperAdminMenu; // Return the standard suite menu for everyone else
  },
  admin: (departmentName) => createCategorizedAdminMenu(departmentName), // Use the new categorized function
employee: (departmentName, designationName, userId) => {
    // MODIFIED: Centralized definitions for menu item groups for reusability

    const SPECIAL_USER_ID = '00c22bbb-9781-44bc-9973-c53bd08c9da2';

    const coreEmployeeItems = [
      { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
      { icon: GrDocumentTime, label: "Time Sheet", path: "/employee/timesheet"},
      { icon: MdMoreTime, label: "Regularization", path: "/employee/regularization",},
      { icon: ImProfile, label: "My Profile", path: "/profile" },
      { icon: LuCalendarPlus, label: "Leave", path: "/employee/leave" },
      { icon: FaRegCalendarCheck, label: "Attendance", path: "/employee/attendance" },
      { icon: IoCalendarNumberOutline, label: "Calendar", path: "/employee/calendar" },
    ];

    const hrSpecificItems = [
      { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
      { icon: AiOutlineProfile, label: "My Submission", path: "/my-submission" },
      { icon: LuUserSearch, label: "Talent Pool", path: "/talent-pool" },
  { icon: BsPin, label: "Bench Pool", path: "/bench-pool" },
      { icon: TbDatabaseSearch, label: "Zive-X", path: "/zive-x", beta: true },
      { icon: GoGoal, label: "Goals", path: "/goalsview" },
      { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
    ];
    
    const salesSuiteItems = [
      { icon: GoOrganization, label: "Companies", path: "/companies" },
      { icon: VscOrganization, label: "People", path: "/contacts" },
      { icon: FiList, label: "Lists", path: "/lists" },
      { icon: RiCustomerService2Fill, label: "Kanban", path: "/contacts/kanban" }
    ];

    // --- NEW: Logic for the special user to get a categorized/suite menu ---
    if (userId === SPECIAL_USER_ID) {
      // Build and return the categorized menu structure
      return [
        {
          title: "HR Suite",
          icon: MdPeopleAlt,
          // This user gets all core employee items plus the HR-specific items
          items: [
             // Manually order items for the suite view
            { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
            ...hrSpecificItems,
            ...coreEmployeeItems.filter(item => item.label !== "Dashboard") // Add rest of core items
          ],
        },
        {
          title: "SALES SUITE",
          icon: RiCustomerService2Fill,
          items: salesSuiteItems,
        }
      ];
    }
    
    // --- Existing logic for all other employees (returns a flat menu) ---
    
    // Start with the base items for a standard employee
    let baseMenu = [...coreEmployeeItems];

    if (departmentName === "Human Resource") {
      // Insert HR-specific items after "Dashboard"
      baseMenu.splice(1, 0, ...hrSpecificItems);
    }

    if (departmentName === "Sales & Marketing" && designationName === "Consultant") {
      baseMenu.splice(1, 0, { icon: FiBriefcase, label: "Jobs", path: "/jobs" });
    }

    if (departmentName === "Sales & Marketing") {
      // Insert sales items after "My Profile" (or adjust index as needed)
      baseMenu.splice(4, 0, ...salesSuiteItems);
    }
    
    if (departmentName === "Finance") {
      return [
        { icon: MdOutlineAccountBalance, label: "Finance", path: "/finance" },
        { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices" },
        { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses" },
      ];
    }

    return baseMenu;
  },
};

export const extraMenuItems = [
  { icon: FiLogOut, label: "Logout", action: "logout" },
];