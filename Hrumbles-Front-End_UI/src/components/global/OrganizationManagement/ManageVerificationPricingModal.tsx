// src/components/global/OrganizationManagement/ManageVerificationPricingModal.tsx
// ============================================================================
// CREDIT & PRICING MANAGEMENT MODAL
// 
// Tabs:
//   1. Credit Balance — view balance, add/deduct credits
//   2. Verification Pricing — EPFO/Gridlines per-org overrides
//   3. Enrichment Pricing — Apollo contact/company per-org overrides
//
// Data source: verification_pricing table (source='gridlines' vs source='apollo')
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins, Wallet, ArrowUpRight, ArrowDownRight, Save, RotateCcw,
  Shield, Sparkles, Mail, Phone, Building2, Search, Info, Loader2,
  Plus, Trash2
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ManageVerificationPricingModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PricingRow {
  id: string;
  verification_type: string;
  source: string;
  organization_id: string | null;
  price: number;
  price_not_found: number;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  verification_type: string | null;
  source: string | null;
  description: string | null;
  balance_after: number;
  created_at: string;
  created_by: string | null;
  reference_text: string | null;
}

// ── Display config for enrichment types ─────────────────────────────────────

const ENRICHMENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  contact_email_reveal: {
    label: 'Contact Email Reveal',
    icon: <Mail size={14} />,
    description: 'Reveal email addresses for a contact via Apollo',
    color: 'text-blue-600 bg-blue-50'
  },
  contact_phone_reveal: {
    label: 'Contact Phone Reveal',
    icon: <Phone size={14} />,
    description: 'Reveal phone numbers for a contact (async via webhook)',
    color: 'text-green-600 bg-green-50'
  },
  company_enrich: {
    label: 'Company Enrichment',
    icon: <Building2 size={14} />,
    description: 'Enrich company data by domain or Apollo org ID',
    color: 'text-purple-600 bg-purple-50'
  },
  company_search: {
    label: 'Company Search (per page)',
    icon: <Search size={14} />,
    description: 'Search companies — charged per search results page',
    color: 'text-orange-600 bg-orange-50'
  }
};

const VERIFICATION_TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  epfo_uan_basic: { label: 'EPFO UAN Basic', description: 'Basic UAN verification' },
  epfo_uan_advance: { label: 'EPFO UAN Advance', description: 'Advanced UAN verification' },
  epfo_uan_employment_details: { label: 'EPFO Employment Details', description: 'Detailed employment history' },
  epfo_uan_service_details: { label: 'EPFO Service Details', description: 'Service-wise history lookup' },
  epfo_uan_passbook: { label: 'EPFO Passbook', description: 'Full passbook data' },
  epfo_uan_lookup: { label: 'EPFO UAN Lookup', description: 'UAN number lookup' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val: number) => `₹${val.toFixed(2)}`;

// ── Component ────────────────────────────────────────────────────────────────

