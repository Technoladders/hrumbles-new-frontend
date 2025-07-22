import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFetchCompanyDetails } from '@/hooks/use-companies';
import { Button } from '@/components/ui/button'; // Changed import for consistency
import { Input } from '@/components/ui/input';   // Changed import for consistency
import { Loader2 } from 'lucide-react';           // Changed import for consistency

interface CompanyAddFormProps {
  onAdd: (newCompany: any) => void;
  onCancel: () => void;
}

const CompanyAddForm: React.FC<CompanyAddFormProps> = ({ onAdd, onCancel }) => {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const fetchCompanyDetails = useFetchCompanyDetails();

  const handleFetch = async () => {
    if (!identifier.trim()) {
      setError("Please enter a company name, domain, or LinkedIn URL.");
      return;
    }
    setIsFetching(true);
    setError(null);
    try {
    const fetchedData = await fetchCompanyDetails(identifier);
      onAdd(fetchedData);
    } catch (err: any) {
      console.error("Error fetching company details:", err);
      setError(`Failed to fetch company details: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
   <div className="space-y-4 pt-2">
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div>
        {/* Updated Label */}
        <label htmlFor="company-identifier" className="block text-sm font-medium text-foreground mb-1">
          Company Name, Domain, or LinkedIn URL *
        </label>
        <Input
          id="company-identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-1 block w-full"
          placeholder="e.g., Acme Inc, acme.com, or linkedin.com/company/acme"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleFetch}
          disabled={isFetching || !identifier.trim()}
        >
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isFetching ? "Fetching..." : "Fetch Company Data"}
        </Button>
      </div>
    </div>
  );
};

export default CompanyAddForm;