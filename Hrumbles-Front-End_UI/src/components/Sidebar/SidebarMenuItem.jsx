import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoDiamondOutline, IoCalendarNumberOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople, MdOutlineAccountBalance, MdMoreTime } from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";
import { AiOutlineProfile } from "react-icons/ai";
import { FaFileInvoiceDollar, FaSackDollar, FaArrowsDownToPeople, FaRegCalendarCheck } from "react-icons/fa6";
import { TbDatabaseDollar, TbCheckbox } from "react-icons/tb";
import { GoOrganization } from "react-icons/go";
import { VscOrganization } from "react-icons/vsc";
import { GrDocumentTime } from "react-icons/gr";
import { LuCalendarPlus } from "react-icons/lu";
import { useSelector } from "react-redux";
import { BsShieldLock } from "react-icons/bs";
import { Link } from "react-router-dom";

const menuItemsByRole = {
  global_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: [
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
        // { icon: TbDatabaseDollar, label: "Overall", path: "/accounts/overall" },
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
  ],
  admin: (departmentName) => {
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
      // { icon: FiSettings, label: "Settings", path: "#" },
    ];

    // Add Company and Contacts if the user's department is Sales & Marketing
    if (departmentName === "Sales & Marketing") {
      baseMenu.splice(7, 0, // Insert after "My Profile" for consistency
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

    // Add Company and Contacts if the user's department is Sales & Marketing
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

const extraMenuItems = [
  // { icon: IoDiamondOutline, label: "Try Premium", path: "#" },
  { icon: FiLogOut, label: "Logout", action: "logout" },
];

// Function to get department name by ID
const getDepartmentName = (departments, departmentId) => {
  const dept = departments.find((d) => d.id === departmentId);
  return dept ? dept.name : "Unknown Department";
};

// Component or logic to render the menu
export const SidebarMenu = () => {
  const user = useSelector((state) => state.auth.user);
  const departments = useSelector((state) => state.departments.departments);
  const userRole = useSelector((state) => state.auth.role);

  // Get the user's department name
  const departmentName = user?.department_id
    ? getDepartmentName(departments, user.department_id)
    : "Unknown Department";

  // Get menu items based on role
  const menuItems =
    userRole === "employee" || userRole === "admin"
      ? menuItemsByRole[userRole](departmentName)
      : menuItemsByRole[userRole] || [];

  return (
    <div>
      {menuItems.map((item, index) => (
        <div key={index}>
          <Link to={item.path}>{item.label}</Link> {/* Use Link instead of <a> */}
          {item.dropdown && (
            <div>
              {item.dropdown.map((subItem, subIndex) => (
                <Link key={subIndex} to={subItem.path}>
                  {subItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      {extraMenuItems.map((item, index) => (
        <div key={index}>
          <Link
            to={item.path}
            onClick={item.action === "logout" ? () => console.log("Logout") : null}
          >
            {item.label}
          </Link>
        </div>
      ))}
    </div>
  );
};

export { menuItemsByRole, extraMenuItems };