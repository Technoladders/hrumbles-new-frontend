import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoDiamondOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts} from "react-icons/md";


const menuItemsByRole = {
  global_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employees" },
    { icon: FiBriefcase, label: "Clients", path: "/clients" },
    { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  admin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiCheckSquare, label: "Tasks", path: "/tasks" },
    { icon: FiBriefcase, label: "Clients", path: "/clients" },
  ],
  employee: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiCheckSquare, label: "My Tasks", path: "/tasks" },
  ],
};

// 🔹 Extra menu items (Logout has an action instead of a path)
const extraMenuItems = [
  { icon: IoDiamondOutline, label: "Try Premium", path: "#" },
  { icon: FiLogOut, label: "Logout", action: "logout" }, // 🚀 Add Logout Action
];

export { menuItemsByRole, extraMenuItems };
