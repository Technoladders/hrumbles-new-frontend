import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyDetail as CompanyDetailType } from '@/types/company';
import { DollarSign, TrendingUp, Users, Puzzle, Lightbulb, ListChecks, Layers, Cpu } from 'lucide-react';

const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  }
  if (typeof value === 'string') return value; // Already formatted like "$200 billion"
  return "N/A";
};

const MetricCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">Based on available data</p>
        </CardContent>
    </Card>
);

const InfoCard: React.FC<{ title: string; data: any; icon: React.ElementType; renderItem?: (item: any, index: number) => React.ReactNode }> = ({ title, data, icon: Icon, renderItem }) => (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center text-base"><Icon className="h-4 w-4 mr-2 text-purple-600" />{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {data && Array.isArray(data) && data.length > 0 ? (
                <div className="flex flex-col space-y-2">
                    {data.map((item, index) => renderItem ? renderItem(item, index) : <Badge key={index} variant="secondary">{String(item)}</Badge>)}
                </div>
            ) : <p className="text-sm text-gray-500">No data available.</p>}
        </CardContent>
    </Card>
);

const CompanyFinancials: React.FC<{ company: CompanyDetailType }> = ({ company }) => {
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
          
            <InfoCard title="Leadership" data={leadership} icon={Users} renderItem={(person: any, index: number) => (
                <div key={index} className="text-sm">
                    <span className="font-medium text-gray-800">{person.name}</span>
                    <span className="text-gray-500"> - {person.title || person.position}</span>
                </div>
            )} />

            <InfoCard title="Services Offered" data={services} icon={ListChecks} renderItem={(item, index) => <Badge key={index} variant="outline" className="font-normal">{item}</Badge>} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoCard title="Known Competitors" data={competitors} icon={Puzzle} renderItem={(item, index) => <Badge key={index} variant="secondary">{item}</Badge>} />
                <InfoCard title="Subsidiaries" data={subsidiaries} icon={Layers} renderItem={(item: any, index: number) => (
                     <div key={index} className="text-sm font-medium">{item.name} <span className="text-xs text-gray-500 font-normal">({item.industry})</span></div>
                )} />
            </div>

            <InfoCard title="Technology Stack" data={techStack} icon={Cpu} renderItem={(stack: any, index: number) => (
                <div key={index} className="border-t pt-2 first:border-t-0 first:pt-0">
                    <p className="font-semibold text-sm mb-1">{stack.category}</p>
                    <div className="flex flex-wrap gap-1">
                        {stack.tools.map((tool: string, i: number) => <Badge key={i} variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">{tool}</Badge>)}
                    </div>
                </div>
            )} />
        </div>
    );
};

export default CompanyFinancials;