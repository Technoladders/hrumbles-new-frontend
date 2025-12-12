// src/components/global/OrganizationManagement/ManageVerificationPricingModal.tsx

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Coins, Pencil, FilePlus2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Standard Defaults to initialize if table is empty
const DEFAULT_PRICING_TEMPLATE = [
    { verification_type: 'mobile_to_uan', source: 'gridlines', price: 5, price_not_found: 1 },
    { verification_type: 'pan_to_uan', source: 'gridlines', price: 5, price_not_found: 1 },
    { verification_type: 'latest_employment_mobile', source: 'gridlines', price: 10, price_not_found: 2 },
    { verification_type: 'latest_employment_uan', source: 'gridlines', price: 10, price_not_found: 2 },
    { verification_type: 'latest_passbook_mobile', source: 'gridlines', price: 15, price_not_found: 3 },
    { verification_type: 'uan_full_history_gl', source: 'gridlines', price: 25, price_not_found: 5 },
    // Truthscreen Fallbacks
    { verification_type: 'mobile_to_uan', source: 'truthscreen', price: 8, price_not_found: 2 },
    { verification_type: 'pan_to_uan', source: 'truthscreen', price: 8, price_not_found: 2 },
    { verification_type: 'uan_full_history', source: 'truthscreen', price: 30, price_not_found: 5 },
];

export const ManageVerificationPricingModal = ({ isOpen, onClose, organizationId }: { isOpen: boolean; onClose: () => void; organizationId: string }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for editing a specific row
  const [editingItem, setEditingItem] = useState<{ id: string, price: string, price_not_found: string } | null>(null);

  // 1. Fetch Current Balance & Config
  const { data: orgData } = useQuery({
    queryKey: ['org-credit-manage', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('credit_balance, verification_check')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && isOpen
  });

  // 2. Fetch Pricing List
  const { data: pricingList, refetch: refetchPricing, isLoading: isPricingLoading } = useQuery({
    queryKey: ['manage-pricing', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_pricing')
        .select('*')
        .eq('organization_id', organizationId)
        .order('source', { ascending: true })
        .order('verification_type', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && isOpen
  });

  // --- HANDLER: Top Up Credits ---
  const handleTopUp = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    setIsProcessing(true);
    try {
        const topupAmount = Number(amount);
        
        // 1. Get current balance with lock
        const { data: currentOrg } = await supabase
            .from('hr_organizations')
            .select('credit_balance')
            .eq('id', organizationId)
            .single();
            
        const newBalance = (Number(currentOrg?.credit_balance) || 0) + topupAmount;

        // 2. Update Balance
        const { error: updateError } = await supabase
            .from('hr_organizations')
            .update({ credit_balance: newBalance })
            .eq('id', organizationId);
        if (updateError) throw updateError;

        // 3. Log Transaction
        await supabase.from('credit_transactions').insert({
            organization_id: organizationId,
            amount: topupAmount,
            transaction_type: 'topup',
            description: 'Manual credit top-up by Admin',
            balance_after: newBalance,
        });

        toast.success(`Added ${topupAmount} Credits. New Balance: ${newBalance}`);
        setAmount('');
        queryClient.invalidateQueries({ queryKey: ['org-credit-manage'] });
        queryClient.invalidateQueries({ queryKey: ['org-credit-balance'] });
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  // --- HANDLER: Initialize Custom Pricing ---
  const handleInitializeDefaults = async () => {
      setIsProcessing(true);
      try {
          const payload = DEFAULT_PRICING_TEMPLATE.map(item => ({
              ...item,
              organization_id: organizationId
          }));

          const { error } = await supabase
            .from('verification_pricing')
            .insert(payload);

          if (error) throw error;

          toast.success("Custom pricing initialized for this organization.");
          refetchPricing();
      } catch (e: any) {
          toast.error("Failed to initialize: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  // --- HANDLER: Save Edited Price ---
  const handleSavePrice = async (id: string) => {
      if (!editingItem) return;
      try {
          const { error } = await supabase
            .from('verification_pricing')
            .update({ 
                price: Number(editingItem.price),
                price_not_found: Number(editingItem.price_not_found)
            })
            .eq('id', id);
          
          if (error) throw error;
          
          toast.success("Pricing updated successfully");
          setEditingItem(null);
          refetchPricing();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Verification Credits & Pricing</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="credits" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="credits">Credit Management</TabsTrigger>
                <TabsTrigger value="pricing">Verification Pricing</TabsTrigger>
            </TabsList>

            {/* --- TAB 1: CREDITS --- */}
            <TabsContent value="credits" className="space-y-6 py-2">
                <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                    <div>
                        <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">Current Balance</p>
                        <h2 className="text-4xl font-bold text-indigo-900 mt-1">{orgData?.credit_balance} <span className="text-lg font-medium text-indigo-500">Credits</span></h2>
                    </div>
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <Coins className="h-8 w-8 text-indigo-500" />
                    </div>
                </div>

                <div className="space-y-4 border p-6 rounded-xl bg-white shadow-sm">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <PlusCircle size={20} className="text-green-600"/> Top-up Wallet
                    </h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Credits Amount</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g. 5000" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                            />
                        </div>
                        <Button onClick={handleTopUp} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
                            {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : 'Add Credits'}
                        </Button>
                    </div>
                </div>
            </TabsContent>

            {/* --- TAB 2: PRICING --- */}
            <TabsContent value="pricing" className="py-2">
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Verification Type</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead className="w-[120px]">Success Price</TableHead>
                                <TableHead className="w-[120px]">Not Found Price</TableHead>
                                <TableHead className="w-[80px] text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPricingLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                    </TableCell>
                                </TableRow>
                            ) : pricingList && pricingList.length > 0 ? (
                                pricingList.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium text-gray-700">
                                            {item.verification_type.replace(/_/g, ' ')}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.source === 'gridlines' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                {item.source}
                                            </span>
                                        </TableCell>
                                        
                                        {/* EDIT MODE */}
                                        {editingItem?.id === item.id ? (
                                            <>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 w-20 text-right"
                                                        value={editingItem.price}
                                                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 w-20 text-right"
                                                        value={editingItem.price_not_found}
                                                        onChange={(e) => setEditingItem({ ...editingItem, price_not_found: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" variant="ghost" onClick={() => handleSavePrice(item.id)}>
                                                            <Save size={16} />
                                                        </Button>
                                                        <Button size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" variant="ghost" onClick={() => setEditingItem(null)}>
                                                            <X size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        ) : (
                                        /* VIEW MODE */
                                            <>
                                                <TableCell className="font-mono text-gray-600">
                                                    {item.price}
                                                </TableCell>
                                                <TableCell className="font-mono text-gray-500">
                                                    {item.price_not_found ?? 0}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                                                        onClick={() => setEditingItem({ 
                                                            id: item.id, 
                                                            price: String(item.price),
                                                            price_not_found: String(item.price_not_found ?? 0)
                                                        })}
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                /* EMPTY STATE */
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <p className="text-gray-500 text-sm">No custom pricing set for this organization. Currently using global defaults (hidden).</p>
                                            <Button variant="outline" onClick={handleInitializeDefaults} disabled={isProcessing} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                {isProcessing ? <Loader2 className="animate-spin h-4 w-4"/> : <FilePlus2 size={16} />}
                                                Create Custom Pricing
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};