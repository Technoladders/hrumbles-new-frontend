// src/components/global/OrganizationManagement/ManageVerificationPricingModal.tsx
// ============================================================================
// CREDIT & PRICING MANAGEMENT MODAL — v2 (ContactOut tab)
//
// Tabs:
//   1. Credit Balance    — view balance, add/deduct credits
//   2. Verification      — EPFO/Gridlines per-org overrides
//   3. Enrichment        — Apollo contact/company per-org overrides
//   4. ContactOut        — Search billing mode + Email/Phone reveal pricing
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
  Plus, Trash2, Users, FileSearch, CheckCircle2, AlertCircle,
  ToggleLeft, ToggleRight, Layers
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ManageVerificationPricingModalProps {
  organizationId: string;
  isOpen:         boolean;
  onClose:        () => void;
}

interface PricingRow {
  id:                string;
  verification_type: string;
  source:            string;
  organization_id:   string | null;
  price:             number;
  price_not_found:   number;
  billing_mode:      string;
  created_at:        string;
  updated_at:        string;
}

interface CreditTransaction {
  id:                string;
  amount:            number;
  transaction_type:  string;
  verification_type: string | null;
  source:            string | null;
  description:       string | null;
  balance_after:     number;
  created_at:        string;
  created_by:        string | null;
  reference_text:    string | null;
}

// ── Display configs ───────────────────────────────────────────────────────────

const ENRICHMENT_TYPE_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; description: string; color: string;
}> = {
  contact_email_reveal: {
    label:       'Contact Email Reveal',
    icon:        <Mail size={14} />,
    description: 'Reveal email addresses for a contact via Apollo',
    color:       'text-blue-600 bg-blue-50',
  },
  contact_phone_reveal: {
    label:       'Contact Phone Reveal',
    icon:        <Phone size={14} />,
    description: 'Reveal phone numbers for a contact (async via webhook)',
    color:       'text-green-600 bg-green-50',
  },
  company_enrich: {
    label:       'Company Enrichment',
    icon:        <Building2 size={14} />,
    description: 'Enrich company data by domain or Apollo org ID',
    color:       'text-purple-600 bg-purple-50',
  },
  company_search: {
    label:       'Company Search (per page)',
    icon:        <Search size={14} />,
    description: 'Search companies — charged per search results page',
    color:       'text-orange-600 bg-orange-50',
  },
};

const VERIFICATION_TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  epfo_uan_basic:             { label: 'EPFO UAN Basic',            description: 'Basic UAN verification' },
  epfo_uan_advance:           { label: 'EPFO UAN Advance',          description: 'Advanced UAN verification' },
  epfo_uan_employment_details:{ label: 'EPFO Employment Details',   description: 'Detailed employment history' },
  epfo_uan_service_details:   { label: 'EPFO Service Details',      description: 'Service-wise history lookup' },
  epfo_uan_passbook:          { label: 'EPFO Passbook',             description: 'Full passbook data' },
  epfo_uan_lookup:            { label: 'EPFO UAN Lookup',           description: 'UAN number lookup' },
};

