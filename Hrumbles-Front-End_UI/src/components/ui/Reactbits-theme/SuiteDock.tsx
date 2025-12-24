import React from 'react';
import Dock from './Dock';
import {
  MdPeopleAlt,
  MdOutlineAccountBalance,
} from "react-icons/md";
import { CgOrganisation } from "react-icons/cg";
import { BsShieldCheck } from "react-icons/bs";
import { RiCustomerService2Fill } from "react-icons/ri";

// Suite configuration matching your menuData.js EXACTLY
const SUITE_CONFIG = {
  hiring: {
    id: "hiring",
    label: "Hiring Suite",
    icon: MdPeopleAlt, // Matches menuData.js
  },
  project: {
    id: "project",
    label: "Project Suite",
    icon: CgOrganisation, // Matches menuData.js
  },
  verification: {
    id: "verification",
    label: "Verification Suite",
    icon: BsShieldCheck, // Matches menuData.js
  },
  sales: {
    id: "sales",
    label: "Sales Suite",
    icon: RiCustomerService2Fill, // Matches menuData.js
  },
  finance: {
    id: "finance",
    label: "Finance Suite",
    icon: MdOutlineAccountBalance, // Matches menuData.js
  },
  hr: {
    id: "hr",
    label: "HR Suite",
    icon: MdPeopleAlt, // Matches menuData.js for admin
  },
};

export default function SuiteDock({
  activeSuite,
  onSuiteChange,
  availableSuites,
}) {
  // Convert availableSuites to dock items
  const dockItems = availableSuites
    .filter((suiteId) => SUITE_CONFIG[suiteId])
    .map((suiteId) => {
      const suite = SUITE_CONFIG[suiteId];
      const IconComponent = suite.icon;
      
      return {
        id: suite.id,
        label: suite.label,
        icon: <IconComponent size={20} />, // Convert to React element
        isActive: activeSuite === suite.id,
        onClick: () => onSuiteChange(suite.id),
      };
    });

  // Don't render if no items
  if (dockItems.length === 0) return null;

  return (
    <Dock
      items={dockItems}
      panelHeight={68}
      baseItemSize={40}
      magnification={80}
      distance={140}
    />
  );
}