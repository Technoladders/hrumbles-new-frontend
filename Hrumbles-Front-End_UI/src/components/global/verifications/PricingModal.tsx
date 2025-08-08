import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from "@/components/ui/use-toast";
import { DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// --- Type Definitions ---
interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}
interface Organization { id: string; name: string; }

const VERIFICATION_TYPES = {
  'uan-by-mobile-pan': 'UAN by Mobile/PAN',
  'basic-uan-history': 'Basic UAN History',
};
const SOURCES = ['truthscreen', 'gridlines'];

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [defaultPrice, setDefaultPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters to select which pricing to edit
  const [selectedType, setSelectedType] = useState(Object.keys(VERIFICATION_TYPES)[0]);
  const [selectedSource, setSelectedSource] = useState(SOURCES[0]);

  const fetchPricingData = useCallback(async () => {
    if (!isOpen || !selectedType || !selectedSource) return;
    setIsLoading(true);
    setError(null);
    try {
      const [orgData, priceData] = await Promise.all([
        supabase.from('hr_organizations').select('id, name').order('name'),
        supabase.from('verification_pricing')
          .select('price, organization_id')
          .eq('verification_type', selectedType)
          .eq('source', selectedSource)
      ]);
      if (orgData.error) throw orgData.error;
      if (priceData.error) throw priceData.error;

      setOrganizations(orgData.data);
      
      const defaultPriceEntry = priceData.data.find(p => p.organization_id === null);
      setDefaultPrice(defaultPriceEntry?.price?.toString() || '');
      
      const orgPrices = priceData.data
        .filter(p => p.organization_id !== null)
        .reduce((acc, p) => {
          acc[p.organization_id!] = p.price.toString();
          return acc;
        }, {} as Record<string, string>);
      setPrices(orgPrices);

    } catch (err: any) {
      setError(err.message || 'Failed to load pricing data.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, selectedType, selectedSource]);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  const handleSave = async () => {
    setIsSaving(true);
    const upsertData: any[] = [];
    if (defaultPrice) {
      upsertData.push({ verification_type: selectedType, source: selectedSource, organization_id: null, price: parseFloat(defaultPrice) });
    }
    for (const orgId in prices) {
      if (prices[orgId]) {
        upsertData.push({ verification_type: selectedType, source: selectedSource, organization_id: orgId, price: parseFloat(prices[orgId]) });
      }
    }
    
    try {
      const { error } = await supabase.from('verification_pricing').upsert(upsertData, { onConflict: 'verification_type, source, organization_id' });
      if (error) throw error;
      toast({ title: "Success", description: "Pricing updated successfully.", variant: "success" });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Verification Pricing</DialogTitle>
          <DialogDescription>Set default and organization-specific prices for each verification type and source.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{Object.entries(VERIFICATION_TYPES).map(([key, title]) => <SelectItem key={key} value={key}>{title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div> : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 mt-4">
             <div className="space-y-2"><label className="font-medium">Default Price</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" /><Input type="number" placeholder="e.g., 5.00" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} className="pl-8"/></div></div>
             <hr/>
             <div className="space-y-3"><h4 className="font-medium">Organization Overrides</h4>{organizations.map(org => (<div key={org.id} className="grid grid-cols-2 gap-4 items-center"><span className="font-medium text-sm">{org.name}</span><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" /><Input type="number" placeholder={`Default (${defaultPrice || '0.00'})`} value={prices[org.id] || ''} onChange={(e) => setPrices(p => ({...p, [org.id]: e.target.value}))} className="pl-8"/></div></div>))}</div>
          </div>
        )}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>{isSaving ? <LoadingSpinner size={20}/> : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;