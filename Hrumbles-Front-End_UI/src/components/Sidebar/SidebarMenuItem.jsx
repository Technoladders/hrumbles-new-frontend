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
// Removed unused imports and Link/useSelector

// --- START: New logic for organization_superadmin categorization ---

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
    }
];
// --- END: New logic ---


export const menuItemsByRole = {
  global_superadmin: [
    // ... remains the same
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: categorizedOrgSuperAdminMenu, // Use the new categorized structure
  admin: (departmentName) => {
    // ... remains the same
    const baseMenu = [
      { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
      { icon: FiUsers, label: "Employees", path: "/employee" },
      { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
      { icon: MdOutlineEmojiPeople, label: "Projects", path: "/projects" },
      { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
      { icon: GoGoal, label: "Goals", path: "/goals" },
      { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
      { icon: ImProfile, label: "My Profile", path: "/profile" },
      { icon: GrDocumentTime, label: "Time Sheet", path: "/employee/timesheet" },
      { icon: MdMoreTime, label: "Regularization", path: "/employee/regularization" },
      { icon: LuCalendarPlus, label: "Leave", path: "/employee/leave" },
      { icon: FaRegCalendarCheck, label: "Attendance", path: "/employee/attendance" },
      { icon: IoCalendarNumberOutline, label: "Calendar", path: "/employee/calendar" },
    ];
    if (departmentName === "Sales & Marketing") {
      baseMenu.splice(7, 0,
        { icon: GoOrganization, label: "Company", path: "/companies" },
        { icon: VscOrganization, label: "Contacts", path: "/contacts" }
      );
    }
    if (departmentName === "Human Resource") {
      baseMenu.splice(11, 0,
        {
          icon: FiSettings,
          label: "Settings",
          path: "#",
          dropdown: [
            { icon: FiSettings, label: "Leave Policies", path: "/admin/leave-policies" },
            { icon: IoCalendarNumberOutline, label: "Official Holidays", path: "/admin/holidays" },
          ],
        },
      )
    }
    return baseMenu;
  },
  employee: (departmentName) => {
    // ... remains the same
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
    return baseMenu;
  },
};

export const extraMenuItems = [
  { icon: FiLogOut, label: "Logout", action: "logout" },
];

// The SidebarMenu component is no longer needed here as NewSidebar handles rendering.
// You can remove it or keep it if it's used elsewhere.