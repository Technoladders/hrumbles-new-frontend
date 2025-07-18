import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople, MdOutlineAccountBalance, MdMoreTime } from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";
import { AiOutlineProfile } from "react-icons/ai";
import { FaFileInvoiceDollar, FaSackDollar, FaArrowsDownToPeople, FaRegCalendarCheck } from "react-icons/fa6";
import { TbCheckbox } from "react-icons/tb";
import { GoOrganization } from "react-icons/go";
import { VscOrganization } from "react-icons/vsc";
import { GrDocumentTime } from "react-icons/gr";
import { LuCalendarPlus } from "react-icons/lu";
import { BsShieldLock } from "react-icons/bs";
import { FaUserShield, FaProjectDiagram } from 'react-icons/fa';
import { RiCustomerService2Fill } from 'react-icons/ri';

// --- START: organization_superadmin categorization logic ---

// 1. Define all items for the role in one place
const orgSuperAdminAllItems = [
  { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Employees", path: "/employee" },
  { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
  { icon: FaArrowsDownToPeople, label: "Projects", path: "/projects" },
  { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
  { icon: GoGoal, label: "Goals", path: "/goals" },
  { icon: ImProfile, label: "My Profile", path: "/profile" },
  { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
  {
    icon: MdOutlineAccountBalance,
    label: "Finance",
    path: "/finance",
    dropdown: [
      { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices" },
      { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses" },
      { icon: FiBriefcase , label:"Payroll", path: "/payroll"},
    ],
  },
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
  { icon: GoOrganization, label: "Company", path: "/companies" },
  { icon: VscOrganization, label: "Contacts", path: "/contacts" },
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

// 2. Define the items for each suite
const projectSuiteLabels = ["Clients", "Projects"];
const salesSuiteLabels = ["Company", "Contacts", "Finance"];

const projectSuiteItems = orgSuperAdminAllItems.filter(item => projectSuiteLabels.includes(item.label));
const salesSuiteItems = orgSuperAdminAllItems.filter(item => salesSuiteLabels.includes(item.label));
const financeSuiteItems = orgSuperAdminAllItems.filter(item => item.label === "Finance");

// 3. The HR suite contains everything else
const hrSuiteItems = orgSuperAdminAllItems.filter(
  item => !projectSuiteLabels.includes(item.label) && !salesSuiteLabels.includes(item.label)
);

// 4. Structure the final menu data with categories AND ICONS
const categorizedOrgSuperAdminMenu = [
    {
        title: "HR suite",
        icon: FaUserShield,
        items: hrSuiteItems,
    },
    {
        title: "Project Suite",
        icon: FaProjectDiagram,
        items: projectSuiteItems,
    },
    {
        title: "Sales Suite",
        icon: RiCustomerService2Fill,
        items: salesSuiteItems,
    },
    {
        title: "Finance Suite",
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
    { icon: GoOrganization, label: "Company", path: "/companies", department: "Sales & Marketing" },
    { icon: VscOrganization, label: "Contacts", path: "/contacts", department: "Sales & Marketing" },
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
const adminHrSuiteLabels = ["Dashboard", "Employees", "Jobs", "Goals", "Reports", "My Profile", "Time Sheet", "Regularization", "Leave", "Attendance", "Calendar", "Settings"];
const adminProjectSuiteLabels = ["Clients", "Projects"];
const adminSalesSuiteLabels = ["Company", "Contacts"];
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
            icon: FaUserShield,
            items: hrItems,
        });
    }
    if (projectItems.length > 0) {
        categorizedMenu.push({
            title: "Project Suite",
            icon: FaProjectDiagram,
            items: projectItems,
        });
    }
    if (salesItems.length > 0) {
        categorizedMenu.push({
            title: "Sales Suite",
            icon: RiCustomerService2Fill,
            items: salesItems,
        });
    }
    if (financeItems.length > 0) {
        categorizedMenu.push({
            title: "Finance Suite",
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
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: categorizedOrgSuperAdminMenu, // Use the new categorized structure
  admin: (departmentName) => createCategorizedAdminMenu(departmentName), // Use the new categorized function
  employee: (departmentName) => {
    // This logic is simple enough to remain as is, but could also be refactored
    // if it becomes more complex in the future.
     const baseMenu = [
      { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
      { icon: ImProfile, label: "My Profile", path: "/profile" },
      { icon: GrDocumentTime, label: "Time Sheet", path: "/employee/timesheet",
        dropdown: [
                { icon: MdMoreTime, label: "Regularization", path: "/employee/regularization",},
        ],
       },
      { icon: LuCalendarPlus, label: "Leave", path: "/employee/leave" },
      { icon: FaRegCalendarCheck, label: "Attendance", path: "/employee/attendance" },
      { icon: IoCalendarNumberOutline, label: "Calendar", path: "/employee/calendar" },
    ];
    if (departmentName === "Human Resource") {
      baseMenu.splice(1, 0,
      { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
      { icon: GoGoal, label: "Goals", path: "/goalsview" },
      );
    }
    if (departmentName === "Sales & Marketing") {
      baseMenu.push(
        { icon: GoOrganization, label: "Company", path: "/companies" },
        { icon: VscOrganization, label: "Contacts", path: "/contacts" }
      );
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