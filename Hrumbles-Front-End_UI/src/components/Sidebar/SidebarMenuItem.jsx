import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoDiamondOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople} from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";


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
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  admin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee" },
    { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    // { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  employee: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: GoGoal, label: "Goals", path: "/goalview" },
    { icon: FiCheckSquare, label: "My Tasks", path: "#" },
  ],
};

// 🔹 Extra menu items (Logout has an action instead of a path)
const extraMenuItems = [
  { icon: IoDiamondOutline, label: "Try Premium", path: "#" },
  { icon: FiLogOut, label: "Logout", action: "logout" }, // 🚀 Add Logout Action
];

export { menuItemsByRole, extraMenuItems };
