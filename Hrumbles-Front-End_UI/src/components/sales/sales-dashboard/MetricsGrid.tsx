// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/MetricsGrid.tsx
import React from 'react';
import { 
  Users, 
  Building2, 
  UserPlus, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface MetricsGridProps {
  metrics?: {
    totalContacts: number;
    totalCompanies: number;
    newContacts: number;
    enrichedContacts: number;
    enrichmentRate: number;
    stageCounts: Record<string, number>;
  };
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Total Contacts',
      value: metrics?.totalContacts || 0,
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      href: '/contacts',
    },
    {
      title: 'Companies',
      value: metrics?.totalCompanies || 0,
      change: '+8%',
      changeType: 'positive' as const,
      icon: Building2,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      href: '/companies',
    },
    {
      title: 'New This Period',
      value: metrics?.newContacts || 0,
      change: '+23%',
      changeType: 'positive' as const,
      icon: UserPlus,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      href: '/contacts',
    },
    {
      title: 'Enrichment Rate',
      value: `${metrics?.enrichmentRate || 0}%`,
      subtitle: `${metrics?.enrichedContacts || 0} enriched`,
      icon: Sparkles,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      href: '/contacts',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          onClick={() => navigate(card.href)}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </span>
                {card.change && (
                  <span className={cn(
                    "text-xs font-medium flex items-center gap-0.5",
                    card.changeType === 'positive' ? "text-green-600" : "text-red-600"
                  )}>
                    {card.changeType === 'positive' ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {card.change}
                  </span>
                )}
              </div>
              {card.subtitle && (
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              )}
            </div>
            <div className={cn(
              "p-2.5 rounded-lg transition-colors",
              card.iconBg,
              "group-hover:scale-105 transition-transform"
            )}>
              <card.icon size={20} className={card.iconColor} />
            </div>
          </div>
          
          {/* Hover arrow */}
          <div className="mt-4 flex items-center text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
            <span>View details</span>
            <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ))}
    </div>
  );
};