// ContactOut specific configs
const CO_ENRICH_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; description: string; color: string;
}> = {
  co_email_reveal: {
    label:       'Email Reveal',
    icon:        <Mail size={14} />,
    description: 'Reveal email address(es) for a ContactOut profile',
    color:       'text-blue-600 bg-blue-50',
  },
  co_phone_reveal: {
    label:       'Phone Reveal',
    icon:        <Phone size={14} />,
    description: 'Reveal phone number(s) for a ContactOut profile',
    color:       'text-green-600 bg-green-50',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (val: number) => `₹${val.toFixed(2)}`;

// ── Shared PricingCard ────────────────────────────────────────────────────────

const PricingCard = ({
  typeKey, source, config, globalRow, overrideRow,
  pricingMutation, createOverrideMutation, deleteOverrideMutation, organizationId,
}: {
  typeKey:                string;
  source:                 string;
  config:                 { label: string; icon?: React.ReactNode; description: string; color?: string };
  globalRow:              PricingRow | null;
  overrideRow:            PricingRow | null;
  pricingMutation:        any;
  createOverrideMutation: any;
  deleteOverrideMutation: any;
  organizationId:         string;
}) => {
  const [editPrice,         setEditPrice]         = useState('');
  const [editPriceNotFound, setEditPriceNotFound] = useState('');
  const [isEditing,         setIsEditing]         = useState(false);

  const effective  = overrideRow || globalRow;
  const hasOverride = !!overrideRow;

  const handleStartEdit = () => {
    setEditPrice(String(effective?.price ?? 0));
    setEditPriceNotFound(String(effective?.price_not_found ?? 0));
    setIsEditing(true);
  };

  const handleSave = () => {
    const newPrice         = parseFloat(editPrice)         || 0;
    const newPriceNotFound = parseFloat(editPriceNotFound) || 0;
    if (hasOverride) {
      pricingMutation.mutate({ id: overrideRow!.id, price: newPrice, price_not_found: newPriceNotFound });
    } else {
      createOverrideMutation.mutate({ verification_type: typeKey, source, price: newPrice, price_not_found: newPriceNotFound });
    }
    setIsEditing(false);
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
                <Badge className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">ORG OVERRIDE</Badge>
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
              <Input type="number" step="0.01" min="0" value={editPrice}
                onChange={e => setEditPrice(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-gray-500 uppercase">Not Found Price</Label>
              <Input type="number" step="0.01" min="0" value={editPriceNotFound}
                onChange={e => setEditPriceNotFound(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
              <Save size={12} className="mr-1" />{hasOverride ? 'Update' : 'Set Override'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-xs">Cancel</Button>
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
              <Button size="sm" variant="outline" onClick={() => deleteOverrideMutation.mutate(overrideRow!.id)}
                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={11} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const ManageVerificationPricingModal: React.FC<ManageVerificationPricingModalProps> = ({
  organizationId, isOpen, onClose,
}) => {
  const { toast }      = useToast();
  const queryClient    = useQueryClient();
  const user           = useSelector((state: any) => state.auth.user);

  const [activeTab,           setActiveTab]           = useState('balance');
  const [creditAmount,        setCreditAmount]        = useState('');
  const [creditDescription,   setCreditDescription]   = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org-credit-balance', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations').select('id, name, credit_balance').eq('id', organizationId).single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!organizationId,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['org-credit-transactions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions').select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: isOpen && !!organizationId,
  });

  const { data: allPricing = [], isLoading: pricingLoading } = useQuery({
    queryKey: ['verification-pricing-all', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_pricing').select('*')
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .order('verification_type', { ascending: true });
      if (error) throw error;
      return data as PricingRow[];
    },
    enabled: isOpen && !!organizationId,
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const { verificationPricing, enrichmentPricing, contactoutPricing } = useMemo(() => {
    const verification: PricingRow[] = [];
    const enrichment:   PricingRow[] = [];
    const contactout:   PricingRow[] = [];

    allPricing.forEach(row => {
      if (row.source === 'contactout') contactout.push(row);
      else if (row.source === 'apollo') enrichment.push(row);
      else verification.push(row);
    });

    return { verificationPricing: verification, enrichmentPricing: enrichment, contactoutPricing: contactout };
  }, [allPricing]);

  const getEffectivePricing = (rows: PricingRow[]) => {
    const map = new Map<string, { global: PricingRow | null; override: PricingRow | null }>();
    rows.forEach(row => {
      const key = `${row.verification_type}__${row.source}`;
      if (!map.has(key)) map.set(key, { global: null, override: null });
      const entry = map.get(key)!;
      if (row.organization_id === null) entry.global   = row;
      else                              entry.override = row;
    });
    return map;
  };

  const enrichmentEffective    = useMemo(() => getEffectivePricing(enrichmentPricing),    [enrichmentPricing]);
  const verificationEffective  = useMemo(() => getEffectivePricing(verificationPricing),  [verificationPricing]);
  const contactoutEffective    = useMemo(() => getEffectivePricing(contactoutPricing),    [contactoutPricing]);

  // Active billing mode for ContactOut search
  const activeBillingMode = useMemo<"per_page" | "per_result">(() => {
    const entry = contactoutEffective.get("co_search_billing_mode__contactout");
    const row   = entry?.override ?? entry?.global;
    return (row?.billing_mode as "per_page" | "per_result") ?? "per_page";
  }, [contactoutEffective]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const creditMutation = useMutation({
    mutationFn: async ({ amount, description, type }: { amount: number; description: string; type: 'add' | 'deduct' }) => {
      const signedAmount   = type === 'add' ? Math.abs(amount) : -Math.abs(amount);
      const currentBalance = Number(orgData?.credit_balance) || 0;
      const newBalance     = currentBalance + signedAmount;
      if (newBalance < 0) throw new Error('Cannot deduct more than current balance');
      const { error: updateErr } = await supabase.from('hr_organizations').update({ credit_balance: newBalance }).eq('id', organizationId);
      if (updateErr) throw updateErr;
      const { error: txErr } = await supabase.from('credit_transactions').insert({
        organization_id: organizationId, amount: signedAmount,
        transaction_type: type === 'add' ? 'credit_addition' : 'credit_deduction',
        description: description || `Manual ${type} by admin`,
        balance_after: newBalance, created_by: user?.id,
      });
      if (txErr) throw txErr;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Credits Updated', description: `Successfully ${vars.type === 'add' ? 'added' : 'deducted'} ${vars.amount} credits.` });
      setCreditAmount(''); setCreditDescription('');
      queryClient.invalidateQueries({ queryKey: ['org-credit-balance', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-credit-transactions', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationDashboardDetails', organizationId] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed', description: err.message }),
  });

  const pricingMutation = useMutation({
    mutationFn: async ({ id, price, price_not_found }: { id: string; price: number; price_not_found: number }) => {
      const { error } = await supabase.from('verification_pricing')
        .update({ price, price_not_found, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Pricing Updated' }); queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] }); },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Update Failed', description: err.message }),
  });

  const createOverrideMutation = useMutation({
    mutationFn: async ({ verification_type, source, price, price_not_found, billing_mode }: {
      verification_type: string; source: string; price: number; price_not_found: number; billing_mode?: string;
    }) => {
      const { error } = await supabase.from('verification_pricing').insert({
        id: crypto.randomUUID(), verification_type, source,
        organization_id: organizationId, price, price_not_found,
        billing_mode: billing_mode ?? 'per_page',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Override Created', description: 'Org-specific pricing set.' }); queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] }); },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed', description: err.message }),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('verification_pricing').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Override Removed', description: 'Reverted to global default.' }); queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] }); },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed', description: err.message }),
  });

  // Billing mode update mutation
  const billingModeMutation = useMutation({
    mutationFn: async (mode: "per_page" | "per_result") => {
      const entry       = contactoutEffective.get("co_search_billing_mode__contactout");
      const overrideRow = entry?.override;

      if (overrideRow) {
        // Update existing org override
        const { error } = await supabase.from('verification_pricing')
          .update({ billing_mode: mode, updated_at: new Date().toISOString() })
          .eq('id', overrideRow.id);
        if (error) throw error;
      } else {
        // Create org override
        const { error } = await supabase.from('verification_pricing').insert({
          id: crypto.randomUUID(),
          verification_type: 'co_search_billing_mode',
          source: 'contactout',
          organization_id: organizationId,
          price: 0, price_not_found: 0,
          billing_mode: mode,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, mode) => {
      toast({ title: 'Billing Mode Updated', description: `Search now billed ${mode === 'per_page' ? 'per page' : 'per result'}.` });
      queryClient.invalidateQueries({ queryKey: ['verification-pricing-all', organizationId] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed', description: err.message }),
  });

  const mutationProps = { pricingMutation, createOverrideMutation, deleteOverrideMutation, organizationId };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[720px] max-h-[85vh] overflow-hidden p-0">
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
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg h-auto">
              <TabsTrigger value="balance" className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5">
                <Wallet size={13} />Balance
              </TabsTrigger>
              <TabsTrigger value="verification" className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5">
                <Shield size={13} />Verification
              </TabsTrigger>
              <TabsTrigger value="enrichment" className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5">
                <Sparkles size={13} />Enrichment
              </TabsTrigger>
              <TabsTrigger value="contactout" className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md flex items-center gap-1.5">
                <Users size={13} />ContactOut
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-160px)] px-6 pb-6">

            {/* ── TAB 1: CREDIT BALANCE ──────────────────────────────────── */}
            <TabsContent value="balance" className="mt-4 space-y-4">
              <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</p>
                      {orgLoading ? <Skeleton className="h-10 w-32 mt-1" /> : (
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

              <Card className="border-gray-200">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Adjust Credits</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Amount</Label>
                    <Input type="number" min="0" step="0.01" placeholder="Enter amount..."
                      value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Description (optional)</Label>
                    <Input placeholder="Reason for adjustment..." value={creditDescription}
                      onChange={e => setCreditDescription(e.target.value)} className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={!creditAmount || parseFloat(creditAmount) <= 0 || creditMutation.isPending}
                      onClick={() => creditMutation.mutate({ amount: parseFloat(creditAmount), description: creditDescription, type: 'add' })}>
                      {creditMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ArrowUpRight size={14} className="mr-2" />}
                      Add Credits
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={!creditAmount || parseFloat(creditAmount) <= 0 || creditMutation.isPending}
                      onClick={() => creditMutation.mutate({ amount: parseFloat(creditAmount), description: creditDescription, type: 'deduct' })}>
                      {creditMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ArrowDownRight size={14} className="mr-2" />}
                      Deduct
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                  <CardDescription className="text-xs">Last 20 credit operations</CardDescription>
                </CardHeader>
                <CardContent>
                  {txLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-6">No transactions yet</p>
                  ) : (
                    <div className="space-y-1 max-h-[240px] overflow-y-auto">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-gray-800 truncate">{tx.description || tx.transaction_type}</p>
                              {tx.verification_type && (
                                <Badge variant="outline" className="text-[9px] font-normal">{tx.verification_type}</Badge>
                              )}
                              {tx.source === 'contactout' && (
                                <Badge className="text-[9px] bg-violet-50 text-violet-600 border-violet-200">ContactOut</Badge>
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
                            <p className="text-[10px] text-gray-400">Bal: {formatCurrency(tx.balance_after)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 2: VERIFICATION PRICING ───────────────────────────── */}
            <TabsContent value="verification" className="mt-4 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">Set org-specific pricing to override global defaults. Remove an override to revert to the global price.</p>
              </div>
              {pricingLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
              ) : (
                Array.from(verificationEffective.entries()).map(([key, { global: globalRow, override: overrideRow }]) => {
                  const [type, source] = key.split('__');
                  const config = VERIFICATION_TYPE_CONFIG[type] || {
                    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    description: `${source} verification`,
                  };
                  return <PricingCard key={key} typeKey={type} source={source} config={config} globalRow={globalRow} overrideRow={overrideRow} {...mutationProps} />;
                })
              )}
              {!pricingLoading && verificationEffective.size === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No verification pricing configured</p>
              )}
            </TabsContent>

            {/* ── TAB 3: ENRICHMENT PRICING (APOLLO) ───────────────────── */}
            <TabsContent value="enrichment" className="mt-4 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-100">
                <Sparkles size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-purple-700 font-medium">Apollo.io Enrichment Credits</p>
                  <p className="text-xs text-purple-600 mt-0.5">Credits are deducted when contacts or companies are enriched. Set org-specific overrides below, or leave defaults.</p>
                </div>
              </div>
              {pricingLoading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
              ) : (
                Object.entries(ENRICHMENT_TYPE_CONFIG).map(([typeKey, config]) => {
                  const key   = `${typeKey}__apollo`;
                  const entry = enrichmentEffective.get(key);
                  return <PricingCard key={key} typeKey={typeKey} source="apollo" config={config} globalRow={entry?.global || null} overrideRow={entry?.override || null} {...mutationProps} />;
                })
              )}
              {!pricingLoading && (
                <Card className="border-gray-200 mt-4">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase">Effective Rates Summary</CardTitle></CardHeader>
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
                          const key        = `${typeKey}__apollo`;
                          const entry      = enrichmentEffective.get(key);
                          const effective  = entry?.override || entry?.global;
                          const isOverride = !!entry?.override;
                          return (
                            <tr key={typeKey} className="border-b border-gray-50">
                              <td className="py-2 font-medium text-gray-700">{config.label}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">{effective ? formatCurrency(effective.price) : '—'}</td>
                              <td className="py-2 text-right text-gray-500">{effective ? formatCurrency(effective.price_not_found) : '—'}</td>
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

            {/* ── TAB 4: CONTACTOUT PRICING ─────────────────────────────── */}
            <TabsContent value="contactout" className="mt-4 space-y-4">

              {/* Header info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-100">
                <Users size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-violet-700 font-medium">ContactOut Credits</p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Credits are deducted for people searches and contact reveals. Cache hits are always free.
                    Set org-specific overrides to differ from global defaults.
                  </p>
                </div>
              </div>

              {/* ── Section 1: Search Billing Mode ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileSearch size={14} className="text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-800">Search Billing Mode</h3>
                </div>

                {pricingLoading ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <Card className="border-gray-200 bg-white">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-4">
                        Choose how search credits are deducted. This applies to every ContactOut people search performed by this organization.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Per Page option */}
                        <button
                          onClick={() => activeBillingMode !== 'per_page' && billingModeMutation.mutate('per_page')}
                          disabled={billingModeMutation.isPending}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                            activeBillingMode === 'per_page'
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                          }`}
                        >
                          {activeBillingMode === 'per_page' && (
                            <CheckCircle2 size={14} className="absolute top-3 right-3 text-violet-600" />
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-violet-100">
                              <Layers size={12} className="text-violet-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">Per Page</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                            1 credit per search page (10 results). Predictable cost regardless of results returned.
                          </p>
                          {(() => {
                            const entry    = contactoutEffective.get("co_search_per_page__contactout");
                            const effective = entry?.override ?? entry?.global;
                            return effective ? (
                              <p className="mt-2 text-sm font-bold text-violet-700">{formatCurrency(effective.price)} <span className="text-[10px] font-normal text-gray-400">/ page</span></p>
                            ) : null;
                          })()}
                        </button>

                        {/* Per Result option */}
                        <button
                          onClick={() => activeBillingMode !== 'per_result' && billingModeMutation.mutate('per_result')}
                          disabled={billingModeMutation.isPending}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                            activeBillingMode === 'per_result'
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                          }`}
                        >
                          {activeBillingMode === 'per_result' && (
                            <CheckCircle2 size={14} className="absolute top-3 right-3 text-violet-600" />
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-violet-100">
                              <Users size={12} className="text-violet-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">Per Result</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                            X credits per profile returned. Only pay for what you get — ideal for filtered searches.
                          </p>
                          {(() => {
                            const entry    = contactoutEffective.get("co_search_per_result__contactout");
                            const effective = entry?.override ?? entry?.global;
                            return effective ? (
                              <p className="mt-2 text-sm font-bold text-violet-700">{formatCurrency(effective.price)} <span className="text-[10px] font-normal text-gray-400">/ result</span></p>
                            ) : null;
                          })()}
                        </button>
                      </div>

                      {billingModeMutation.isPending && (
                        <div className="flex items-center gap-2 mt-3">
                          <Loader2 size={12} className="animate-spin text-violet-500" />
                          <span className="text-xs text-violet-600">Updating billing mode…</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ── Section 2: Search Pricing Cards ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Search size={14} className="text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-800">Search Pricing</h3>
                  <span className="text-[10px] text-gray-400">— set per-org overrides for each mode</span>
                </div>

                <div className="space-y-3">
                  {/* Per page pricing card */}
                  {(() => {
                    const key   = "co_search_per_page__contactout";
                    const entry = contactoutEffective.get(key);
                    const isActiveMode = activeBillingMode === 'per_page';
                    return (
                      <div className={`relative transition-opacity ${!isActiveMode ? 'opacity-50' : ''}`}>
                        {!isActiveMode && (
                          <div className="absolute top-3 right-3 z-10">
                            <Badge variant="outline" className="text-[9px] text-gray-400">Inactive Mode</Badge>
                          </div>
                        )}
                        <PricingCard
                          typeKey="co_search_per_page"
                          source="contactout"
                          config={{
                            label:       'Search — Per Page',
                            icon:        <Layers size={14} />,
                            description: `Charged once per search call (10 results / page). ${isActiveMode ? '✓ Currently active.' : ''}`,
                            color:       'text-violet-600 bg-violet-50',
                          }}
                          globalRow={entry?.global   || null}
                          overrideRow={entry?.override || null}
                          {...mutationProps}
                        />
                      </div>
                    );
                  })()}

                  {/* Per result pricing card */}
                  {(() => {
                    const key   = "co_search_per_result__contactout";
                    const entry = contactoutEffective.get(key);
                    const isActiveMode = activeBillingMode === 'per_result';
                    return (
                      <div className={`relative transition-opacity ${!isActiveMode ? 'opacity-50' : ''}`}>
                        {!isActiveMode && (
                          <div className="absolute top-3 right-3 z-10">
                            <Badge variant="outline" className="text-[9px] text-gray-400">Inactive Mode</Badge>
                          </div>
                        )}
                        <PricingCard
                          typeKey="co_search_per_result"
                          source="contactout"
                          config={{
                            label:       'Search — Per Result',
                            icon:        <Users size={14} />,
                            description: `Charged per individual profile returned. ${isActiveMode ? '✓ Currently active.' : ''}`,
                            color:       'text-violet-600 bg-violet-50',
                          }}
                          globalRow={entry?.global   || null}
                          overrideRow={entry?.override || null}
                          {...mutationProps}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── Section 3: Enrichment / Reveal Pricing ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail size={14} className="text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-800">Contact Reveal Pricing</h3>
                  <span className="text-[10px] text-gray-400">— charged when user clicks Email / Phone reveal</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 mb-3">
                  <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Cache hits are always <strong>free (₹0.00)</strong>. Credits are only charged on live API calls.
                    The "Not Found" price applies when ContactOut returns no data for the profile.
                  </p>
                </div>

                {pricingLoading ? (
                  <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(CO_ENRICH_CONFIG).map(([typeKey, config]) => {
                      const key   = `${typeKey}__contactout`;
                      const entry = contactoutEffective.get(key);
                      return (
                        <PricingCard
                          key={key}
                          typeKey={typeKey}
                          source="contactout"
                          config={config}
                          globalRow={entry?.global   || null}
                          overrideRow={entry?.override || null}
                          {...mutationProps}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Section 4: Summary table ── */}
              {!pricingLoading && (
                <Card className="border-gray-200">
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
                          <th className="text-right py-2 font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "co_search_per_page__contactout",   label: "Search / Page",    active: activeBillingMode === 'per_page'   },
                          { key: "co_search_per_result__contactout", label: "Search / Result",  active: activeBillingMode === 'per_result' },
                          { key: "co_email_reveal__contactout",      label: "Email Reveal",     active: true },
                          { key: "co_phone_reveal__contactout",      label: "Phone Reveal",     active: true },
                        ].map(({ key, label, active }) => {
                          const entry      = contactoutEffective.get(key);
                          const effective  = entry?.override || entry?.global;
                          const isOverride = !!entry?.override;
                          return (
                            <tr key={key} className={`border-b border-gray-50 ${!active ? 'opacity-40' : ''}`}>
                              <td className="py-2 font-medium text-gray-700 flex items-center gap-1.5">
                                {label}
                                {!active && <span className="text-[9px] text-gray-400">(inactive)</span>}
                              </td>
                              <td className="py-2 text-right font-semibold text-gray-900">{effective ? formatCurrency(effective.price) : '—'}</td>
                              <td className="py-2 text-right text-gray-500">{effective ? formatCurrency(effective.price_not_found) : '—'}</td>
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