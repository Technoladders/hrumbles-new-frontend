import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client"; // Ensure this path is correct
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Company {
  cin: string;
  company_name: string;
  roc: string;
  registered_address?: string;
  state?: string;
  // Add any other fields you might need for pre-filling
}

interface SelectCompanyStepProps {
  onCompanySelect: (company: Company) => void;
  onManualEntry: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const SelectCompanyStep = ({ onCompanySelect, onManualEntry }: SelectCompanyStepProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // NEW: Debounced search function to fetch live data from Supabase
  const searchCompanies = useCallback(async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_master_data")
        .select("cin, company_name, roc, registered_address, state")
        .ilike("company_name", `%${query}%`) // ilike for case-insensitive search
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      toast.error("Failed to search companies:", error.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // NEW: useEffect to trigger the debounced search
  useEffect(() => {
    // Don't show results for a single character to avoid excessive queries
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    const handler = setTimeout(() => {
      searchCompanies(searchQuery);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, searchCompanies]);

  const handleSelect = (company: Company) => {
    setSearchQuery(company.company_name);
    setSelectedCompany(company);
    setResults([]); // Hide dropdown after selection
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-6"
    >
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Add a New Client</h2>
        <p className="text-gray-500 mt-1">
          Search our master database or enter client details manually.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="relative space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search for a company by name..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCompany(null); // Reset selection on new search
            }}
          />
           {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
        </div>
        {results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {results.map((company) => (
              <li
                key={company.cin}
                className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleSelect(company)}
              >
                <p className="font-semibold text-gray-800">{company.company_name}</p>
                <p className="text-xs text-gray-500">{company.roc}</p>
              </li>
            ))}
          </motion.ul>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-center">
        <Button
          onClick={() => selectedCompany && onCompanySelect(selectedCompany)}
          disabled={!selectedCompany}
          size="lg"
          className="w-full md:w-auto"
        >
          Next
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or</span></div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-center">
        <Button onClick={onManualEntry} variant="datepicker" size="lg" className="w-full md:w-auto">
          Enter Client Details Manually
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default SelectCompanyStep;