'use client';

import React from 'react';
import Dock, { DockItemData } from './Dock';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Building2, 
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';

export type Suite = 'hiring' | 'project' | 'verification' | 'hr' | 'sales' | 'finance';

export interface SuiteDockProps {
  activeSuite: Suite;
  onSuiteChange: (suite: Suite) => void;
  availableSuites: Suite[];
  className?: string;
}

// Suite Configuration
const SUITE_CONFIG: Record<Suite, { icon: React.ReactNode; label: string; color: string }> = {
  hiring: {
    icon: <Users size={20} strokeWidth={2.5} />,
    label: 'Hiring Suite',
    color: '#7731E8'
  },
  project: {
    icon: <Briefcase size={20} strokeWidth={2.5} />,
    label: 'Project Suite',
    color: '#7731E8'
  },
  verification: {
    icon: <ShieldCheck size={20} strokeWidth={2.5} />,
    label: 'Verification Suite',
    color: '#7731E8'
  },
  hr: {
    icon: <Users size={20} strokeWidth={2.5} />,
    label: 'HR Suite',
    color: '#7731E8'
  },
  sales: {
    icon: <Building2 size={20} strokeWidth={2.5} />,
    label: 'Sales Suite',
    color: '#7731E8'
  },
  finance: {
    icon: <LayoutGrid size={20} strokeWidth={2.5} />,
    label: 'Finance Suite',
    color: '#7731E8'
  }
};

export default function SuiteDock({
  activeSuite,
  onSuiteChange,
  availableSuites,
  className = ''
}: SuiteDockProps) {
  // Build dock items from available suites
  const dockItems: DockItemData[] = availableSuites.map(suite => ({
    id: suite,
    icon: SUITE_CONFIG[suite].icon,
    label: SUITE_CONFIG[suite].label,
    onClick: () => onSuiteChange(suite),
    isActive: activeSuite === suite,
  }));

  // Don't render if no suites available
  if (dockItems.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <Dock 
        items={dockItems}
        panelHeight={64}
        baseItemSize={40}
        magnification={56}
        distance={140}
      />
    </div>
  );
}