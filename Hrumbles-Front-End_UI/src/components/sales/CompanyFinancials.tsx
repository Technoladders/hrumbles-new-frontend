import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyDetail as CompanyDetailType } from '@/types/company';
import { DollarSign, TrendingUp, Users, Puzzle, ListChecks, Layers, Cpu, ExternalLink } from 'lucide-react';

// Helper function remains unchanged
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  }
  if (typeof value === 'string') return value;
  return "N/A";
};

// Refactored MetricCard for better visual impact
const MetricCard: React.FC<{ title: string; value: string; icon: React.ElementType, link?: string }> = ({ title, value, icon: Icon, link }) => (
    <Card className="shadow-sm rounded-xl border border-gray-200/80">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex justify-between items-center">
                {title}
                {link && <a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-gray-400 hover:text-purple-600"/></a>}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400 mt-1">Based on available data</p>
        </CardContent>
    </Card>
);

// Refactored InfoCard with styled header
const InfoCard: React.FC<{ title: string; data: any; icon: React.ElementType; children?: React.ReactNode }> = ({ title, data, icon: Icon, children }) => (
     <Card className="shadow-sm rounded-xl border border-gray-200/80">
        <CardHeader>
            <CardTitle className="flex items-center text-md font-bold text-gray-700">
                <Icon className="h-5 w-5 mr-3 text-purple-500" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            {children ? children : (
                (data && Array.isArray(data) && data.length > 0) ? (
                    <div className="flex flex-wrap gap-2">
                        {data.map((item, index) => <Badge key={index} variant="secondary" className="text-sm font-medium">{String(item)}</Badge>)}
                    </div>
                ) : <p className="text-sm text-gray-500">No data available.</p>
            )}
        </CardContent>
    </Card>
);

const CompanyFinancials: React.FC<{ company: CompanyDetailType }> = ({ company }) => {
    // Helper function remains unchanged
    const get = (jsonKey: (c: any) => any, rootKey: keyof CompanyDetailType) => {
        try {
            const jsonValue = jsonKey(company.company_data);
            if (jsonValue !== undefined && jsonValue !== null && jsonValue.length !== 0) return jsonValue;
        } catch (e) {}
        return company[rootKey];
    };

    const revenue = get(c => c.financials?.annual_revenue || c.revenue_estimate, 'revenue');
    const leadership = get(c => c.leadership, 'key_people');
    const competitors = get(c => c.competitors, 'competitors');
    const services = get(c => c.services, 'services');
    const subsidiaries = get(c => c.subsidiaries, undefined);
    const techStack = get(c => c.technology_stack, undefined);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard title="Est. Annual Revenue" value={formatCurrency(revenue)} icon={DollarSign} />
                <MetricCard title="Est. Cash Flow" value={formatCurrency(company.cashflow)} icon={TrendingUp} />
            </div>
          
            <InfoCard title="Leadership" data={leadership} icon={Users}>
                {leadership && Array.isArray(leadership) && leadership.length > 0 ? (
                    <div className="space-y-3">
                        {leadership.map((person: any, index: number) => (
                            <div key={index} className="text-sm">
                                <p className="font-semibold text-gray-800">{person.name}</p>
                                <p className="text-gray-500">{person.title || person.position}</p>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-gray-500">No data available.</p>}
            </InfoCard>

            <InfoCard title="Services Offered" data={services} icon={ListChecks} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoCard title="Known Competitors" data={competitors} icon={Puzzle} />
                <InfoCard title="Subsidiaries" data={subsidiaries} icon={Layers}>
                    {subsidiaries && Array.isArray(subsidiaries) && subsidiaries.length > 0 ? (
                        <div className="space-y-2">
                             {subsidiaries.map((item: any, index: number) => (
                                <p key={index} className="text-sm font-semibold">{item.name} <span className="text-xs text-gray-500 font-normal">({item.industry})</span></p>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500">No data available.</p>}
                </InfoCard>
            </div>

            <InfoCard title="Technology Stack" data={techStack} icon={Cpu}>
                 {techStack && Array.isArray(techStack) && techStack.length > 0 ? (
                    <div className="space-y-4">
                        {techStack.map((stack: any, index: number) => (
                            <div key={index}>
                                <p className="font-semibold text-sm mb-2 text-gray-600">{stack.category}</p>
                                <div className="flex flex-wrap gap-2">
                                    {stack.tools.map((tool: string, i: number) => <Badge key={i} variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 font-medium">{tool}</Badge>)}
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : <p className="text-sm text-gray-500">No data available.</p>}
            </InfoCard>
        </div>
    );
};

export default CompanyFinancials;