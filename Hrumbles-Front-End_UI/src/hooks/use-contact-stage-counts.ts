// src/hooks/use-contact-stage-counts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

export interface ContactStageCountItem {
  contact_stage: string | null; // Stage name
  count: number;        // Count for that stage
}

// Define the expected structure of the count object you want to use in your UI
export interface ProcessedContactStageCounts {
  // Define based on the stages you care about, e.g.:
  prospect: number;
  interested: number;
  approaching: number;
  replied: number;
  notInterested: number;
  unResponsive: number;
  // Add other stages as needed
  [key: string]: number; // Allow dynamic stages
}

// Default empty counts, mapping to your ProcessedContactStageCounts keys
const defaultProcessedCounts: ProcessedContactStageCounts = {
    prospect: 0,
    interested: 0,
    approaching: 0,
    replied: 0,
    notInterested: 0,
    unResponsive: 0,
};

// Name of your Supabase RPC function
// IMPORTANT: This RPC function should be updated to query BOTH 'contacts' AND 'candidate_companies' tables
// and return an array of objects like { contact_stage: 'Stage Name', count: 123 }
const RPC_FUNCTION_NAME = 'get_combined_contact_stage_counts'; // Example: new or updated RPC name

export const useContactStageCounts = () => {
  return useQuery<ProcessedContactStageCounts, Error>({
    queryKey: ['combinedContactStageCounts'], // Updated query key
    queryFn: async (): Promise<ProcessedContactStageCounts> => {
      console.log(`Fetching combined contact stage counts via RPC: ${RPC_FUNCTION_NAME}...`);
      
      // The RPC function should do something like:
      // CREATE OR REPLACE FUNCTION get_combined_contact_stage_counts()
      // RETURNS TABLE(contact_stage TEXT, count BIGINT) AS $$
      // BEGIN
      //   RETURN QUERY
      //   SELECT s.stage, COALESCE(SUM(s.c), 0) as count
      //   FROM (
      //     SELECT ct.contact_stage AS stage, COUNT(*) AS c FROM contacts ct GROUP BY ct.contact_stage
      //     UNION ALL
      //     SELECT cc.contact_stage AS stage, COUNT(*) AS c FROM candidate_companies cc GROUP BY cc.contact_stage
      //   ) AS s
      //   WHERE s.stage IS NOT NULL
      //   GROUP BY s.stage;
      // END;
      // $$ LANGUAGE plpgsql;
      const { data: rpcData, error } = await supabase.rpc(RPC_FUNCTION_NAME);

      if (error) {
        console.error(`Error calling RPC function ${RPC_FUNCTION_NAME}:`, error);
        return { ...defaultProcessedCounts }; // Return default on error
      }

      console.log("RPC combined contact stage counts received:", rpcData);

      const processedCounts: ProcessedContactStageCounts = { ...defaultProcessedCounts };

      if (Array.isArray(rpcData)) {
        (rpcData as ContactStageCountItem[]).forEach(item => {
          if (item.contact_stage && typeof item.count === 'number') {
            // Normalize stage name to match keys in ProcessedContactStageCounts
            // e.g., "Not Interested" -> "notInterested"
            const key = item.contact_stage
              .toLowerCase()
              .replace(/\s+(.)/g, (match, group1) => group1.toUpperCase()) // camelCase
              .replace(/\s+/g, ''); // remove any remaining spaces if any

            if (key in processedCounts) {
              processedCounts[key] += item.count;
            } else {
              // Handle stages not predefined in defaultProcessedCounts if necessary
              // For example, add them dynamically:
              processedCounts[key] = item.count;
            }
          }
        });
      } else {
          console.warn(`RPC function ${RPC_FUNCTION_NAME} did not return the expected array format.`);
      }
      
      return processedCounts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};