export const ManageVerificationPricingModal: React.FC<ManageVerificationPricingModalProps> = ({
  organizationId,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);

  const [activeTab, setActiveTab] = useState('balance');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────

  // Credit balance
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org-credit-balance', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('id, name, credit_balance')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!organizationId
  });

  // Recent transactions
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['org-credit-transactions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: isOpen && !!organizationId
  });

  // All pricing rows (global + org-specific)
  const { data: allPricing = [], isLoading: pricingLoading } = useQuery({
    queryKey: ['verification-pricing-all', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_pricing')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .order('verification_type', { ascending: true });
      if (error) throw error;
      return data as PricingRow[];
    },
    enabled: isOpen && !!organizationId
  });

  // ── Derived data ─────────────────────────────────────────────────────────

  const { verificationPricing, enrichmentPricing } = useMemo(() => {
    const verification: PricingRow[] = [];
    const enrichment: PricingRow[] = [];

    allPricing.forEach(row => {
      if (row.source === 'apollo') {
        enrichment.push(row);
      } else {
        verification.push(row);
      }
    });

    return { verificationPricing: verification, enrichmentPricing: enrichment };
  }, [allPricing]);

  // Build effective pricing map: org override > global
  const getEffectivePricing = (rows: PricingRow[]) => {
    const map = new Map<string, { global: PricingRow | null; override: PricingRow | null }>();

    rows.forEach(row => {
      const key = `${row.verification_type}__${row.source}`;
      if (!map.has(key)) map.set(key, { global: null, override: null });
      const entry = map.get(key)!;

      if (row.organization_id === null) {
        entry.global = row;
      } else {
        entry.override = row;
      }
    });

    return map;
  };

  const enrichmentEffective = useMemo(() => getEffectivePricing(enrichmentPricing), [enrichmentPricing]);
  const verificationEffective = useMemo(() => getEffectivePricing(verificationPricing), [verificationPricing]);

  // ── Mutations ────────────────────────────────────────────────────────────

  // Add/deduct credits
  const creditMutation = useMutation({
    mutationFn: async ({ amount, description, type }: { amount: number; description: string; type: 'add' | 'deduct' }) => {
      const signedAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);
      const currentBalance = Number(orgData?.credit_balance) || 0;
      const newBalance = currentBalance + signedAmount;

      if (newBalance < 0) throw new Error('Cannot deduct more than current balance');

      // Update balance
      const { error: updateErr } = await supabase
        .from('hr_organizations')
        .update({ credit_balance: newBalance })
        .eq('id', organizationId);
      if (updateErr) throw updateErr;

      // Log transaction
      const { error: txErr } = await supabase
        .from('credit_transactions')
        .insert({
          organization_id: organizationId,
          amount: signedAmount,
          transaction_type: type === 'add' ? 'credit_addition' : 'credit_deduction',
          description: description || `Manual ${type} by admin`,
          balance_after: newBalance,
          created_by: user?.id
        });
      if (txErr) throw txErr;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Credits Updated', description: `Successfully ${vars.type === 'add' ? 'added' : 'deducted'} ${vars.amount} credits.` });
      setCreditAmount('');
      setCreditDescription('');
      queryClient.invalidateQueries({ queryKey: ['org-credit-balance', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-credit-transactions', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationDashboardDetails', organizationId] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  });

  // Update pricing
  const pricingMutation = useMutation({
    mutationFn: async ({ id, price, price_not_found }: { id: string; price: number; price_not_found: number }) => {
      const { error } = await supabase
        .from('verification_pricing')
        .update({ price, price_not_found, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Pricing Updated' });
      queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  });

  // Create org-specific override
  const createOverrideMutation = useMutation({
    mutationFn: async ({ verification_type, source, price, price_not_found }: {
      verification_type: string; source: string; price: number; price_not_found: number;
    }) => {
      const { error } = await supabase
        .from('verification_pricing')
        .insert({
          id: crypto.randomUUID(),
          verification_type,
          source,
          organization_id: organizationId,
          price,
          price_not_found,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Override Created', description: 'Org-specific pricing set.' });
      queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  });

  // Delete org-specific override
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('verification_pricing')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Override Removed', description: 'Reverted to global default.' });
      queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  });

  // ── Sub-components ───────────────────────────────────────────────────────

  const PricingCard = ({ 
    typeKey, source, config, globalRow, overrideRow 
  }: { 
    typeKey: string; 
    source: string; 
    config: { label: string; icon?: React.ReactNode; description: string; color?: string }; 
    globalRow: PricingRow | null; 
    overrideRow: PricingRow | null; 
  }) => {
    const [editPrice, setEditPrice] = useState('');
    const [editPriceNotFound, setEditPriceNotFound] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const effective = overrideRow || globalRow;
    const hasOverride = !!overrideRow;

    const handleStartEdit = () => {
      setEditPrice(String(effective?.price ?? 0));
      setEditPriceNotFound(String(effective?.price_not_found ?? 0));
      setIsEditing(true);
    };

    const handleSave = () => {
      const newPrice = parseFloat(editPrice) || 0;
      const newPriceNotFound = parseFloat(editPriceNotFound) || 0;

      if (hasOverride) {
        // Update existing override
        pricingMutation.mutate({ id: overrideRow!.id, price: newPrice, price_not_found: newPriceNotFound });
      } else {
        // Create new org-specific override
        createOverrideMutation.mutate({
          verification_type: typeKey,
          source,
          price: newPrice,
          price_not_found: newPriceNotFound
        });
      }
      setIsEditing(false);
    };

    const handleRemoveOverride = () => {
      if (overrideRow) {
        deleteOverrideMutation.mutate(overrideRow.id);
      }
    };

    return (
      <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {config.icon && (
              <div className={`p-2 rounded-lg ${config.color || 'text-gray-600 bg-gray-50'} flex-shrink-0`}>
                {config.icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{config.label}</p>
                {hasOverride && (
                  <Badge className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                    ORG OVERRIDE
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-gray-500 uppercase">Success Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-gray-500 uppercase">Not Found Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPriceNotFound}
                  onChange={(e) => setEditPriceNotFound(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
                <Save size={12} className="mr-1" /> {hasOverride ? 'Update' : 'Set Override'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase">Success</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(effective?.price ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase">Not Found</p>
                <p className="text-lg font-bold text-gray-500">{formatCurrency(effective?.price_not_found ?? 0)}</p>
              </div>
              {hasOverride && globalRow && (
                <div className="ml-2 pl-4 border-l border-gray-200">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Global Default</p>
                  <p className="text-sm text-gray-400">{formatCurrency(globalRow.price)}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={handleStartEdit} className="h-7 text-xs">
                {hasOverride ? 'Edit' : 'Override'}
              </Button>
              {hasOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveOverride}
                  className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={11} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Credit & Pricing Management
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Manage credit balance and per-service pricing for this organization.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-3">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg h-auto">
              <TabsTrigger
                value="balance"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5"
              >
                <Wallet size={13} />
                Balance
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5"
              >
                <Shield size={13} />
                Verification
              </TabsTrigger>
              <TabsTrigger
                value="enrichment"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5"
              >
                <Sparkles size={13} />
                Enrichment
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-160px)] px-6 pb-6">

            {/* ── TAB 1: CREDIT BALANCE ───────────────────────────────── */}
            <TabsContent value="balance" className="mt-4 space-y-4">
              {/* Balance Card */}
              <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</p>
                      {orgLoading ? (
                        <Skeleton className="h-10 w-32 mt-1" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {formatCurrency(Number(orgData?.credit_balance) || 0)}
                        </p>
                      )}
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                      <Coins className="h-7 w-7 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add/Deduct */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Adjust Credits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount..."
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Description (optional)</Label>
                    <Input
                      placeholder="Reason for adjustment..."
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={!creditAmount || parseFloat(creditAmount) <= 0 || creditMutation.isPending}
                      onClick={() => creditMutation.mutate({
                        amount: parseFloat(creditAmount),
                        description: creditDescription,
                        type: 'add'
                      })}
                    >
                      {creditMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ArrowUpRight size={14} className="mr-2" />}
                      Add Credits
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={!creditAmount || parseFloat(creditAmount) <= 0 || creditMutation.isPending}
                      onClick={() => creditMutation.mutate({
                        amount: parseFloat(creditAmount),
                        description: creditDescription,
                        type: 'deduct'
                      })}
                    >
                      {creditMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ArrowDownRight size={14} className="mr-2" />}
                      Deduct
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                  <CardDescription className="text-xs">Last 20 credit operations</CardDescription>
                </CardHeader>
                <CardContent>
                  {txLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-6">No transactions yet</p>
                  ) : (
                    <div className="space-y-1 max-h-[240px] overflow-y-auto">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-gray-800 truncate">
                                {tx.description || tx.transaction_type}
                              </p>
                              {tx.verification_type && (
                                <Badge variant="outline" className="text-[9px] font-normal">
                                  {tx.verification_type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(tx.created_at).toLocaleString()}
                              {tx.source ? ` · ${tx.source}` : ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Bal: {formatCurrency(tx.balance_after)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 2: VERIFICATION PRICING ─────────────────────────── */}
            <TabsContent value="verification" className="mt-4 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Set org-specific pricing to override global defaults. Remove an override to revert to the global price.
                </p>
              </div>

              {pricingLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
              ) : (
                Array.from(verificationEffective.entries()).map(([key, { global: globalRow, override: overrideRow }]) => {
                  const [type, source] = key.split('__');
                  const config = VERIFICATION_TYPE_CONFIG[type] || {
                    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    description: `${source} verification`
                  };

                  return (
                    <PricingCard
                      key={key}
                      typeKey={type}
                      source={source}
                      config={config}
                      globalRow={globalRow}
                      overrideRow={overrideRow}
                    />
                  );
                })
              )}

              {!pricingLoading && verificationEffective.size === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No verification pricing configured</p>
              )}
            </TabsContent>

            {/* ── TAB 3: ENRICHMENT PRICING (APOLLO) ──────────────────── */}
            <TabsContent value="enrichment" className="mt-4 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-100">
                <Sparkles size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-purple-700 font-medium">Apollo.io Enrichment Credits</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Credits are deducted when contacts or companies are enriched. Set org-specific overrides below, or leave defaults.
                  </p>
                </div>
              </div>

              {pricingLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
              ) : (
                // Show all 4 enrichment types, even if no row exists yet
                Object.entries(ENRICHMENT_TYPE_CONFIG).map(([typeKey, config]) => {
                  const key = `${typeKey}__apollo`;
                  const entry = enrichmentEffective.get(key);

                  return (
                    <PricingCard
                      key={key}
                      typeKey={typeKey}
                      source="apollo"
                      config={config}
                      globalRow={entry?.global || null}
                      overrideRow={entry?.override || null}
                    />
                  );
                })
              )}

              {/* Summary table */}
              {!pricingLoading && (
                <Card className="border-gray-200 mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Effective Rates Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 font-medium text-gray-500">Service</th>
                          <th className="text-right py-2 font-medium text-gray-500">Success</th>
                          <th className="text-right py-2 font-medium text-gray-500">Not Found</th>
                          <th className="text-right py-2 font-medium text-gray-500">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(ENRICHMENT_TYPE_CONFIG).map(([typeKey, config]) => {
                          const key = `${typeKey}__apollo`;
                          const entry = enrichmentEffective.get(key);
                          const effective = entry?.override || entry?.global;
                          const isOverride = !!entry?.override;

                          return (
                            <tr key={typeKey} className="border-b border-gray-50">
                              <td className="py-2 font-medium text-gray-700">{config.label}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">
                                {effective ? formatCurrency(effective.price) : '—'}
                              </td>
                              <td className="py-2 text-right text-gray-500">
                                {effective ? formatCurrency(effective.price_not_found) : '—'}
                              </td>
                              <td className="py-2 text-right">
                                <Badge variant="outline" className={`text-[9px] ${isOverride ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>
                                  {isOverride ? 'Override' : 'Global'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageVerificationPricingModal;