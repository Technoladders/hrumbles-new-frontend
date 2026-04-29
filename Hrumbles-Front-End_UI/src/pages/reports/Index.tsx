// Hrumbles-Front-End_UI\src\pages\reports\Index.tsx
// Hybrid Flyout Sidebar:
//   onMouseEnter rail icon → flyout panel appears (preview)
//   onMouseLeave           → flyout disappears (with small delay to prevent flicker)
//   onClick rail icon      → flyout LOCKS open (persists until selection or outside click)
//   onSelect report        → report loads, flyout dismisses

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, Users, UserCheck, Clock, Contact, Building,
  BarChart2, Users2, Activity, TrendingUp, ShieldCheck,
  ChevronRight, LayoutDashboard, BarChart3,
  Briefcase, PieChart, LineChart,
} from 'lucide-react';
import { ReportType } from '@/types/reports';
import ClientWiseReport             from '@/components/reports/ClientWiseReport';
import IndividualReport             from '@/components/reports/IndividualReport';
import RecruiterReportPage          from '@/components/reports/RecruiterReportPage';
import TalentProfileReport          from '@/components/reports/TalentProfileReport';
import TalentTrendsReport           from '@/components/reports/TalentTrendsReport';
import VerificationReportPage       from '@/components/reports/VerificationReportPage';
import ConsolidatedStatusReport     from '@/components/reports/ConsolidatedStatusReport';
import ContactsReport               from '@/components/reports/ContactsReport';
import CompaniesReport              from '@/components/reports/CompaniesReport';
import ContactsTrendsReport         from '@/components/reports/ContactsTrendsReport';
import CompaniesTrendsReport        from '@/components/reports/CompaniesTrendsReport';
import AttendanceReportsPage        from '@/components/reports/attendance/AttendanceReportsPage';
import ContactStatusReport          from '@/components/reports/ContactsStatusReport';
import CompaniesStatusReport        from '@/components/reports/CompaniesStatusReport';
import UserActivityReportPage       from '@/components/reports/UserActivityReportPage';
import RecruiterActivityLogReport   from '@/components/reports/RecruiterActivityLogReport';
import DynamicRecruiterReportPage   from '@/components/reports/DynamicRecruiterReportPage';
import DynamicIndividualReport      from '@/components/reports/DynamicIndividualReport';
import DynamicClientWiseReport      from '@/components/reports/DynamicClientWiseReport';
import NewClientWiseReport          from '@/components/reports/NewClientWiseReport';
import NewIndividualReport          from '@/components/reports/NewIndividualReport';
import CallAnalyticsReport from "@/components/sales/activity-report/CallAnalyticsReport.tsx";
import ActivityLogReport from '@/components/reports/ActivityLogReport.tsx';
import { LoadingSpinner }           from '@/components/ui/loading-spinner';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITECH_ORGANIZATION_ID = [
  '1961d419-1272-4371-8dc7-63a4ec71be83',
  '4d57d118-d3a2-493c-8c3f-2cf1f3113fe9',
  '22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5',
];
const DYNAMIC_REPORT_ORG_ID = '0e4318d8-b1a5-4606-b311-c56d7eec47ce';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportDef {
  type: ReportType;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}
interface CategoryDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  reports: ReportDef[];
}

// ─── Categories ───────────────────────────────────────────────────────────────
const ALL_CATEGORIES: CategoryDef[] = [
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: Briefcase,
    color: '#7B43F1',
    bgLight: '#F5F3FF',
    reports: [
      { type: 'new_client',          label: 'Client Performance',    description: 'Dynamic status breakdown per client',  badge: 'v2',  badgeColor: '#7B43F1' },
      { type: 'new_individual',      label: 'Individual',            description: 'Per-recruiter dynamic status counts',  badge: 'v2',  badgeColor: '#7B43F1' },
      { type: 'recruiter',           label: 'Recruiter Performance', description: 'Detailed recruiter funnel & metrics' },
      { type: 'recruiter_activity',  label: 'Recruiter Activity',    description: 'Calls, emails & engagement log',       badge: 'NEW', badgeColor: '#059669' },
      { type: 'consolidated_status', label: 'Consolidated Status',   description: 'All candidates across all statuses' },
      { type: 'talent',              label: 'Talent Profile',        description: 'Profile status distributions' },
      { type: 'talent_trends',       label: 'Talent Trends',         description: 'Trends in talent data' },
      { type: 'verification',        label: 'Verification',          description: 'Verification status details' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    icon: LineChart,
    color: '#2563EB',
    bgLight: '#EFF6FF',
    reports: [
      { type: 'contact_activity',  label: 'Contact Activity',  description: 'Contact activity log' },
      { type:'contact_call_activity', label: 'Contact Call Activity', description: 'Contact Call activity' },
      { type: 'contacts',          label: 'Contacts',          description: 'Contact status overview' },
      { type: 'companies',         label: 'Companies',         description: 'Company status overview' },
      { type: 'contacts_trends',   label: 'Contacts Trends',   description: 'Trend analysis for contacts' },
      { type: 'companies_trends',  label: 'Companies Trends',  description: 'Trend analysis for companies' },
      { type: 'contact_status',    label: 'Contact Status',    description: 'Current contact statuses' },
      { type: 'companies_status',  label: 'Companies Status',  description: 'Current company statuses' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & People',
    icon: PieChart,
    color: '#059669',
    bgLight: '#ECFDF5',
    reports: [
      { type: 'attendance',    label: 'Attendance',    description: 'Daily attendance records & summaries' },
      // { type: 'user_activity', label: 'User Activity', description: 'Active, idle & session time tracking' },
    ],
  },
];

// ─── Render report ────────────────────────────────────────────────────────────
const renderReport = (type: ReportType, orgId: string) => {
  switch (type) {
    case 'new_client':          return <NewClientWiseReport />;
    case 'new_individual':      return <NewIndividualReport />;
    case 'client':              return orgId === DYNAMIC_REPORT_ORG_ID ? <DynamicClientWiseReport /> : <ClientWiseReport />;
    case 'individual':          return orgId === DYNAMIC_REPORT_ORG_ID ? <DynamicIndividualReport /> : <IndividualReport />;
    case 'recruiter':           return orgId === DYNAMIC_REPORT_ORG_ID ? <DynamicRecruiterReportPage /> : <RecruiterReportPage />;
    case 'talent':              return <TalentProfileReport />;
    case 'talent_trends':       return <TalentTrendsReport />;
    case 'verification':        return <VerificationReportPage />;
    case 'consolidated_status': return <ConsolidatedStatusReport />;
    case 'user_activity':       return <UserActivityReportPage />;
    case 'contact_activity':    return <ActivityLogReport />;
    case 'contact_call_activity': return <CallAnalyticsReport />;
    case 'contacts':            return <ContactsReport />;
    case 'companies':           return <CompaniesReport />;
    case 'contacts_trends':     return <ContactsTrendsReport />;
    case 'companies_trends':    return <CompaniesTrendsReport />;
    case 'attendance':          return <AttendanceReportsPage />;
    case 'contact_status':      return <ContactStatusReport />;
    case 'companies_status':    return <CompaniesStatusReport />;
    case 'recruiter_activity':  return <RecruiterActivityLogReport />;
    default:                    return null;
  }
};

// ─── Flyout Panel ─────────────────────────────────────────────────────────────
const FlyoutPanel: React.FC<{
  category: CategoryDef;
  activeType: ReportType | null;
  onSelect: (t: ReportType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ category, activeType, onSelect, onMouseEnter, onMouseLeave }) => (
  <div
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      position: 'absolute',
      left: '100%',
      top: 0,
      marginLeft: 6,
      width: 224,
      background: '#fff',
      borderRadius: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #EDE9FD',
      overflow: 'hidden',
      zIndex: 999,
      // Animate in
      animation: 'flyoutIn 0.15s ease-out',
    }}
  >
    <style>{`
      @keyframes flyoutIn {
        from { opacity: 0; transform: translateX(-6px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>

    {/* Header */}
    <div style={{ background: category.bgLight, padding: '12px 14px 10px', borderBottom: '1px solid #EDE9FD' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${category.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <category.icon size={15} style={{ color: category.color }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: category.color, lineHeight: 1 }}>{category.label}</div>
          <div style={{ fontSize: 10, color: `${category.color}80`, lineHeight: 1, marginTop: 3 }}>
            {category.reports.length} reports available
          </div>
        </div>
      </div>
    </div>

    {/* Report list */}
    <div style={{ padding: '6px 0' }}>
      {category.reports.map(report => {
        const isActive = activeType === report.type;
        return (
          <button
            key={report.type}
            onClick={() => onSelect(report.type)}
            style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
              background: isActive ? `${category.color}0f` : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = `${category.color}08`; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {/* Dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
              background: isActive ? category.color : '#CBD5E1',
              transition: 'background 0.15s',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isActive ? category.color : '#1E293B',
                  lineHeight: 1.2,
                }}>
                  {report.label}
                </span>
                {report.badge && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                    background: `${report.badgeColor ?? category.color}18`,
                    color: report.badgeColor ?? category.color,
                    lineHeight: 1,
                  }}>
                    {report.badge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3, lineHeight: 1.3 }}>
                {report.description}
              </div>
            </div>
            {isActive && <ChevronRight size={11} style={{ color: category.color, flexShrink: 0, marginTop: 4 }} />}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Rail Icon Item ───────────────────────────────────────────────────────────
const RailIcon: React.FC<{
  category: CategoryDef;
  isOpen: boolean;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}> = ({ category, isOpen, isActive, onMouseEnter, onMouseLeave, onClick }) => {
  const highlighted = isOpen || isActive;
  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Active left bar */}
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 32, borderRadius: '0 3px 3px 0',
          background: category.color,
        }} />
      )}

      <button
        onClick={onClick}
        style={{
          width: '100%', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '10px 6px',
          background: highlighted ? `${category.color}12` : 'transparent',
          transition: 'background 0.15s',
        }}
        title={category.label}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: highlighted ? `${category.color}22` : '#F8FAFC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: highlighted ? `0 2px 8px ${category.color}28` : 'none',
          transition: 'all 0.15s',
        }}>
          <category.icon size={16} style={{ color: highlighted ? category.color : '#94A3B8' }} />
        </div>
        <span style={{
          fontSize: 9, fontWeight: 600, lineHeight: 1, textAlign: 'center',
          color: highlighted ? category.color : '#94A3B8',
          maxWidth: 52,
        }}>
          {/* First word only to keep label short */}
          {category.label.split(' ')[0]}
        </span>
        {isActive && (
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: category.color }} />
        )}
      </button>
    </div>
  );
};

// ─── Welcome screen ───────────────────────────────────────────────────────────
const WelcomeScreen: React.FC<{ categories: CategoryDef[]; onSelect: (t: ReportType) => void }> = ({ categories, onSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 360, padding: '0 40px', textAlign: 'center' }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <BarChart3 size={26} style={{ color: '#7B43F1' }} />
    </div>
    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Reports & Analytics</h2>
    <p style={{ fontSize: 11, color: '#94A3B8', maxWidth: 280, lineHeight: 1.6, marginBottom: 32 }}>
      Hover over a category icon in the sidebar to preview reports, or click to pin the menu open.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: '100%', maxWidth: 420 }}>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.reports[0].type)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
            padding: '14px 12px', borderRadius: 12,
            border: '1px solid #F1F5F9', background: '#FAFAFE',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${cat.color}40`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 12px ${cat.color}14`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#F1F5F9'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 8, background: cat.bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <cat.icon size={14} style={{ color: cat.color }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{cat.label}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{cat.reports.length} reports</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ReportIndex: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeType, setActiveType] = useState<ReportType | null>(
    () => searchParams.get('type') as ReportType | null
  );
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [lockedCatId,  setLockedCatId]  = useState<string | null>(null);

  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef    = useRef<HTMLDivElement>(null);

  const { organization_id: orgId, user, role } = useSelector((s: any) => s.auth);
  const { details: orgDetails } = useSelector((s: any) => s.firmOrganization);

  const [deptName,     setDeptName]     = useState<string | null>(null);
  const [deptLoading,  setDeptLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.id) { setDeptLoading(false); return; }
      try {
        const { data: emp } = await supabase.from('hr_employees').select('department_id').eq('id', user.id).single();
        const { data: dept } = emp?.department_id
          ? await supabase.from('hr_departments').select('name').eq('id', emp.department_id).single()
          : { data: null };
        setDeptName(dept?.name ?? null);
      } catch { setDeptName(null); }
      finally { setDeptLoading(false); }
    })();
  }, [user?.id]);

  useEffect(() => {
    setActiveType(searchParams.get('type') as ReportType | null);
  }, [searchParams]);

  // Close flyout on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) {
        setLockedCatId(null);
        setHoveredCatId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Org mode
  const showOnlyConsolidated =
    ITECH_ORGANIZATION_ID.includes(orgId) ||
    (role === 'employee' && deptName === 'Human Resource');

  const categories: CategoryDef[] = showOnlyConsolidated
    ? [{ ...ALL_CATEGORIES[0], reports: ALL_CATEGORIES[0].reports.filter(r => r.type === 'consolidated_status') }]
    : orgDetails?.is_recruitment_firm
    ? [{ ...ALL_CATEGORIES[0], reports: ALL_CATEGORIES[0].reports.filter(r => r.type !== 'client' && r.type !== 'individual') }, ALL_CATEGORIES[2]]
    : ALL_CATEGORIES;

  const activeCatId = categories.find(c => c.reports.some(r => r.type === activeType))?.id ?? null;
  const flyoutCatId = lockedCatId ?? hoveredCatId;
  const flyoutCat   = flyoutCatId ? categories.find(c => c.id === flyoutCatId) ?? null : null;

  // Hover handlers with debounce
  const onRailEnter = (catId: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredCatId(catId);
  };
  const onRailLeave = () => {
    leaveTimer.current = setTimeout(() => setHoveredCatId(null), 120);
  };
  const onFlyoutEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  };
  const onFlyoutLeave = () => {
    leaveTimer.current = setTimeout(() => setHoveredCatId(null), 100);
  };
  const onRailClick = (catId: string) => {
    setLockedCatId(prev => prev === catId ? null : catId);
  };
  const onSelectReport = (type: ReportType) => {
    setActiveType(type);
    setSearchParams({ type });
    setLockedCatId(null);
    setHoveredCatId(null);
  };

  const activeMeta = (() => {
    for (const cat of categories) {
      const r = cat.reports.find(r => r.type === activeType);
      if (r) return { ...r, catColor: cat.color, catLabel: cat.label, catBg: cat.bgLight };
    }
    return null;
  })();

  if (deptLoading) return <div style={{ display: 'flex', height: 256, alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size={32} /></div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', background: '#F8FAFC', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════
          ICON RAIL
      ══════════════════════════════════════ */}
      <div
        ref={railRef}
        style={{
          flexShrink: 0, width: 68,
          background: '#fff',
          borderRight: '1px solid #F1F5F9',
          boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', zIndex: 40,
          overflow: 'visible',
        }}
      >
        {/* Top logo mark */}
        <div style={{ padding: '14px 0 12px', width: '100%', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#7B43F1,#9B6FF7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px #7B43F130',
          }}>
            <BarChart3 size={16} color="#fff" />
          </div>
        </div>

        {/* Category icons */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', paddingTop: 8, gap: 2 }}>
          {categories.map(cat => (
            <RailIcon
              key={cat.id}
              category={cat}
              isOpen={flyoutCatId === cat.id}
              isActive={activeCatId === cat.id}
              onMouseEnter={() => onRailEnter(cat.id)}
              onMouseLeave={onRailLeave}
              onClick={() => onRailClick(cat.id)}
            />
          ))}
        </div>

        {/* Flyout panel — absolutely positioned beside the rail */}
        {flyoutCat && (
          <FlyoutPanel
            category={flyoutCat}
            activeType={activeType}
            onSelect={onSelectReport}
            onMouseEnter={onFlyoutEnter}
            onMouseLeave={onFlyoutLeave}
          />
        )}
      </div>

      {/* ══════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 20px', background: '#fff',
          borderBottom: '1px solid #F1F5F9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {activeMeta ? (
            <>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: activeMeta.catBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart3 size={13} style={{ color: activeMeta.catColor }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>{activeMeta.label}</div>
                <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1, marginTop: 3 }}>{activeMeta.description}</div>
              </div>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>
                <span>Reports</span>
                <ChevronRight size={9} />
                <span style={{ color: activeMeta.catColor, fontWeight: 600 }}>{activeMeta.catLabel}</span>
                <ChevronRight size={9} />
                <span style={{ color: '#475569', fontWeight: 600 }}>{activeMeta.label}</span>
              </div>
            </>
          ) : (
            <>
              <LayoutDashboard size={13} style={{ color: '#94A3B8' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Reports</span>
            </>
          )}
        </div>

        {/* Report or welcome */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeType
            ? <div style={{ height: '100%' }}>{renderReport(activeType, orgId)}</div>
            : <WelcomeScreen categories={categories} onSelect={onSelectReport} />
          }
        </div>
      </div>
    </div>
  );
};

export default ReportIndex;