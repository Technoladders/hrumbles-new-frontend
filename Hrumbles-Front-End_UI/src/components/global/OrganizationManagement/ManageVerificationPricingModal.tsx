// src/components/global/OrganizationManagement/ManageVerificationPricingModal.tsx

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Coins, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const ManageVerificationPricingModal = ({ isOpen, onClose, organizationId }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{ id: string, price: string } | null>(null);

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
  const { data: pricingList, refetch: refetchPricing } = useQuery({
    queryKey: ['manage-pricing', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_pricing')
        .select('*')
        .eq('organization_id', organizationId)
        .order('source', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && isOpen
  });

  // Handle Credit Top-up
  const handleTopUp = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    setIsProcessing(true);
    try {
        const topupAmount = Number(amount);
        
        // 1. Get current balance with lock (simplified here)
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
        const { error: logError } = await supabase
            .from('credit_transactions')
            .insert({
                organization_id: organizationId,
                amount: topupAmount,
                transaction_type: 'topup',
                description: 'Manual credit top-up by Admin',
                balance_after: newBalance,
                // created_by: 'ADMIN_USER_ID' // Ideally pass current admin user ID here
            });
        
        if (logError) console.error("Log error", logError);

        toast.success(`Added ₹${topupAmount}. New Balance: ₹${newBalance}`);
        setAmount('');
        queryClient.invalidateQueries(['org-credit-manage', organizationId]);
        queryClient.invalidateQueries(['org-credit-balance', organizationId]); // Updates header
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  // Handle Price Edit
  const handleSavePrice = async (id: string) => {
      if (!editingPrice || !editingPrice.price) return;
      try {
          const { error } = await supabase
            .from('verification_pricing')
            .update({ price: Number(editingPrice.price) })
            .eq('id', id);
          
          if (error) throw error;
          
          toast.success("Price updated");
          setEditingPrice(null);
          refetchPricing();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Verification Credits & Pricing</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="credits" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="credits">Credit Management</TabsTrigger>
                <TabsTrigger value="pricing">Verification Pricing</TabsTrigger>
            </TabsList>

            {/* --- TAB 1: CREDITS --- */}
            <TabsContent value="credits" className="space-y-6 py-4">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div>
                        <p className="text-sm font-medium text-indigo-600">Current Balance</p>
                        <h2 className="text-3xl font-bold text-indigo-900">₹{orgData?.credit_balance}</h2>
                    </div>
                    <Coins className="h-10 w-10 text-indigo-300" />
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-white">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <PlusCircle size={18}/> Top-up Wallet
                    </h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g. 5000" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                            />
                        </div>
                        <Button onClick={handleTopUp} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : 'Add Credits'}
                        </Button>
                    </div>
                </div>
            </TabsContent>

            {/* --- TAB 2: PRICING --- */}
            <TabsContent value="pricing" className="py-4">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Provider (Source)</TableHead>
                                <TableHead className="w-[150px]">Price (₹)</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pricingList?.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.verification_type}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.source === 'gridlines' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.source}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {editingPrice?.id === item.id ? (
                                            <Input 
                                                type="number" 
                                                value={editingPrice.price} 
                                                onChange={(e) => setEditingPrice({ ...editingPrice, price: e.target.value })}
                                                className="h-8 w-24"
                                            />
                                        ) : (
                                            `₹${item.price}`
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingPrice?.id === item.id ? (
                                            <div className="flex gap-1">
                                                <Button size="sm" onClick={() => handleSavePrice(item.id)}>Save</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingPrice(null)}>X</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => setEditingPrice({ id: item.id, price: String(item.price) })}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pricingList?.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No custom pricing set. Using global defaults.</TableCell></TableRow>
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