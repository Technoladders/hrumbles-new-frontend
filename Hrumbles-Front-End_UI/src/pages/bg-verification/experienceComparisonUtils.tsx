// src/pages/jobs/ai/cards/experienceComparisonUtils.tsx

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CareerExperience } from "@/lib/types";
import * as stringSimilarity from 'string-similarity';

export interface UanRecord {
    'Establishment Name'?: string;
    establishment_name?: string;
    Doj?: string;
    date_of_joining?: string;
    DateOfExitEpf?: string;
    date_of_exit?: string;
    [key: string]: any;
}

const companyAliases: { [key: string]: string[] } = {
    'tata consultancy services': ['tcs'],
    'infosys': ['infy'],
    'accenture': ['acn'],
    'wipro': ['wipro technologies'],
    'hcl technologies': ['hcl'],
};

// --- UPDATED to match your detailed rules ---
export const compareCompanyNames = (candidateName: string, uanName: string) => {
    const normalize = (str: string) => str
        .toLowerCase()
        .replace(/[.,]/g, '') // Remove periods and commas
        .replace(/\b(pvt|ltd|limited|private|inc)\b/g, '') // Remove legal terms as whole words
        .replace(/\s+/g, ' ') // Condense multiple spaces
        .trim();

    const cName = normalize(candidateName);
    const uName = normalize(uanName);

    if (cName === uName) return { status: 'Exact Match', score: 100 };

    for (const fullName in companyAliases) {
        if ((uName.includes(fullName) && companyAliases[fullName].includes(cName)) || 
            (cName.includes(fullName) && companyAliases[fullName].includes(uName))) {
            return { status: 'Exact Match (Alias)', score: 100 };
        }
    }

    const similarity = stringSimilarity.compareTwoStrings(cName, uName) * 100;
    
    // Updated threshold logic
    if (similarity > 90) return { status: 'High Similarity', score: similarity }; // Treat as a green match
    if (similarity >= 70) return { status: 'Partial Match (Company)', score: similarity }; // Yellow badge
    
    return { status: 'Mismatch', score: similarity }; // Red badge
};

// --- UPDATED to match your detailed rules ---
export const compareDurations = (candidateExp: CareerExperience, uanRecord: UanRecord) => {
    const u_start_str = uanRecord.Doj || uanRecord.date_of_joining;
    if (!candidateExp.start_date || !u_start_str) return { status: 'Unverifiable', reason: 'UAN start date is missing.' };

    const c_start = new Date(candidateExp.start_date);
    const u_start = new Date(u_start_str);
    
    const c_end_str = candidateExp.end_date;
    const u_end_str = uanRecord.DateOfExitEpf || uanRecord.date_of_exit;

    const c_end = c_end_str === 'Present' ? new Date() : new Date(c_end_str);
    const u_end = !u_end_str || u_end_str === 'NA' ? new Date() : new Date(u_end_str);

    const startDiffMonths = Math.abs((c_start.getFullYear() - u_start.getFullYear()) * 12 + (c_start.getMonth() - u_start.getMonth()));
    const endDiffMonths = Math.abs((c_end.getFullYear() - u_end.getFullYear()) * 12 + (c_end.getMonth() - u_end.getMonth()));
    const totalTenureDiff = Math.round(((c_end.getTime() - c_start.getTime()) - (u_end.getTime() - u_start.getTime())) / (1000 * 60 * 60 * 24 * 30.44));

    // Check for Mismatch (No Overlap) first
    if (c_end < u_start || c_start > u_end) {
        return { status: 'Mismatch', reason: 'No overlap in periods.' };
    }

    // Updated threshold logic
    if (startDiffMonths === 0 && endDiffMonths === 0) return { status: 'Exact Match', reason: 'Start and end dates align perfectly.' };
    if (startDiffMonths <= 3 && endDiffMonths <= 3) return { status: 'Partial Match (Duration)', reason: `Dates differ by ~${Math.max(startDiffMonths, endDiffMonths)} months.` };
    if (totalTenureDiff > 3) return { status: 'Extended Tenure', reason: `Candidate claimed ~${totalTenureDiff} months more than UAN record.` };
    if (totalTenureDiff < -3) return { status: 'Shorter Tenure', reason: `UAN record shows ~${-totalTenureDiff} months longer tenure.` };
    
    // Default fallback
    return { status: 'Partial Match (Duration)', reason: 'Durations have some overlap but differ.' };
};

// --- UPDATED with all new statuses and colors ---
export const StatusBadge = ({ status }: { status: string }) => {
    const styles: { [key: string]: string } = {
        'Exact Match': 'bg-green-100 text-green-800 border-green-200',
        'Exact Match (Alias)': 'bg-green-100 text-green-800 border-green-200',
        'High Similarity': 'bg-green-100 text-green-800 border-green-200',
        'Partial Match (Company)': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Partial Match (Duration)': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Extended Tenure': 'bg-orange-100 text-orange-800 border-orange-200',
        'Shorter Tenure': 'bg-orange-100 text-orange-800 border-orange-200',
        'Mismatch': 'bg-red-100 text-red-800 border-red-200',
        'Company Missing': 'bg-red-100 text-red-800 border-red-200',
        'Extra Company Found': 'bg-blue-100 text-blue-800 border-blue-200',
        'Unverifiable': 'bg-gray-100 text-gray-800 border-gray-200',
        'Pending Verification': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return <Badge variant="outline" className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
};