// Hrumbles-Front-End_UI\src\components\jobs\job-description\JobEnrichedSkills.tsx
// Compact redesign — no outer Card wrapper, violet/indigo theme, smaller fonts/padding.
// All logic preserved: enrichment RPC, grouping, split at >5, hover tooltip.
// overflow-x issue

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, BookOpen, Info } from "lucide-react";

interface JobEnrichedSkillsProps {
  skills: string[];
}

const JobEnrichedSkills: React.FC<JobEnrichedSkillsProps> = ({ skills }) => {
  const { data: enrichedData, isLoading } = useQuery({
    queryKey: ["job-skills-enrichment-table", skills],
    queryFn: async () => {
      if (!skills || skills.length === 0) return [];
      const { data, error } = await supabase.rpc("get_job_enriched_skills", {
        p_skill_names: skills,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!skills && skills.length > 0,
  });

  const groupedCategories = useMemo(() => {
    if (!skills) return [];
    const enrichedMap = new Map(
      enrichedData?.map((item: any) => [item.skill_name.toLowerCase().trim(), item]) || []
    );

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

  const renderTable = (tableEntries: typeof groupedCategories) => (
    <table className="w-full text-xs border-collapse overflow-visible">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="w-[130px] px-2.5 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left bg-gray-50/60">
            Category
          </th>
          <th className="px-2.5 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-left bg-gray-50/60">
            Skills
          </th>
        </tr>
      </thead>
      <tbody>
        {tableEntries.map(([category, items]) => (
          <tr
            key={category}
            className="border-b border-gray-50 hover:bg-violet-50/20 transition-colors duration-150"
          >
            <td className="px-2.5 py-2 align-top border-r border-gray-100 w-[130px] bg-gray-50/20">
              <span className="text-[10px] font-medium text-gray-500">{category}</span>
            </td>
            <td className="px-2.5 py-2 overflow-visible">
              <div className="flex flex-wrap gap-1.5 overflow-visible">
                {items.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Skill badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 font-semibold cursor-help whitespace-nowrap hover:bg-violet-100 hover:border-violet-200 transition-colors duration-150">
                      {item.enrichedName}
                      <Info className="w-2.5 h-2.5 opacity-35" />
                    </span>

                    {/* Hover tooltip — logic unchanged */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-gray-900 text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none border border-gray-700 overflow-hidden">
                      <div className="bg-white/10 px-3 py-1.5 border-b border-white/10 flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300">
                          Skill info
                        </span>
                        <BookOpen className="w-3 h-3 opacity-40" />
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-white mb-1 text-[11px]">{item.rawName}</p>
                        <p className="text-gray-300 leading-relaxed text-[10px] mb-2">
                          {item.description}
                        </p>
                        {item.relatedSkills.length > 0 && (
                          <div className="pt-2 border-t border-white/10">
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-1.5">
                              Related
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {item.relatedSkills.slice(0, 3).map((rs, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] px-1.5 py-0 bg-white/5 border border-white/10 text-gray-300 rounded"
                                >
                                  {rs}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (isLoading) return (
    <div className="space-y-1.5">
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
      <div className="h-16 w-full bg-gray-50 rounded-lg animate-pulse" />
    </div>
  );
  if (!skills.length) return null;

  const totalSkills = skills.length;
  const half = Math.ceil(groupedCategories.length / 2);
  const firstHalf = groupedCategories.slice(0, half);
  const secondHalf = groupedCategories.slice(half);

  return (
    <div className="overflow-visible">
      {/* Section label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-violet-400" />
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Required skills
        </p>
      </div>

      {/* Table with thin border */}
      <div className="rounded-lg border border-gray-200/60 overflow-visible">
        {totalSkills <= 5 ? (
          <div className="overflow-visible">{renderTable(groupedCategories)}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100 overflow-visible">
            <div className="overflow-visible">{renderTable(firstHalf)}</div>
            <div className="overflow-visible">{renderTable(secondHalf)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobEnrichedSkills;