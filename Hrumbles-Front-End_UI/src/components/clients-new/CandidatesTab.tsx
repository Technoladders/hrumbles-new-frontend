// src/components/clients-new/CandidatesTab.tsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import supabase from '@/config/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, ArrowUpDown } from 'lucide-react';
import moment from 'moment';
import { Candidate, SortConfig } from './ClientTypes';
import HiddenContactCell from '@/components/ui/HiddenContactCell';
import { Skeleton } from '@/components/ui/skeleton';

const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const OFFER_ISSUED_SUB_STATUS_ID = "bcc84d3b-fb76-4912-86cc-e95448269d6b";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";
const JOINED_SUB_STATUS_ID = "c9716374-3477-4606-877a-dfa5704e7680";
const USD_TO_INR_RATE = 84;

interface CandidatesTabProps {
  candidates: Candidate[];
  loading: boolean;
  onUpdate: () => void;
}

const CandidatesTab: React.FC<CandidatesTabProps> = ({ candidates, loading, onUpdate }) => {
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<SortConfig<Candidate>>(null);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

    const parseSalary = (salaryStr?: string): number => {
        if (!salaryStr) return 0;
        const isUSD = salaryStr.startsWith('$');
        const parts = salaryStr.replace(/[$,₹]/g, "").trim().split(" ");
        let amount = parseFloat(parts[0]) || 0;
        const budgetType = parts[1]?.toLowerCase() || "lpa";
        if (isUSD) amount *= USD_TO_INR_RATE;
        if (budgetType === "monthly") amount *= 12;
        else if (budgetType === "hourly") amount *= 2016;
        return amount;
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
    const formatDate = (dateString?: string) => dateString ? moment(new Date(dateString)).format("DD MMM YYYY") : "-";
    const getStatusBadgeColor = (statusId?: string) => statusId === JOINED_SUB_STATUS_ID ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
    const getStatusText = (statusId?: string) => statusId === JOINED_SUB_STATUS_ID ? "Joined" : "Offer Issued";

     const handleStatusChange = async (candidateId: string, subStatusId: string) => {
        setStatusUpdateLoading(candidateId);
        try {
            await supabase.from("hr_job_candidates").update({ main_status_id: subStatusId === OFFER_ISSUED_SUB_STATUS_ID ? OFFERED_STATUS_ID : JOINED_STATUS_ID, sub_status_id: subStatusId }).eq("id", candidateId);
            toast({ title: "Status Updated" });
            onUpdate();
        } catch (error) {
            toast({ title: "Error updating status", variant: "destructive" });
        } finally {
            setStatusUpdateLoading(null);
        }
    };
  
    const handleSort = (key: keyof Candidate) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const sortedCandidates = useMemo(() => {
        let sortableItems = [...candidates];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [candidates, sortConfig]);

    if (loading) return <div className="mt-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
    
    return (
        <div className="mt-6">
            <div className="rounded-md border max-h-[600px] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name')}>Name <ArrowUpDown size={14}/></div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('job_title')}>Position <ArrowUpDown size={14}/></div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Experience</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Join</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary (LPA)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Profit (INR)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedCandidates.length > 0 ? sortedCandidates.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><Link to={`/candidates/${c.id}/${c.job_id}`} className="font-medium text-blue-600 hover:underline">{c.name}</Link></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><HiddenContactCell email={c.email} phone={c.phone} candidateId={c.id} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><Link to={`/jobs/${c.job_id}`} className="font-medium text-blue-600 hover:underline">{c.job_title}</Link></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm hidden lg:table-cell">{c.experience || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(c.joining_date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 px-2 py-0 w-28 justify-start">{statusUpdateLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Badge variant="outline" className={getStatusBadgeColor(c.sub_status_id)}>{getStatusText(c.sub_status_id)}</Badge>}</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleStatusChange(c.id, OFFER_ISSUED_SUB_STATUS_ID)}>Offer Issued</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(c.id, JOINED_SUB_STATUS_ID)}>Joined</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{c.ctc ? formatCurrency(parseSalary(c.ctc)) : "-"}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell ${c.profit && c.profit > 0 ? "text-green-600" : "text-red-600"}`}>{c.profit ? formatCurrency(c.profit) : "-"}</td>
                        </tr>
                        )) : (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-500">No candidates found for the selected period.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CandidatesTab;