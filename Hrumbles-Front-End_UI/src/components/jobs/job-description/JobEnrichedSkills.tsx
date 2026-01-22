import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, BookOpen, Layers, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
        <tr className="bg-white/50 border-b border-purple-100">
          <th className="w-1/3 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
          <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skills</th>
        </tr>
      </thead>
      <tbody>
        {tableEntries.map(([category, items]) => (
          <tr key={category} className="border-b border-purple-50/50 hover:bg-white/40 transition-colors">
            <td className="px-3 py-3 align-top border-r border-purple-50 bg-purple-50/30">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                {/* <Layers className="w-3 h-3 text-purple-500" /> */}
                {category}
              </div>
            </td>
            <td className="px-3 py-3 overflow-visible">
              <div className="flex flex-wrap gap-2 overflow-visible">
                {items.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <Badge 
                      variant="secondary" 
                      className="bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-100 font-semibold text-[11px] px-2.5 py-1 whitespace-nowrap hover:shadow-md transition-all cursor-help flex items-center gap-1.5 shadow-sm"
                    >
                      {item.enrichedName}
                      <Info className="w-3 h-3 opacity-40" />
                    </Badge>

                    {/* ABSOLUTE HOVER POPUP */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-0 rounded-xl bg-slate-900 text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none border border-slate-700 overflow-hidden">
                      <div className="bg-white/10 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Skill Description</span>
                        <BookOpen className="w-3 h-3 opacity-50" />
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-white mb-1 text-sm">{item.rawName}</p>
                        <p className="text-slate-300 leading-relaxed text-[11px] mb-3">{item.description}</p>
                        {item.relatedSkills.length > 0 && (
                          <div className="pt-3 border-t border-white/10">
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Related Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {item.relatedSkills.slice(0, 3).map((rs, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-white/5 border-white/10 text-slate-300">
                                  {rs}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-slate-900"></div>
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

  if (isLoading) return <div className="h-48 w-full animate-pulse bg-slate-50 rounded-2xl mt-4" />;
  if (!skills.length) return null;

  const totalSkills = skills.length;
  const half = Math.ceil(groupedCategories.length / 2);
  const firstHalf = groupedCategories.slice(0, half);
  const secondHalf = groupedCategories.slice(half);

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 backdrop-blur-sm rounded-2xl overflow-visible">
      <CardContent className="p-0 overflow-visible">
        {/* Header Style from previous code */}
        <div className="p-4 border-b border-purple-100/50 bg-gradient-to-r from-purple-600/5 to-blue-600/5 flex items-center gap-2 text-purple-700">
          <div className="p-1.5 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Required Skills</span>
        </div>

        {/* Content Body with logic for splitting */}
        <div className="p-0 overflow-visible">
          {totalSkills <= 5 ? (
            <div className="overflow-visible">{renderTable(groupedCategories)}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-purple-100 overflow-visible">
              <div className="overflow-visible">{renderTable(firstHalf)}</div>
              <div className="overflow-visible">{renderTable(secondHalf)}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobEnrichedSkills;
// overflow-x issue