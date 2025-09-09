import React from 'react';
import { CompanyDetail as CompanyDetailType } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, Users, Globe, Linkedin, MapPin, Briefcase } from 'lucide-react';

const DetailRow: React.FC<{ icon: React.ElementType, label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start py-2.5">
        <Icon className="h-4 w-4 mt-1 mr-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1">
            <span className="text-sm text-gray-500">{label}</span>
            <div className="text-sm font-medium text-gray-800 break-words">{value || 'N/A'}</div>
        </div>
    </div>
);

const CompanyPrimaryDetails: React.FC<{ company: CompanyDetailType }> = ({ company }) => {
    // Helper function to get data with fallback from company_data JSONB to root-level columns
    const get = (jsonKey: (c: any) => any, rootKey: keyof CompanyDetailType) => {
        try {
            const jsonValue = jsonKey(company.company_data);
            if (jsonValue !== undefined && jsonValue !== null && jsonValue !== '') return jsonValue;
        } catch (e) { /* Ignore errors if company_data is null */ }
        return company[rootKey];
    };

    const aboutText = get(c => c.about, 'about');
    const industryText = get(c => c.industry, 'industry');
    const foundedYear = get(c => c.founded_year, 'start_date');
    const employeeCount = get(c => c.employee_range, 'employee_count');
    const hqAddress = get(c => c.headquarters?.address, 'address') || company.location;
    const websiteUrl = get(c => c.website, 'website');
    const linkedinUrl = get(c => c.socials?.linkedin, 'linkedin');

    return (
        <Card className="sticky top-[150px]">
            <CardHeader>
                <CardTitle className="flex items-center text-lg"><Briefcase className="h-5 w-5 mr-2 text-purple-600"/> About Company</CardTitle>
            </CardHeader>
            <CardContent>
                {aboutText && (
                    <div className="pb-4 border-b">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{aboutText}</p>
                    </div>
                )}
                
                <div className="pt-4 divide-y">
                    <DetailRow icon={Building2} label="Industry" value={industryText} />
                    <DetailRow icon={Calendar} label="Founded" value={foundedYear} />
                    <DetailRow icon={Users} label="Company Size" value={employeeCount?.toLocaleString() ?? 'N/A'} />
                    <DetailRow icon={MapPin} label="Headquarters" value={hqAddress} />
                    <DetailRow 
                        icon={Globe} 
                        label="Website" 
                        value={websiteUrl ? <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{websiteUrl}</a> : 'N/A'} 
                    />
                    <DetailRow 
                        icon={Linkedin} 
                        label="LinkedIn" 
                        value={linkedinUrl ? <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">View Profile</a> : 'N/A'}
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default CompanyPrimaryDetails;