// src/components/EmployeeMenuWrapper.jsx
import { shouldShowCompanyAndContactMenu } from "../../utils/menuUtils";
import {
  MdDashboardCustomize,
  ImProfile,
  GoGoal,
  FiCheckSquare,
  FiBriefcase,
} from "react-icons/md";
import { GoOrganization, VscOrganization } from "react-icons/go";

// Static function to compute employee menu items
export const getEmployeeMenuItems = (employees, departments, roles, user_id) => {
  const baseEmployeeMenuItems = [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: GoGoal, label: "Goals", path: "/goalsview" },
    { icon: FiCheckSquare, label: "My Tasks", path: "#" },
  ];

  const showCompanyAndContact = shouldShowCompanyAndContactMenu(
    employees,
    departments,
    roles,
    user_id
  );
  if (showCompanyAndContact) {
    return [
      ...baseEmployeeMenuItems,
      { icon: GoOrganization, label: "Company", path: "/companies" },
      { icon: VscOrganization, label: "Contacts", path: "/contacts" },
    ];
  }
  return baseEmployeeMenuItems;
};