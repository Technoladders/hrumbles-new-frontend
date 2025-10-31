import React from 'react';
import { CompanyDetail as CompanyDetailType } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, Users, Globe, Linkedin, MapPin, Briefcase } from 'lucide-react';

// A cleaner, reusable component for each detail row in the card
const DetailRow: React.FC<{ icon: React.ElementType, label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 mt-0.5 text-gray-400 flex-shrink-0" />
        <div className="ml-4 flex-1">
            <p className="text-xs text-gray-500">{label}</p>
            <div className="text-sm font-semibold text-gray-800 break-words">{value || 'N/A'}</div>
        </div>
    </div>
);

const CompanyPrimaryDetails: React.FC<{ company: CompanyDetailType }> = ({ company }) => {
    // This helper function remains unchanged to preserve all data-fetching logic
    const get = (jsonKey: (c: any) => any, rootKey: keyof CompanyDetailType) => {
        try {
            const jsonValue = jsonKey(company.company_data);
            if (jsonValue !== undefined && jsonValue !== null && jsonValue !== '') return jsonValue;
        } catch (e) { /* Ignore errors */ }
        return company[rootKey];
    };

    // Configuration array for all the details to display
    const details = [
        { icon: Building2, label: "Industry", value: get(c => c.industry, 'industry') },
        { icon: Calendar, label: "Founded", value: get(c => c.founded_year, 'start_date') },
        { icon: Users, label: "Company Size", value: get(c => c.employee_range, 'employee_count')?.toLocaleString() ?? 'N/A' },
        { icon: MapPin, label: "Headquarters", value: get(c => c.headquarters?.address, 'address') || company.location },
        { 
            icon: Globe, 
            label: "Website", 
            value: get(c => c.website, 'website') ? 
                <a href={get(c => c.website, 'website')} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{get(c => c.website, 'website')}</a> 
                : 'N/A' 
        },
        { 
            icon: Linkedin, 
            label: "LinkedIn", 
            value: get(c => c.socials?.linkedin, 'linkedin') ? 
                <a href={get(c => c.socials?.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">View Profile</a> 
                : 'N/A'
        },
    ];

    return (
        <Card className="shadow-sm rounded-xl border border-gray-200/80 sticky top-[150px]">
            <CardHeader>
                <CardTitle className="flex items-center text-md font-bold text-gray-700">
                    <Briefcase className="h-5 w-5 mr-3 text-purple-500" />
                    About Company
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-5">
                    {details.map((detail, index) => (
                        <DetailRow key={index} icon={detail.icon} label={detail.label} value={detail.value} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default CompanyPrimaryDetails;