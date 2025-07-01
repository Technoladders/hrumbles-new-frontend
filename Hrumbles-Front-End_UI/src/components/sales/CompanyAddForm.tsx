import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFetchCompanyDetails } from '@/hooks/use-companies';

interface CompanyAddFormProps {
  onAdd: (newCompany: any) => void;
  onCancel: () => void;
}

const CompanyAddForm: React.FC<CompanyAddFormProps> = ({ onAdd, onCancel }) => {
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const fetchCompanyDetails = useFetchCompanyDetails();

  const handleFetch = async () => {
    if (!companyName.trim()) {
      setError("Please enter a company name.");
      return;
    }
    setIsFetching(true);
    setError(null);
    try {
      const fetchedData = await fetchCompanyDetails(companyName);
      onAdd(fetchedData);
    } catch (err: any) {
      console.error("Error fetching company details:", err);
      setError(`Failed to fetch company details: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white shadow rounded">
      {error && <div className="text-red-500">{error}</div>}
      <div>
        <label className="block text-sm font-medium">Company Name *</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mt-1 block w-full border rounded p-2"
          placeholder="Enter company name"
        />
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={handleFetch}
          disabled={isFetching}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isFetching ? "Fetching..." : "Fetch Company Data"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CompanyAddForm;