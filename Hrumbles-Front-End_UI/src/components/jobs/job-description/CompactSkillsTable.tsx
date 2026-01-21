// New Component: Hrumbles-Front-End_UI\src\components\jobs\job-description\CompactSkillsTable.tsx
// Right-side: Ultra-compact table with reduced fonts (text-xs). Descriptions in hover Popover.
// Full height with internal scroll. Framer Motion for row hovers and entrance.

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface JobEnrichedSkillsProps {
  skills: string[];
}

const CompactSkillsTable: React.FC<JobEnrichedSkillsProps> = ({ skills }) => {
  const { data: enrichedData, isLoading } = useQuery({
    queryKey: ["job-skills-enrichment-table", skills],
    queryFn: async () => {
      if (!skills || skills.length === 0) return [];
      const { data, error } = await supabase.rpc("get_job_enriched_skills", { p_skill_names: skills });
      if (error) throw error;
      return data;
    },
    enabled: !!skills && skills.length > 0,
  });

  const groupedData = useMemo(() => {
    if (!skills) return [];

    const enrichedMap = new Map(enrichedData?.map((item: any) => [item.skill_name.toLowerCase().trim(), item]) || []);
    const flatList = skills.map((skill) => {
      const info = enrichedMap.get(skill.toLowerCase().trim());
      return {
        rawName: skill,
        category: info?.category || "Other/General",
        enrichedName: info?.normalized_name || skill,
        description: info?.description || "Professional proficiency required.",
        relatedSkills: info?.related_skills || [],
      };
    });

    const groups: Record<string, typeof flatList> = {};
    flatList.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [enrichedData, skills]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-96 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!skills.length) return <div className="h-full flex items-center justify-center text-gray-500">No skills to display</div>;

  return (
    <Card className="h-full shadow-lg">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-purple-700"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Skills Matrix</span>
          </motion.div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b z-10">
              <tr>
                <th className="px-2 py-2 font-bold text-slate-600 uppercase tracking-wider w-20">Cat.</th>
                <th className="px-2 py-2 font-bold text-slate-600 uppercase tracking-wider">Raw Skill</th>
                <th className="px-2 py-2 font-bold text-slate-600 uppercase tracking-wider">Enriched</th>
                <th className="px-2 py-2 font-bold text-slate-600 uppercase tracking-wider w-32">Related</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {groupedData.map(([category, items], catIndex) =>
                  items.map((item, index) => (
                    <motion.tr
                      key={`${category}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (catIndex + index) * 0.05 }}
                      whileHover={{ backgroundColor: "#f8fafc" }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {index === 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <td rowSpan={items.length} className="px-2 py-2 align-top border-r bg-slate-50/50">
                              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-purple-500" />
                                <span className="font-bold text-slate-800 whitespace-nowrap">{category.slice(0, 8)}...</span>
                              </motion.div>
                            </td>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2 text-xs">
                            <div className="font-medium">{category}</div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <td className="px-2 py-2 font-medium text-slate-700 max-w-[120px] truncate">{item.rawName}</td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 whitespace-nowrap">
                          {item.enrichedName}
                        </Badge>
                      </td>
                      <Popover>
                        <PopoverTrigger asChild>
                          <td className="px-2 py-2">
                            <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-1 cursor-pointer">
                              <Info className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-slate-500">Details</span>
                            </motion.div>
                          </td>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 text-xs max-w-xs">
                          <div className="font-medium mb-1">Description</div>
                          <p className="text-slate-600">{item.description}</p>
                          <div className="mt-2 font-medium">Related Skills</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.relatedSkills.slice(0, 4).map((rs, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1 py-0.5">
                                {rs}
                              </Badge>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactSkillsTable;